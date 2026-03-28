---
phase: 02-api-flip-analysis
plan: "02"
subsystem: Flip Detection
tags: [flip, profit, api, analysis]
dependency_graph:
  requires: [02-01]
  provides: [FLIP-01, FLIP-02, FLIP-03]
  affects: [frontend, historical-analysis]
tech_stack:
  added: [Flip Detection Logic, Profit Calculation]
  patterns: [Service Layer, Recommendation Scoring]
key_files:
  created:
    - Models/FlipRecommendationDto.cs
    - Services/FlipDetectionService.cs
    - Controllers/FlipsController.cs
  modified:
    - Program.cs
decisions:
  - "Using weighted score: RecommendationScore = ProfitMargin * Log10(Volume + 1)"
  - "Filtering out items where BuyPrice > SellPrice (no arbitrage)"
  - "Default minProfitPercent = 1.0% to filter noise"
  - "Using Scoped lifetime for FlipDetectionService"
---

# Phase 02 Plan 02: Flip Detection Summary

## One-Liner

Flip detection service with profit margin calculations and API endpoints for identifying profitable buy-sell opportunities.

## Objective

Calculate profitable flip opportunities and expose via API endpoints. Identify items where sell price significantly exceeds buy price (potential profit).

## Tasks Completed

| Task | Name | Status | Commit |
|------|------|--------|--------|
| 1 | Create FlipCalculation DTO | ✓ Done | 80679fe |
| 2 | Create FlipDetectionService | ✓ Done | 604cb0d |
| 3 | Create FlipsController endpoint | ✓ Done | da20753 |

## Flip Detection Implementation

### FLIP-01: Profit Margin Calculation
- Method: `CalculateMargin(decimal buyPrice, decimal sellPrice)`
- Returns: `SellPrice - BuyPrice`
- Verified: Method present in FlipDetectionService

### FLIP-02 & FLIP-03: Top Flips Endpoint
- Method: `GetTopFlipsAsync(int count = 50, decimal minProfitPercent = 1.0m)`
- Query latest snapshot for each item
- Filter by minimum profit percentage
- Sort by RecommendationScore descending

### API Endpoints

| Endpoint | Requirement | Description |
|----------|-------------|-------------|
| `GET /api/flips` | FLIP-03 | Returns top flip opportunities sorted by profit |
| `GET /api/flips/{productId}` | FLIP-03 | Returns single item flip analysis |

### Recommendation Score Formula
```
RecommendationScore = ProfitMargin * Math.Log10(BuyVolume + SellVolume + 1)
```

### Filtering Rules
- Excludes items with 0 volume (no real trading)
- Excludes items where BuyPrice > SellPrice (no arbitrage)
- Minimum profit threshold to filter noise (default 1.0%)

## Response DTOs

- **FlipRecommendationDto**: `ProductId`, `ProductName`, `BuyPrice`, `SellPrice`, `ProfitMargin`, `ProfitPercentage`, `VolumeScore`, `RecommendationScore`, `BuyVolume`, `SellVolume`, `LastUpdated`
- **FlipsResponseDto**: `Flips` (List), `GeneratedAt`, `TotalItemsAnalyzed`

## Verification

- Build: ✓ Succeeded
- Dependencies: ✓ Uses existing SkyBazaarDbContext
- Service Registration: ✓ Added to Program.cs

## Deviation Documentation

None - plan executed exactly as written.

## Auth Gates

None - public API endpoints, no authentication required.

## Known Stubs

None identified.

## Self-Check

- [x] Files exist: Models/FlipRecommendationDto.cs
- [x] Files exist: Services/FlipDetectionService.cs
- [x] Files exist: Controllers/FlipsController.cs
- [x] Commit 80679fe exists
- [x] Commit 604cb0d exists
- [x] Commit da20753 exists
- [x] Build succeeds

## Self-Check: PASSED

---

**Completed:** 2026-03-28  
**Duration:** ~1 minute  
**Requirements:** FLIP-01, FLIP-02, FLIP-03
