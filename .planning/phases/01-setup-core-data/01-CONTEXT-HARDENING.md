# Phase 1: Hardening - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning/execution

<domain>
## Phase Boundary

Apply 7 specific fixes to existing SkyBazaar backend to harden it for production use. No new features.

</domain>

<decisions>
## Implementation Decisions

### Fix 1: Polling Cadence
- **D-01:** Replace 300s Timer as main gate with long-lived loop: delay ~9.5s after successful store before polling again (configurable via `Bazaar:MinDelayAfterSnapshotSeconds`)
- **D-02:** Keep inner poll-until-lastUpdated loop with PollWaitMs/MaxPollRetries
- **D-03:** Timer becomes short "wake up" trigger only (~10s) for cancellation, not 300s throttle

### Fix 2: HttpClient DI
- **D-04:** Change `AddSingleton` to `AddHttpClient<IHypixelApiService, HypixelApiService>()` in Program.cs
- **D-05:** Ensure HttpClient is injected in HypixelApiService constructor

### Fix 3: PriceSnapshot Comments
- **D-06:** Fix BuyMovingWeek/SellMovingWeek XML comments - they are VOLUME stats, NOT price averages

### Fix 4: Top-of-Book Parity (Optional)
- **D-07:** If quick_status diverges from summary, prefer summary first entry (like Coflnet)
- **D-08:** Document rule in code comments

### Fix 5: DB Writes
- **D-09:** Batch SaveChanges - only call SaveChanges once at end of snapshot insert loop
- **D-10:** Skip per-item SaveChanges when inserting new BazaarItems in loop

### Fix 6: BazaarItem.UpdatedAt
- **D-11:** Set UpdatedAt = snapshot timestamp when inserting snapshots for existing items

### Fix 7: MessagePack Bump
- **D-12:** Update MessagePack to patched version addressing GHSA-4qm4-8hg2-g2xm
- **D-13:** Verify build and serialization after update

</decisions>

<canonical_refs>
## Canonical References

### Reference Implementation
- `temp-skyupdater/BazaarUpdater.cs` - delay-after-success (line 104: wait 9.5s after last update)
- `temp-skyupdater/BazaarUpdater.cs` - summary vs quick_status (lines 75-76)

### Files to Modify
- `Program.cs` - Fix HttpClient registration
- `Services/BazaarFetcherService.cs` - Fix polling cadence, DB writes, UpdatedAt
- `Services/HypixelApiService.cs` - Add top-of-book logic
- `Models/PriceSnapshot.cs` - Fix XML comments
- `appsettings.json` - Add MinDelayAfterSnapshotSeconds
- `SkyBazaar.csproj` - Bump MessagePack version

</canonical_refs>

\code_context
## Current Issues Identified

1. **Program.cs line 24:** Uses `AddSingleton` - should use `AddHttpClient`
2. **BazaarFetcherService line 63-64:** Uses 300s interval as main throttle - should delay ~9.5s after success
3. **BazaarFetcherService line 154:** Calls SaveChanges per new item - should batch
4. **PriceSnapshot:** BuyMovingWeek/SellMovingWeek comments misleading (says "moving average price")
5. **MessagePack:** Need to check current version for CVE

</code_context>

<specifics>
## Technical Details

### Coflnet Polling Pattern (BazaarUpdater.cs lines 103-117)
```csharp
// Wait 9.5 seconds after last update before pulling
var waitTime = lastUpdate + TimeSpan.FromSeconds(9.5) - DateTime.Now;
if (waitTime > TimeSpan.Zero)
    await Task.Delay(waitTime);
```

### Top-of-Book Logic (BazaarUpdater.cs lines 75-76)
```csharp
pInfo.QuickStatus.SellPrice = p.Value.SellSummary.Select(o => o.PricePerUnit).FirstOrDefault();
pInfo.QuickStatus.BuyPrice = p.Value.BuySummary.Select(o => o.PricePerUnit).FirstOrDefault();
```

### DB Batch Pattern
Instead of SaveChanges in loop, collect all items first, then single SaveChanges.

</specifics>

<deferred>
## Deferred Ideas

None - these are specific hardening fixes

</deferred>

---

*Phase: 01-setup-core-data-hardening*
*Context gathered: 2026-03-28*
