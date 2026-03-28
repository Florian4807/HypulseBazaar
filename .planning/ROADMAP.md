# SkyBazaar Roadmap

## Project
- **Name:** SkyBazaar
- **Core Value:** Track Hypixel SkyBlock bazaar prices over time to identify profitable flips.
- **Granularity:** standard (derived from config)

## Phases

- [x] **Phase 1: Setup & Core Data** — Fetch, parse, store bazaar data; Coflnet-style poll-until-`LastUpdated`, rich snapshots, optional API key, follow-up hardening (completed 2026-03-28)
- [x] **Phase 2: API & Flip Analysis** - Expose data via API endpoints and calculate flip opportunities (completed 2026-03-28)
- [x] **Phase 3: Frontend** - Display items, price history, and top flips in web UI (completed 2026-03-28)

---

## Phase Details

### Phase 1: Setup & Core Data

**Goal:** Service can fetch, parse, and store bazaar data from the Hypixel API with Coflnet-aligned behavior (poll until snapshot advances, optional API key, rich per-product data).

**Implemented (2026-03-28):** Poll until `LastUpdated` is newer than last stored snapshot; `AddHttpClient` for Hypixel; top-of-book vs `quick_status` when summaries differ; MessagePack blobs for top order levels; `Bazaar:MinDelayAfterSnapshotSeconds` as **double** (default **9.5**) → **`TimeSpan`** for post-save delay and timer; `PriceSnapshot` → `BazaarItem` via **navigation**; dead `FetchIntervalSeconds` removed.

**Depends on:** Nothing (first phase)

**Requirements:** CORE-01, CORE-02, CORE-03, CORE-04, CORE-05, STOR-01, STOR-02, STOR-03, STOR-04

**Success Criteria** (what must be TRUE):

1. Service fetches bazaar data from Hypixel (public API; optional `Hypixel:ApiKey` for reliability)
2. Service parses `product_id`, quick status, buy/sell summaries, and top-of-book prices correctly
3. Service stores each bazaar snapshot in the database with Hypixel’s `lastUpdated` timestamp
4. Service does **not** rely on a long fixed cron: it polls until `LastUpdated` advances, then waits **`MinDelayAfterSnapshotSeconds`** (~9.5s) before the next cycle
5. Service handles API rate limits gracefully (waits, retries, 429 / `Retry-After`)
6. Historical data is queryable by **`product_id`** (display name is derived / secondary)
7. Price history includes buy/sell prices, volumes, rolling-week volume fields, order counts, and serialized top-of-book levels
8. Data retention is configurable (days to keep)

**Plans:** 4/4 plans complete
- [x] 01-01-PLAN.md — Core data pipeline: fetch, parse, store bazaar data
- [x] 01-02-PLAN.md — Revise: poll-until-advance, rich order storage, API key support
- [x] 01-03-PLAN.md — Hardening: 7 specific fixes (HttpClient DI, polling cadence, comments, top-of-book, batch DB, UpdatedAt, MessagePack)
- [x] 01-04-PLAN.md — Follow-up: EF navigation FK, remove dead interval config, fractional delay (`double` + `TimeSpan`)

### Phase 2: API & Flip Analysis

**Goal:** Expose bazaar data via REST API endpoints and calculate profitable flip opportunities

**Depends on:** Phase 1 (data must be stored before querying)

**Requirements:** API-01, API-02, API-03, FLIP-01, FLIP-02, FLIP-03

**Success Criteria** (what must be TRUE):

1. GET /api/bazaar returns current prices for all items
2. GET /api/bazaar/{itemId} returns historical prices for a specific item
3. GET /api/bazaar/{itemId}/history?start={date}&end={date} returns price history within time range
4. Profit margin is calculated correctly (sell price - buy price)
5. API returns items sorted by best profit margins
6. Top flips endpoint returns recommended items with profit potential

**Plans:** 2/2 plans complete
- [x] 02-01-PLAN.md — REST API endpoints for bazaar data
- [x] 02-02-PLAN.md — Flip detection service and endpoints

### Phase 3: Frontend

**Goal:** Display bazaar items, price history charts, and top flips in a web interface

**Depends on:** Phase 2 (API must exist for frontend to consume)

**Requirements:** FRNT-01, FRNT-02, FRNT-03, FRNT-04

**Success Criteria** (what must be TRUE):

1. Frontend displays list of all bazaar items with current buy/sell prices
2. User can select an item and view price history chart over time
3. Frontend displays top flip recommendations with profit calculations
4. User can filter/search items by name

**Plans:** 1/1 plans complete
- [ ] 03-01-PLAN.md — React frontend with dashboard, items list, price charts, flips panel

**UI hint:** yes

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Setup & Core Data | 4/4 | Complete    | 2026-03-28 |
| 2. API & Flip Analysis | 2/2 | Complete    | 2026-03-28 |
| 3. Frontend | 0/1 | Complete    | 2026-03-28 |

---

## Coverage

| Phase | Requirements | Count |
|-------|--------------|-------|
| 1 | CORE-01, CORE-02, CORE-03, CORE-04, CORE-05, STOR-01, STOR-02, STOR-03, STOR-04 | 9 |
| 2 | API-01, API-02, API-03, FLIP-01, FLIP-02, FLIP-03 | 6 |
| 3 | FRNT-01, FRNT-02, FRNT-03, FRNT-04 | 4 |
| **Total** | | **19** |

**Coverage:** 19/19 v1 requirements mapped ✓

---

*Roadmap created: 2025-03-27*
