#!/usr/bin/env python3
"""
One-off safe bulk importer for Coflnet history via local SkyBazaar API.

This script calls:
  - GET  /api/bazaar
  - POST /api/bazaar/{productId}/import-coflnet-history?start=...&end=...

Safety features:
  - conservative pacing with jitter
  - batch cooldowns
  - retry/backoff on 429/5xx/network failures
  - Retry-After support
  - optional X-RateLimit-* header awareness
  - checkpoint/resume via JSONL log + SQLite IsExternalImport check
"""

from __future__ import annotations

import argparse
import json
import random
import sqlite3
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Set, Tuple


@dataclass
class ImportResult:
    ok: bool
    status: Optional[int]
    body: Optional[dict]
    error: Optional[str]
    attempt: int
    headers: Dict[str, str]


def classify_result(result: ImportResult) -> str:
    """Classify outcomes for easier post-run triage."""
    if result.ok:
        body = result.body or {}
        points = body.get("pointsReceived")
        imported = body.get("imported")
        if isinstance(points, int) and points == 0:
            return "empty_history"
        if isinstance(imported, int) and imported == 0:
            return "no_new_rows"
        return "imported_or_deduped"

    if result.status == 429:
        return "rate_limited"
    if result.status == 404:
        return "coflnet_not_found_or_mismatch"
    if result.status is not None and 400 <= result.status < 500:
        return "http_4xx"
    if result.status is not None and result.status >= 500:
        return "http_5xx"
    return "network_or_unknown_error"


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def build_opener(user_agent: str, timeout_s: int) -> Tuple[urllib.request.OpenerDirector, int]:
    opener = urllib.request.build_opener()
    opener.addheaders = [("User-Agent", user_agent), ("Accept", "application/json")]
    return opener, timeout_s


def http_json(
    opener: urllib.request.OpenerDirector,
    timeout_s: int,
    url: str,
    method: str = "GET",
) -> Tuple[dict, int, Dict[str, str]]:
    req = urllib.request.Request(url=url, method=method)
    with opener.open(req, timeout=timeout_s) as resp:
        payload = resp.read().decode("utf-8", errors="replace")
        body = json.loads(payload) if payload else {}
        headers = {k: v for k, v in resp.headers.items()}
        return body, resp.status, headers


def sleep_jitter(seconds: float, jitter_ratio: float = 0.15) -> None:
    if seconds <= 0:
        return
    spread = max(0.0, seconds * jitter_ratio)
    delay = seconds + random.uniform(-spread, spread)
    time.sleep(max(0.0, delay))


def parse_reset_seconds(reset_value: str) -> Optional[int]:
    # Some APIs use unix epoch seconds; others use seconds-until-reset.
    if not reset_value:
        return None
    try:
        raw = int(reset_value.strip())
    except ValueError:
        return None

    now_epoch = int(time.time())
    if raw > now_epoch + 5:
        return max(0, raw - now_epoch)
    return max(0, raw)


def load_processed_from_log(log_path: Path) -> Set[str]:
    processed: Set[str] = set()
    if not log_path.exists():
        return processed
    with log_path.open("r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except json.JSONDecodeError:
                continue
            pid = obj.get("productId")
            if pid and obj.get("ok") is True:
                processed.add(pid)
    return processed


def load_imported_from_db(db_path: Path) -> Set[str]:
    if not db_path.exists():
        return set()
    con = sqlite3.connect(str(db_path))
    cur = con.cursor()
    cur.execute(
        """
        SELECT DISTINCT i.ProductId
        FROM Snapshots s
        JOIN Items i ON i.Id = s.BazaarItemId
        WHERE s.IsExternalImport = 1
        """
    )
    rows = {r[0] for r in cur.fetchall() if r and r[0]}
    con.close()
    return rows


def get_all_product_ids(
    opener: urllib.request.OpenerDirector,
    timeout_s: int,
    api_base: str,
) -> List[str]:
    body, _, _ = http_json(opener, timeout_s, f"{api_base}/api/bazaar", "GET")
    return sorted({row.get("productId") for row in body if row.get("productId")})


def append_log(log_path: Path, payload: dict) -> None:
    with log_path.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(payload, ensure_ascii=True) + "\n")


def import_one(
    opener: urllib.request.OpenerDirector,
    timeout_s: int,
    api_base: str,
    product_id: str,
    start_iso: str,
    end_iso: str,
    max_retries: int,
    base_backoff_s: int,
    max_backoff_s: int,
    respect_rate_headers: bool,
    min_remaining_before_pause: int,
) -> ImportResult:
    query = urllib.parse.urlencode({"start": start_iso, "end": end_iso})
    url = f"{api_base}/api/bazaar/{urllib.parse.quote(product_id)}/import-coflnet-history?{query}"
    backoff = base_backoff_s
    last_headers: Dict[str, str] = {}

    for attempt in range(1, max_retries + 1):
        try:
            body, status, headers = http_json(opener, timeout_s, url, "POST")
            last_headers = headers

            if respect_rate_headers:
                remaining = headers.get("X-RateLimit-Remaining")
                reset = headers.get("X-RateLimit-Reset")
                try:
                    rem = int(remaining) if remaining is not None else None
                except ValueError:
                    rem = None
                if rem is not None and rem <= min_remaining_before_pause and reset:
                    reset_s = parse_reset_seconds(reset)
                    if reset_s and reset_s > 0:
                        print(
                            f"Rate window near empty (remaining={rem}), sleeping {reset_s}s until reset...",
                            flush=True,
                        )
                        time.sleep(reset_s)

            return ImportResult(
                ok=True, status=status, body=body, error=None, attempt=attempt, headers=last_headers
            )
        except urllib.error.HTTPError as ex:
            status = ex.code
            payload = ex.read().decode("utf-8", errors="replace")
            headers = {k: v for k, v in ex.headers.items()} if ex.headers else {}
            last_headers = headers

            if status == 429 or status >= 500:
                retry_after = headers.get("Retry-After")
                wait_s = backoff
                if retry_after:
                    try:
                        wait_s = max(wait_s, int(retry_after))
                    except ValueError:
                        pass
                sleep_jitter(wait_s, jitter_ratio=0.2)
                backoff = min(max_backoff_s, backoff * 2)
                continue

            return ImportResult(
                ok=False,
                status=status,
                body=None,
                error=payload,
                attempt=attempt,
                headers=last_headers,
            )
        except Exception as ex:  # network hiccups / timeouts
            if attempt >= max_retries:
                return ImportResult(
                    ok=False,
                    status=None,
                    body=None,
                    error=str(ex),
                    attempt=attempt,
                    headers=last_headers,
                )
            sleep_jitter(backoff, jitter_ratio=0.2)
            backoff = min(max_backoff_s, backoff * 2)

    return ImportResult(
        ok=False,
        status=None,
        body=None,
        error="max retries exceeded",
        attempt=max_retries,
        headers=last_headers,
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Safe one-off bulk Coflnet importer")
    parser.add_argument("--api-base", default="http://127.0.0.1:5000")
    parser.add_argument("--db-path", default="skybazaar.db")
    parser.add_argument("--start", default="2020-03-12T00:00:00Z")
    parser.add_argument("--end", default="2026-12-31T23:59:59Z")
    parser.add_argument("--timeout-s", type=int, default=180)
    parser.add_argument("--per-item-delay-s", type=float, default=2.0)
    parser.add_argument("--batch-size", type=int, default=20)
    parser.add_argument("--batch-cooldown-s", type=int, default=60)
    parser.add_argument("--max-retries", type=int, default=6)
    parser.add_argument("--base-backoff-s", type=int, default=8)
    parser.add_argument("--max-backoff-s", type=int, default=120)
    parser.add_argument("--max-consecutive-429", type=int, default=5)
    parser.add_argument("--respect-rate-headers", action="store_true")
    parser.add_argument("--min-remaining-before-pause", type=int, default=3)
    parser.add_argument("--max-items", type=int, default=0, help="0 = no cap")
    parser.add_argument("--log-path", default="coflnet-import-log.jsonl")
    parser.add_argument("--fail-log-path", default="coflnet-import-failures.jsonl")
    parser.add_argument("--contact", default="set-your-discord-or-email")
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    log_path = Path(args.log_path).resolve()
    fail_log_path = Path(args.fail_log_path).resolve()
    db_path = Path(args.db_path).resolve()

    user_agent = (
        f"SkyBazaarOneOffImporter/1.0 "
        f"(safe-bulk-import; contact={args.contact}; reason=one-time-backfill)"
    )
    opener, timeout_s = build_opener(user_agent=user_agent, timeout_s=args.timeout_s)

    print(f"[{utc_now_iso()}] Loading products from {args.api_base}/api/bazaar ...", flush=True)
    try:
        all_products = get_all_product_ids(opener, timeout_s, args.api_base.rstrip("/"))
    except Exception as ex:
        print(f"Failed to list products: {ex}", file=sys.stderr)
        return 1

    imported_db = load_imported_from_db(db_path)
    imported_log = load_processed_from_log(log_path)
    already_done = imported_db | imported_log
    pending = [pid for pid in all_products if pid not in already_done]

    if args.max_items > 0:
        pending = pending[: args.max_items]

    print(
        f"Total={len(all_products)} AlreadyDone(db+log)={len(already_done)} Pending={len(pending)}",
        flush=True,
    )
    print(f"Logging to {log_path}", flush=True)
    print(f"Failure log to {fail_log_path}", flush=True)
    print(f"User-Agent: {user_agent}", flush=True)

    if args.dry_run:
        preview = ", ".join(pending[:25])
        print(f"Dry run only. First items: {preview}")
        return 0

    consecutive_429 = 0
    reason_counts: Dict[str, int] = {}
    failed_product_ids: List[str] = []
    for idx, pid in enumerate(pending, start=1):
        result = import_one(
            opener=opener,
            timeout_s=timeout_s,
            api_base=args.api_base.rstrip("/"),
            product_id=pid,
            start_iso=args.start,
            end_iso=args.end,
            max_retries=args.max_retries,
            base_backoff_s=args.base_backoff_s,
            max_backoff_s=args.max_backoff_s,
            respect_rate_headers=args.respect_rate_headers,
            min_remaining_before_pause=args.min_remaining_before_pause,
        )

        reason = classify_result(result)
        reason_counts[reason] = reason_counts.get(reason, 0) + 1

        record = {
            "timestamp": utc_now_iso(),
            "productId": pid,
            "ok": result.ok,
            "status": result.status,
            "attempt": result.attempt,
            "reason": reason,
            "error": result.error,
            "body": result.body,
        }
        append_log(log_path, record)
        if not result.ok:
            append_log(fail_log_path, record)
            failed_product_ids.append(pid)

        if result.ok:
            consecutive_429 = 0
            body = result.body or {}
            print(
                f"[{idx}/{len(pending)}] OK {pid} "
                f"reason={reason} imported={body.get('imported', '?')} "
                f"dup={body.get('skippedDuplicates', '?')} invalid={body.get('skippedInvalid', '?')} "
                f"points={body.get('pointsReceived', '?')}",
                flush=True,
            )
        else:
            if result.status == 429:
                consecutive_429 += 1
            else:
                consecutive_429 = 0
            print(
                f"[{idx}/{len(pending)}] FAIL {pid} reason={reason} status={result.status} error={result.error}",
                flush=True,
            )

            if consecutive_429 >= args.max_consecutive_429:
                print(
                    f"Stopping after {consecutive_429} consecutive 429 responses to protect your IP.",
                    file=sys.stderr,
                )
                return 2

        sleep_jitter(args.per_item_delay_s)
        if idx % args.batch_size == 0:
            print(f"Batch cooldown: sleeping {args.batch_cooldown_s}s ...", flush=True)
            sleep_jitter(float(args.batch_cooldown_s), jitter_ratio=0.1)

    print("Bulk import run completed.")
    if reason_counts:
        print("Outcome summary:")
        for key in sorted(reason_counts):
            print(f"  - {key}: {reason_counts[key]}")
    if failed_product_ids:
        retry_path = Path("coflnet-retry-product-ids.txt").resolve()
        retry_path.write_text("\n".join(failed_product_ids) + "\n", encoding="utf-8")
        print(f"Retry list written to {retry_path} ({len(failed_product_ids)} items).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

