---
phase: 01-setup-core-data
plan: "03"
subsystem: backend
tags: [hardening, polling, http, security]
dependency_graph:
  requires: []
  provides:
    - Polling cadence configurable delay
    - HttpClient factory DI
    - Batch DB writes
    - UpdatedAt tracking
  affects:
    - SkyBazaar.csproj
    - Program.cs
    - Services/BazaarFetcherService.cs
    - Services/HypixelApiService.cs
    - Models/PriceSnapshot.cs
    - appsettings.json
tech_stack:
  added: []
  patterns:
    - AddHttpClient for IHypixelApiService
    - Delay after successful store before next poll
    - Batch SaveChanges at end of loop
    - Top-of-book price from summaries
key_files:
  created: []
  modified:
    - Program.cs
    - Services/BazaarFetcherService.cs
    - Services/HypixelApiService.cs
    - Models/PriceSnapshot.cs
    - appsettings.json
    - SkyBazaar.csproj
decisions:
  - Use AddHttpClient for proper HttpClient lifecycle management
  - Delay ~10s after successful store (configurable) mirrors Coflnet behavior
  - Prefer summary first entry over quick_status for price accuracy
  - Batch DB writes for performance
metrics:
  duration: 2 minutes
  completed_date: "2026-03-27"
---

# Phase 1 Plan 3: Hardening Summary

Apply 7 specific hardening fixes to SkyBazaar backend for production readiness.

## Completed Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Fix HttpClient DI and polling cadence | 18e7649 | Program.cs, Services/BazaarFetcherService.cs, appsettings.json |
| 2 | Fix PriceSnapshot comments and add top-of-book logic | ea27d79 | Models/PriceSnapshot.cs, Services/HypixelApiService.cs |
| 3 | Batch DB writes and set UpdatedAt | 392e35a | Services/BazaarFetcherService.cs |
| 4 | Update MessagePack to patched version | ac28ef4 | SkyBazaar.csproj |

## What Was Built

### 1. HttpClient DI Fix (Task 1)
- Changed `AddSingleton` to `AddHttpClient<IHypixelApiService, HypixelApiService>()` in Program.cs
- Properly uses HttpClientFactory for connection pooling and lifecycle management

### 2. Polling Cadence Fix (Task 1)
- Added `MinDelayAfterSnapshotSeconds` config (default 10s)
- Timer now acts as short wake-up (~10s) for cancellation check
- Main throttle is now the delay after successful store, mirroring Coflnet's 9.5s pattern

### 3. PriceSnapshot Comments (Task 2)
- Fixed BuyMovingWeek XML comment: "7-day rolling buy volume" (not price average)
- Fixed SellMovingWeek XML comment: "7-day rolling sell volume" (not price average)

### 4. Top-of-Book Logic (Task 2)
- Added logic to prefer summary first entry when it differs from quick_status
- Mirrors Coflnet's BazaarUpdater behavior for price accuracy

### 5. Batch DB Writes (Task 3)
- Removed per-item SaveChanges in snapshot insert loop
- Single SaveChanges call at end of loop for all items

### 6. UpdatedAt Tracking (Task 3)
- Set UpdatedAt = timestamp when inserting snapshots for existing BazaarItems

### 7. MessagePack Security Update (Task 4)
- Updated MessagePack from 2.5.0 to 2.5.187
- Resolves CVE-2024-48924 (GHSA-4qm4-8hg2-g2xm) DoS vulnerability

## Success Criteria Verification

- [x] Polling uses ~9.5s delay after successful store (configurable), not 300s Timer as main gate
- [x] HypixelApiService registered with AddHttpClient, not AddSingleton
- [x] BuyMovingWeek/SellMovingWeek XML comments correctly describe volume stats
- [x] HypixelApiService uses top-of-book (summary first entry) when it differs from quick_status
- [x] DB writes batch SaveChanges at end, not per-item in loop
- [x] BazaarItem.UpdatedAt set to snapshot timestamp for existing items
- [x] MessagePack updated to version addressing GHSA-4qm4-8hg2-g2xm

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Self-Check

- [x] All files modified exist
- [x] All commits present
- [x] Build succeeds with no errors
- [x] No security vulnerabilities in dependencies

## Self-Check: PASSED
