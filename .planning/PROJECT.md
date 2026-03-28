# SkyBazaar

## What This Is

A standalone service for processing and storing Hypixel SkyBlock bazaar data. Forked from Coflnet/SkyBazaar, stripped of microservice dependencies to run as an independent application. Enables historical tracking of bazaar prices and flip detection.

## Core Value

Track Hypixel SkyBlock bazaar prices over time to identify profitable flips.

## Requirements

### Validated

- ✓ Clone and adapt SkyBazaar codebase as standalone service — Phase 1
- ✓ Remove all microservice dependencies (Kafka, Redis, etc.) — Phase 1
- ✓ Process Hypixel SkyBlock bazaar API data — Phase 1
- ✓ Store bazaar data in local database for historical analysis — Phase 1
- ✓ Query historical bazaar data via API — Phase 2
- ✓ Calculate profitable flips — Phase 2

### Active

- [ ] Display items with price history (Frontend)

### Out of Scope

- Real-time notifications
- User accounts/authentication
- Multi-server deployment
- Integration with other Hypixel services

## Context

Based on existing codebase from https://github.com/Coflnet/SkyBazaar. The original project is part of a larger microservice ecosystem. This fork aims to create a self-contained service that:
- Fetches bazaar data from Hypixel's public API
- Stores price history in a local database (PostgreSQL/SQLite)
- Provides API endpoints for querying historical data
- Includes a basic frontend for viewing data and flips

## Constraints

- **Tech Stack**: .NET/C# (from original), local database
- **Data Source**: Hypixel SkyBlock bazaar API (public)
- **Scope**: Single self-hosted instance
- **Dependencies**: Minimal - avoid Kafka, Redis, external services

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Standalone service | Self-hosted, no external infrastructure dependencies | ✓ Good |
| Local database (SQLite) | Store historical data without cloud services | ✓ Good |
| Web frontend | View data and flips locally | — Pending |
| .NET 9 + EF Core | Modern .NET with mature ORM | ✓ Good |

---
*Last updated: 2026-03-28 after Phase 2*

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state
