# Phase 1: Follow-up Fix - Context

**Gathered:** 2026-03-28
**Status:** Executed (including Fix 4: double + TimeSpan for delay)

<domain>
## Phase Boundary

Small patch to fix EF relationship batching and remove dead config. No new features.

</domain>

<decisions>
## Implementation Decisions

### Fix 1: EF Relationship Batching
- **D-01:** Use navigation property instead of explicit FK when creating new BazaarItems
- **D-02:** Change `new PriceSnapshot { BazaarItemId = bazaarItem.Id }` to `new PriceSnapshot { BazaarItem = bazaarItem }`
- **D-03:** EF will handle FK ordering correctly when using navigation property

### Fix 2: Remove Dead Config
- **D-04:** Remove `_fetchIntervalSeconds` field from BazaarFetcherService
- **D-05:** Remove `Bazaar:FetchIntervalSeconds` from appsettings.json

### Fix 3: MinDelay Value
- **D-06:** Change default from 10 to 9.5 to match Coflnet
- **D-07:** Update appsettings.json default comment to note approximation

### Fix 4: Fractional seconds (completed 2026-03-28)
- **D-08:** `MinDelayAfterSnapshotSeconds` is read with **`GetValue<double>`** (JSON may use **9.5**).
- **D-09:** Delay is stored as **`TimeSpan`** (`TimeSpan.FromSeconds`) for **`Task.Delay`** and **`Timer`** — no int truncation.

</decisions>

<canonical_refs>
## Canonical References

### Files to Modify
- `Services/BazaarFetcherService.cs` - Fix FK relationship, remove dead config
- `appsettings.json` - Remove FetchIntervalSeconds, update MinDelay default

</canonical_refs>

<code_context>
## Current Issues

1. **Line 167:** `BazaarItemId = bazaarItem.Id` - Id is 0 for new items before SaveChanges
2. **Line 25, 43:** `_fetchIntervalSeconds` loaded but unused
3. **Line 44:** Default is 10, Coflnet uses 9.5

</code_context>

<deferred>
## Deferred Ideas

None

</deferred>

---

*Phase: 01-followup*
*Context gathered: 2026-03-28*
