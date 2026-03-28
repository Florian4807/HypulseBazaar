---
phase: 01-setup-core-data
plan: "04"
subsystem: Data Layer
tags: [ef-core, configuration, bug-fix]
dependency_graph:
  requires: []
  provides:
    - EF relationship fix for PriceSnapshot creation
    - Removed dead config
  affects:
    - Services/BazaarFetcherService.cs
    - appsettings.json
tech_stack:
  added: []
  patterns:
    - EF Core navigation property for FK relationships
key_files:
  created: []
  modified:
    - Services/BazaarFetcherService.cs
    - appsettings.json
decisions:
  - Use navigation property over explicit FK for EF relationship consistency
  - Approximate Coflnet's 9s delay with 9.5 default (rounds to int in config)
metrics:
  duration: ~1 minute
  completed: 2026-03-27
---

# Phase 01 Plan 04: EF Relationship Fix + Config Cleanup

Apply 3 small fixes to ensure EF Core handles FK ordering correctly and clean up dead configuration.

## Changes Made

### 1. EF Relationship Fix
- **File:** `Services/BazaarFetcherService.cs`
- **Change:** Use navigation property `BazaarItem = bazaarItem` instead of explicit FK `BazaarItemId = bazaarItem.Id`
- **Reason:** EF Core handles FK ordering better when using navigation properties

### 2. Removed Dead Config
- **Files:** `Services/BazaarFetcherService.cs`, `appsettings.json`
- **Change:** Removed `_fetchIntervalSeconds` field and `FetchIntervalSeconds` config key
- **Reason:** The service no longer uses a fixed interval - it uses delay-after-snapshot logic

### 3. Updated MinDelay Default
- **File:** `appsettings.json`
- **Change:** `MinDelayAfterSnapshotSeconds: 10` → `9.5`
- **Reason:** Approximates Coflnet's ~9s delay more closely (stored as double)

## Verification

- [x] `dotnet build SkyBazaar.csproj` succeeds (0 errors, 47 pre-existing warnings)
- [x] EF uses navigation property for FK
- [x] Dead config removed
- [x] MinDelay default changed to 9.5

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

- [x] Files exist and match commit: Services/BazaarFetcherService.cs, appsettings.json
- [x] Commit hash verified: b2c1dcc
