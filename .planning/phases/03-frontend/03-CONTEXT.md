# Phase 3: Frontend - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Display bazaar items, price history charts, and top flips in a web interface using React.

</domain>

<decisions>
## Implementation Decisions

### Tech Stack
- **D-01:** React SPA - separate frontend that calls .NET API endpoints
- **D-02:** Use Vite for build tooling (fast, modern)
- **D-03:** Use axios for API calls

### Layout
- **D-04:** Dashboard layout with sidebar navigation
- **D-05:** Sidebar: Items, Flips, History navigation
- **D-06:** Main area displays content based on selected section

### Charts
- **D-07:** Chart.js for price history visualization
- **D-08:** Line chart showing buy/sell prices over time

### Components
- **D-09:** Items list with search/filter
- **D-10:** Flip recommendations panel
- **D-11:** Item detail view with price chart

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### API Endpoints
- `.planning/phases/02-api-flip-analysis/02-01-PLAN.md` — REST API specs
- `Controllers/BazaarController.cs` — GET /api/bazaar endpoints
- `Controllers/FlipsController.cs` — GET /api/flips endpoints

### Backend Models
- `Models/BazaarItemDto.cs` — DTO structure for API responses
- `Models/PriceSnapshotDto.cs` — Price history data structure
- `Models/FlipRecommendationDto.cs` — Flip data structure

### Project Context
- `.planning/REQUIREMENTS.md` — FRNT-01 through FRNT-04 requirements
- `.planning/ROADMAP.md` — Phase 3 goal and success criteria

</canonical_refs>

\code_context
## Existing Code Insights

### Backend Already Implemented
- REST API at /api/bazaar and /api/flips
- Database with historical price data
- Flip detection service

### Integration Points
- Frontend will fetch from http://localhost:5000/api/* (or configured port)
- API returns JSON - frontend deserializes to TypeScript interfaces

</code_context>

<specifics>
## Specific Ideas

- Clean, modern UI with dark theme (gaming aesthetic fits Hypixel)
- Real-time-ish data (refresh button, or polling every 30s)
- Mobile-responsive dashboard

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope

</deferred>

---

*Phase: 03-frontend*
*Context gathered: 2026-03-28*
