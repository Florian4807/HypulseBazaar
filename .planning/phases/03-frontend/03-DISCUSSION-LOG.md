# Phase 3: Frontend - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-28
**Phase:** 03-frontend
**Areas discussed:** Tech Stack, Layout, Charts

---

## Tech Stack

| Option | Description | Selected |
|--------|-------------|----------|
| Blazor (Recommended) | Native .NET - shares codebase, simplest integration | |
| React + API | Separate SPA that calls the .NET API - popular, larger ecosystem | ✓ |
| Plain HTML/JS | Minimal frontend, no build step, fastest to get running | |

**User's choice:** React + API
**Notes:** User wants separate React SPA that communicates with the .NET backend

---

## Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Dashboard (Recommended) | Sidebar navigation + main content area - items list, flips panel, charts | ✓ |
| Tabs | Tab-based navigation - Items \| Flips \| History | |
| Single Page | Everything visible at once - scrollable list with expandable details | |

**User's choice:** Dashboard (Recommended)
**Notes:** Dashboard layout with sidebar for navigation

---

## Charts

| Option | Description | Selected |
|--------|-------------|----------|
| Chart.js (Recommended) | Simple, lightweight, good defaults - works well with React | ✓ |
| Recharts | React-native charting library - component-based, flexible | |
| ApexCharts | Feature-rich, good looking default themes | |

**User's choice:** Chart.js (Recommended)
**Notes:** Chart.js for price history visualization

---

## Deferred Ideas

None

