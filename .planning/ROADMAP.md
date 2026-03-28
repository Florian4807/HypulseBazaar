# SkyBazaar Roadmap

## Project
- **Name:** SkyBazaar
- **Core Value:** Track Hypixel SkyBlock bazaar prices over time to identify profitable flips.
- **Granularity:** standard (derived from config)

## Phases

- [x] **Phase 1: Setup & Core Data** - Fetch, parse, and store bazaar data from Hypixel API (completed 2026-03-28)
- [ ] **Phase 2: API & Flip Analysis** - Expose data via API endpoints and calculate flip opportunities
- [ ] **Phase 3: Frontend** - Display items, price history, and top flips in web UI

---

## Phase Details

### Phase 1: Setup & Core Data

**Goal:** Service can fetch, parse, and store bazaar data from Hypixel API on a configurable schedule

**Depends on:** Nothing (first phase)

**Requirements:** CORE-01, CORE-02, CORE-03, CORE-04, CORE-05, STOR-01, STOR-02, STOR-03, STOR-04

**Success Criteria** (what must be TRUE):

1. Service successfully fetches bazaar data from Hypixel public API without authentication
2. Service parses item names, buy prices, sell prices, and quantities correctly
3. Service stores each bazaar snapshot in database with timestamp
4. Service runs on a configurable schedule (e.g., every 5 minutes)
5. Service handles API rate limits gracefully (waits and retries)
6. Historical price data is queryable from database by item name
7. Price history includes buy price, sell price, and moving average
8. Data retention is configurable (can set number of days to keep)

**Plans:** 1/1 plans complete
- [x] 01-01-PLAN.md — Core data pipeline: fetch, parse, store bazaar data

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

**Plans:** 2/2 plans executed
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

**Plans:** TBD
**UI hint:** yes

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Setup & Core Data | 1/1 | Complete    | 2026-03-28 |
| 2. API & Flip Analysis | 2/2 | Complete    | 2026-03-28 |
| 3. Frontend | 0/1 | Not started | - |

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
