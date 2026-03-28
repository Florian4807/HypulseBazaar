---
phase: 01-setup-core-data
plan: "02"
subsystem: data-pipeline
tags: [bazaar, polling, cofnet-alignment]
dependency_graph:
  requires:
    - CORE-01
    - CORE-02
    - CORE-03
    - CORE-04
    - CORE-05
    - STOR-01
    - STOR-02
    - STOR-03
    - STOR-04
  provides:
    - Poll-until-advance logic
    - Rich order serialization
    - Optional API key support
  affects:
    - Services/BazaarFetcherService
    - Services/HypixelApiService
    - Models/PriceSnapshot
tech_stack:
  added:
    - MessagePack 2.5.94
  patterns:
    - Poll-until-advance (Coflnet BazaarUpdater behavior)
    - MessagePack serialization for order data
    - Timestamp-based change detection
key_files:
  created: []
  modified:
    - SkyBazaar.csproj
    - Models/PriceSnapshot.cs
    - Models/HypixelBazaarResponse.cs
    - Services/HypixelApiService.cs
    - Services/BazaarFetcherService.cs
    - appsettings.json
decisions:
  - Use poll-until-advance instead of fixed cron interval
  - Only persist when LastUpdated timestamp advances
  - Store top 3 orders per buy/sell side
  - Use MessagePack for efficient order serialization
  - Optional API key via configuration (empty = no key)
metrics:
  duration: "2026-03-28T06:06:05Z to completion"
  completed_date: "2026-03-28"
  tasks: 4
  commits: 4
---

# Phase 1 Plan 2: Coflnet-Aligned Polling & Order Storage

## Summary

Implemented poll-until-advance logic aligned with Coflnet's BazaarUpdater: the service now polls the Hypixel API until the `LastUpdated` timestamp advances, only persisting data when it actually changes. Added rich order serialization using MessagePack to store top order entries for flip detection.

## What Was Built

| Component | Description |
|-----------|-------------|
| **Poll-until-advance** | Implements Coflnet behavior - loops until LastUpdated > lastStored |
| **Order serialization** | Top N orders serialized with MessagePack for efficient storage |
| **Timestamp tracking** | Compares LastUpdated from API with stored timestamps |
| **Optional API key** | Supports Hypixel API key via configuration for higher rate limits |
| **Configuration** | PollWaitMs, MaxPollRetries, OrdersToStore settings |

## Key Changes

### SkyBazaar.csproj
- Added MessagePack package (2.5.94)
- Excluded temp-* directories from build to resolve reference conflicts

### Models/PriceSnapshot.cs
- Added `SerializedBuyOrders` and `SerializedSellOrders` (byte[]) for MessagePack data
- Added helper properties `BuyOrders` and `SellOrders` for deserialization
- Added `Order` model class with MessagePack attributes

### Models/HypixelBazaarResponse.cs
- Added `LastUpdated` (long) to capture API timestamp

### Services/HypixelApiService.cs
- Changed return type to `BazaarApiResult` containing both snapshots and LastUpdated
- Added `SerializedBuyOrders` and `SerializedSellOrders` to `BazaarItemSnapshot`
- Parses top N order entries from BuySummary/SellSummary
- Serializes orders using MessagePack
- Added API key header support via `Hypixel:ApiKey` configuration

### Services/BazaarFetcherService.cs
- Implements `PullAndSaveAsync` - polls until LastUpdated advances or max retries hit
- Only persists when data actually changes
- Timer acts as wake-up trigger, not fixed cron
- Loads last stored timestamp from database
- Stores serialized order data in PriceSnapshot

### appsettings.json
- Added `Hypixel.ApiKey` (optional, empty = no key)
- Added `Bazaar.PollWaitMs` (default 500ms)
- Added `Bazaar.MaxPollRetries` (default 100)
- Added `Bazaar.OrdersToStore` (default 3)

## Verification

- [x] dotnet build succeeds
- [x] PriceSnapshot has SerializedBuyOrders and SerializedSellOrders byte[] fields
- [x] HypixelApiService returns LastUpdated from API
- [x] BazaarFetcherService polls until LastUpdated advances
- [x] Order data is serialized using MessagePack
- [x] appsettings.json has Hypixel:ApiKey field
- [x] API key header is added to requests when configured
- [x] Data continues to be queryable by ProductId
- [x] Old data cleanup continues to work

## Known Stubs

None - all functionality implemented as specified.

## Deviations from Plan

### Auto-Fixed Issues

**1. [Rule 3 - Blocking] Excluded temp-* directories from build**
- **Found during:** Initial build verification
- **Issue:** temp-skybazaar, temp-skyupdater, temp-skycore, temp-hypixelskyblock directories were being compiled, causing massive errors due to missing dependencies
- **Fix:** Added explicit exclusions for all temp-* directories in SkyBazaar.csproj
- **Files modified:** SkyBazaar.csproj
- **Commit:** d7be644

**2. [Rule 1 - Bug] Fixed ambiguous Key attribute reference**
- **Found during:** Build verification after adding MessagePack
- **Issue:** MessagePack.KeyAttribute conflicted with System.ComponentModel.DataAnnotations.KeyAttribute
- **Fix:** Created alias `using MessagePackKey = MessagePack.KeyAttribute` and used it on Order class properties
- **Files modified:** Models/PriceSnapshot.cs
- **Commit:** d7be644

## Auth Gates

None - API key is optional configuration.

---

*Plan executed: 2026-03-28*
