# Requirements: SkyBazaar

**Defined:** 2025-03-27
**Core Value:** Track Hypixel SkyBlock bazaar prices over time to identify profitable flips.

## v1 Requirements

### Core Data Processing

- [x] **CORE-01**: Service can fetch bazaar data from Hypixel API
- [x] **CORE-02**: Service parses bazaar product data (item name, buy/sell price, quantity)
- [x] **CORE-03**: Service stores bazaar snapshots in database with timestamp
- [x] **CORE-04**: Service runs on configurable schedule (cron-like)
- [x] **CORE-05**: Service handles API rate limits gracefully

### Data Storage

- [x] **STOR-01**: Database schema stores item prices over time
- [x] **STOR-02**: Historical price data is queryable by item
- [x] **STOR-03**: Price history includes buy price, sell price, moving average
- [x] **STOR-04**: Data retention configurable (keep N days)

### API Endpoints

- [ ] **API-01**: GET endpoint returns current bazaar prices
- [ ] **API-02**: GET endpoint returns historical prices for specific item
- [ ] **API-03**: GET endpoint returns price history over time range

### Flip Detection

- [ ] **FLIP-01**: Calculate profit margin between buy and sell price
- [ ] **FLIP-02**: Identify items with best profit margins
- [ ] **FLIP-03**: Show flip recommendations sorted by profit potential

### Frontend

- [ ] **FRNT-01**: Display list of all bazaar items with current prices
- [ ] **FRNT-02**: Show price history chart for selected item
- [ ] **FRNT-03**: Display top flips with profit calculations
- [ ] **FRNT-04**: Filter items by name search

## v2 Requirements

- **NOTF-01**: Alert when flip opportunity detected
- **NOTF-02**: Email notifications for big flips
- **HIST-01**: Export data to CSV
- **HIST-02**: Compare prices across time periods

## Out of Scope

| Feature | Reason |
|---------|--------|
| User accounts | Single user self-hosted |
| Real-time WebSocket | Polling sufficient for v1 |
| Multi-server deployment | Single instance sufficient |
| Integration with Discord bot | Separate project |
| OAuth login | Not needed for local use |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CORE-01 | Phase 1: Setup & Core Data | Complete |
| CORE-02 | Phase 1: Setup & Core Data | Complete |
| CORE-03 | Phase 1: Setup & Core Data | Complete |
| CORE-04 | Phase 1: Setup & Core Data | Complete |
| CORE-05 | Phase 1: Setup & Core Data | Complete |
| STOR-01 | Phase 1: Setup & Core Data | Complete |
| STOR-02 | Phase 1: Setup & Core Data | Complete |
| STOR-03 | Phase 1: Setup & Core Data | Complete |
| STOR-04 | Phase 1: Setup & Core Data | Complete |
| API-01 | Phase 2: API & Flip Analysis | Pending |
| API-02 | Phase 2: API & Flip Analysis | Pending |
| API-03 | Phase 2: API & Flip Analysis | Pending |
| FLIP-01 | Phase 2: API & Flip Analysis | Pending |
| FLIP-02 | Phase 2: API & Flip Analysis | Pending |
| FLIP-03 | Phase 2: API & Flip Analysis | Pending |
| FRNT-01 | Phase 3: Frontend | Pending |
| FRNT-02 | Phase 3: Frontend | Pending |
| FRNT-03 | Phase 3: Frontend | Pending |
| FRNT-04 | Phase 3: Frontend | Pending |

**Coverage:**
- v1 requirements: 19 total
- Mapped to phases: 19
- Unmapped: 0 ✓

---
*Requirements defined: 2025-03-27*
*Last updated: 2025-03-27 after initial definition*
