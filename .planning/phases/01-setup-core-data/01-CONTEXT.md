# Phase 1: Setup & Core Data - Context (REVISED)

**Gathered:** 2026-03-28  
**Status:** Implemented in repo (do not treat sections below as a pending checklist unless verifying regressions)

## Current implementation snapshot (2026-03-28)

- **Polling:** `BazaarFetcherService` uses poll-until-`LastUpdated` advances vs last DB snapshot; optional `Hypixel:ApiKey`.
- **Delay:** `Bazaar:MinDelayAfterSnapshotSeconds` is a **double** (default **9.5**), stored as **`TimeSpan`** for the post-save delay and timer period (Coflnet-style cadence, not a 5-minute cron).
- **Storage:** `PriceSnapshot` includes quick-status fields plus MessagePack **SerializedBuyOrders** / **SerializedSellOrders**; new rows use **`BazaarItem` navigation** (no FK=0 batching bug).
- **HTTP:** `Program.cs` registers **`AddHttpClient<IHypixelApiService, HypixelApiService>()`**.

The remainder of this file is retained as design history; downstream work should read the actual sources under `Services/` and `Models/`.

<domain>
## Phase Boundary

Fetch, parse, and store bazaar data from Hypixel API. Revised to align with Coflnet reference implementation.
**BLOCKED:** Phase 3 (Frontend) - blocked until API verification matches Coflnet parity

</domain>

<decisions>
## Implementation Decisions (Revised)

### Polling Strategy
- **D-01:** Poll Hypixel API in a loop until `LastUpdated` timestamp advances (same as BazaarUpdater.PullAndSave)
- **D-02:** Only persist when Hypixel's bazaar `LastUpdated` is newer than last stored snapshot
- **D-03:** Use exponential backoff on errors/429, not just fixed cron interval
- **D-04:** Default ~10 second wait between checks, configurable

### Identity
- **D-05:** Primary key for items is `product_id` (string from API) - already implemented
- **D-06:** Display name is secondary/cache if needed

### Storage (Revised)
- **D-07:** Persist rich snapshot data aligned with QuickStatus + buy/sell order summaries
- **D-08:** Store top order entries: amount, pricePerUnit, orders (per level)
- **D-09:** Reference: temp-skybazaar/Models/StorageQuickStatus.cs for data structure

### Configuration
- **D-10:** Add optional API key support in appsettings.json
- **D-11:** API key from config: `Hypixel:ApiKey` (empty = no key)

### Models to Update
- **D-12:** Update PriceSnapshot to include order summaries (BuyOrders, SellOrders)
- **D-13:** Use MessagePack serialization for order data (like Coflnet)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Coflnet Reference (DO NOT CHANGE - mirror behavior)
- `temp-skyupdater/BazaarUpdater.cs` — Polling logic (PullAndSave method, lines 22-87)
- `temp-skycore/bazaar-models/QuickStatus.cs` — QuickStatus model
- `temp-skycore/bazaar-models/Product.cs` — ProductInfo with BuySummary/SellSummary
- `temp-skycore/bazaar-models/Order.cs` — BuyOrder/SellOrder (amount, pricePerUnit, orders)
- `temp-skybazaar/Models/StorageQuickStatus.cs` — Storage model with serialized orders

### Current Implementation (TO BE UPDATED)
- `Models/PriceSnapshot.cs` — Needs order summary fields added
- `Services/HypixelApiService.cs` — Needs LastUpdated check + order parsing
- `Services/BazaarFetcherService.cs` — Needs updated polling logic
- `appsettings.json` — Add optional API key

</canonical_refs>

\code_context
## Existing Code Insights

### Already Implemented
- BazaarItem entity with ProductId as primary key
- PriceSnapshot with basic QuickStatus fields (buy/sell price, volume, moving week, orders count)
- HypixelApiService with basic HTTP + Polly retry

### Missing (Needs Update)
- LastUpdated timestamp tracking and comparison
- Buy/Sell order summary parsing (top entries)
- Order serialization for storage
- Proper polling loop (not just timer-based)

</code_context>

<specifics>
## Specific Changes Required

1. **HypixelApiService.cs**: Add `LastUpdated` from API response, return it with snapshots
2. **BazaarFetcherService.cs**: Implement poll-until-advance logic:
   - Store last known timestamp
   - Loop calling API until LastUpdated > lastStored
   - Backoff on 429/errors
3. **PriceSnapshot.cs**: Add SerializedBuyOrders, SerializedSellOrders (byte[] for MessagePack)
4. **appsettings.json**: Add `Hypixel:ApiKey` optional field

</specifics>

<deferred>
## Deferred Ideas

None

</deferred>

---

*Phase: 01-setup-core-data*
*Context gathered: 2026-03-28 (revised)*
