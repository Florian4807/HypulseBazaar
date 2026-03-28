---
status: draft
phase: 03-frontend
created: 2026-03-28
---

# UI-SPEC: Phase 3 - Frontend

## Overview

**Phase:** 3 - Frontend  
**Goal:** Display bazaar items, price history charts, and top flips in a web interface  
**Tech Stack:** React SPA + Vite + axios + Chart.js  
**Design System:** Tailwind CSS (manual)

---

## Design System

### Initialization

| Item | Value | Source |
|------|-------|--------|
| Framework | React 18+ SPA | CONTEXT.md D-01 |
| Build Tool | Vite | CONTEXT.md D-02 |
| HTTP Client | axios | CONTEXT.md D-03 |
| Charts | Chart.js | CONTEXT.md D-07 |
| CSS | Tailwind CSS | Manual design system |

---

## Spacing Contract

**Scale:** 8-point grid (multiples of 4)

| Token | Value | Usage |
|-------|-------|-------|
| `space-1` | 4px | Icon padding, tight spacing |
| `space-2` | 8px | Component internal padding |
| `space-3` | 12px | Between related elements |
| `space-4` | 16px | Standard padding, gaps |
| `space-6` | 24px | Section spacing |
| `space-8` | 32px | Major section breaks |
| `space-12` | 48px | Page margins on desktop |

**Touch Targets:** Minimum 44px for interactive elements (accessibility)

---

## Typography Contract

**Font Family:** System font stack (sans-serif) - `"Inter", system-ui, -apple-system, sans-serif`

| Token | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| `text-xs` | 12px | 400 | 1.4 | Timestamps, metadata |
| `text-base` | 16px | 400 | 1.5 | Body text, list items |
| `text-lg` | 20px | 400 | 1.4 | Section headers |
| `text-xl` | 28px | 700 | 1.2 | Page titles |

**Heading Hierarchy:**  
- H1: Page title (text-xl)  
- H2: Section headers (text-lg)  
- H3: Card titles (text-base bold)  
- Body: Regular content (text-base)  

---

## Color Contract

**Theme:** Dark mode (gaming aesthetic for Hypixel)

### Surface Colors (60/30/10 split)

| Token | Hex | Usage |
|-------|-----|-------|
| `bg-primary` | `#0f172a` | Main background (slate-900) |
| `bg-secondary` | `#1e293b` | Cards, sidebar (slate-800) |
| `bg-tertiary` | `#334155` | Hover states, elevated surfaces (slate-700) |

### Accent Colors (10%)

| Token | Hex | Usage |
|-------|-----|-------|
| `accent-primary` | `#22c55e` | Positive values, profit, buy (green-500) |
| `accent-secondary` | `#ef4444` | Negative values, loss, sell (red-500) |
| `accent-highlight` | `#3b82f6` | Interactive elements, links (blue-500) |

### Text Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `text-primary` | `#f8fafc` | Main text (slate-50) |
| `text-secondary` | `#94a3b8` | Muted text (slate-400) |
| `text-muted` | `#64748b` | Timestamps, metadata (slate-500) |

### Border Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `border-default` | `#334155` | Card borders (slate-700) |
| `border-hover` | `#475569` | Hover state borders (slate-600) |

---

## Layout Contract

### Dashboard Layout

```
+------------------+----------------------------------------+
|                  |                                        |
|    SIDEBAR       |           MAIN CONTENT                |
|    (240px)       |           (flex-1)                    |
|                  |                                        |
|  - Logo/Title    |  +----------------------------------+ |
|  - Items         |  |  Page Header + Refresh Button    | |
|  - Flips         |  +----------------------------------+ |
|  - History       |  |                                  | |
|                  |  |  Content Area                    | |
|                  |  |  (Items list / Flip panel /      | |
|                  |  |   Price chart)                   | |
|                  |  |                                  | |
+------------------+----------------------------------------+
```

### Responsive Breakpoints

| Breakpoint | Width | Layout Changes |
|------------|-------|----------------|
| Mobile | < 768px | Sidebar becomes hamburger menu, single column |
| Tablet | 768px - 1024px | Collapsed sidebar, 2-column grid |
| Desktop | > 1024px | Full sidebar, multi-column layout |

### Sidebar Navigation

| Item | Icon | Route | Description |
|------|------|-------|-------------|
| Items | Package | `/items` | All bazaar items with prices |
| Flips | TrendingUp | `/flips` | Top flip recommendations |
| History | Clock | `/history` | Price history (legacy view) |

---

## Component Inventory

### Core Components

| Component | Purpose | API Source |
|-----------|---------|------------|
| `Sidebar` | Navigation menu | N/A |
| `ItemList` | Paginated list of bazaar items | GET /api/bazaar |
| `ItemRow` | Single item display | N/A |
| `ItemDetail` | Full item view with chart | GET /api/bazaar/{id} |
| `FlipCard` | Individual flip recommendation | N/A |
| `FlipPanel` | Grid of flip recommendations | GET /api/flips |
| `PriceChart` | Line chart (Chart.js) | N/A |
| `SearchBar` | Filter items by name | Client-side |
| `RefreshButton` | Manual data refresh | N/A |
| `StatCard` | Display metrics (volume, profit) | N/A |

### Item List Columns

| Column | Width | Content |
|--------|-------|---------|
| Name | 30% | Product name |
| Buy Price | 20% | Current buy price (green accent) |
| Sell Price | 20% | Current sell price (red accent) |
| Margin | 15% | Profit margin |
| Volume | 15% | 24h volume |

### Flip Card Content

- Product name
- Buy price → Sell price
- Profit margin (colored: green positive, red negative)
- Profit percentage
- 24h volume score
- Recommendation score

---

## Interaction Contract

### Data Fetching

| Action | Trigger | API Call | Behavior |
|--------|---------|----------|----------|
| Load items | Page mount | GET /api/bazaar | Show loading spinner |
| Search filter | Typing in search | Client-side | Filter list in real-time |
| View item detail | Click item row | GET /api/bazaar/{id} | Navigate/expand detail |
| Load flips | Navigate to Flips | GET /api/flips | Show top 20 flips |
| Refresh data | Click refresh button | Re-fetch current endpoint | Show loading state, update |

### Data Refresh Strategy

- **Initial Load:** Fetch on page mount
- **Manual Refresh:** Refresh button in header
- **Auto-refresh (optional):** Poll every 30 seconds (configurable)
- **Loading State:** Show spinner/skeleton during fetch
- **Error State:** Display error message with retry button

### User Interactions

| Interaction | Element | Behavior |
|-------------|---------|----------|
| Search | SearchBar | Filter items by name (case-insensitive) |
| Select item | ItemRow | Navigate to item detail view |
| View flips | Sidebar click | Load flip recommendations |
| Refresh | RefreshButton | Re-fetch current view data |
| Back to list | Back button | Return to previous view |

---

## API Contract

### Endpoints Consumed

| Endpoint | Method | Response Type | Usage |
|----------|--------|---------------|-------|
| `/api/bazaar` | GET | `BazaarItemDto[]` | Items list |
| `/api/bazaar/{productId}` | GET | `PriceHistoryDto` | Item detail + history |
| `/api/flips` | GET | `FlipsResponseDto` | Top flip recommendations |

### Data Models (TypeScript)

```typescript
interface BazaarItem {
  productId: string;
  name: string | null;
  currentBuyPrice: number;
  currentSellPrice: number;
  buyVolume: number;
  sellVolume: number;
  lastUpdated: string; // ISO date
}

interface FlipRecommendation {
  productId: string;
  productName: string | null;
  buyPrice: number;
  sellPrice: number;
  profitMargin: number;
  profitPercentage: number;
  volumeScore: number;
  recommendationScore: number;
  buyVolume: number;
  sellVolume: number;
  lastUpdated: string;
}

interface PriceSnapshot {
  timestamp: string;
  buyPrice: number;
  sellPrice: number;
  buyVolume: number;
  sellVolume: number;
}

interface PriceHistory {
  productId: string;
  productName: string | null;
  snapshots: PriceSnapshot[];
}
```

---

## Copywriting Contract

### Page Titles

| Page | Title |
|------|-------|
| Items | "Bazaar Items" |
| Flips | "Top Flips" |
| History | "Price History" |

### Labels

| Element | Label |
|---------|-------|
| Search placeholder | "Search items..." |
| Buy price header | "Buy" |
| Sell price header | "Sell" |
| Profit margin header | "Margin" |
| Volume header | "Volume" |
| Refresh button | "Refresh Data" |
| Last updated label | "Updated:" |

### Empty States

| State | Message |
|-------|---------|
| No items found | "No items match your search" |
| No flips available | "No flip opportunities found" |
| Loading | "Loading bazaar data..." |
| Error | "Failed to load data. Click to retry." |

### Error States

| Error | Message | Action |
|-------|---------|--------|
| API unreachable | "Cannot connect to server" | Retry button |
| Empty response | "No data available" | Refresh prompt |
| Invalid item | "Item not found" | Back to list |

---

## Chart Specification

### Price History Chart (Chart.js)

| Property | Value |
|----------|-------|
| Type | Line chart |
| X-axis | Time (timestamps from PriceSnapshot) |
| Y-axis | Price (coin value) |
| Datasets | 2: Buy price (green), Sell price (red) |
| Grid | Subtle slate-700 lines |
| Tooltip | Show exact price and timestamp |
| Legend | Show buy/sell toggle |
| Animation | Smooth 300ms transitions |

### Chart Colors

| Dataset | Line Color | Fill Color |
|---------|------------|------------|
| Buy Price | `#22c55e` (green-500) | `rgba(34, 197, 94, 0.1)` |
| Sell Price | `#ef4444` (red-500) | `rgba(239, 68, 68, 0.1)` |

---

## Requirements Coverage

| Requirement | Component(s) | Status |
|-------------|--------------|--------|
| FRNT-01: Display list of all bazaar items with current prices | ItemList, ItemRow | Required |
| FRNT-02: Show price history chart for selected item | ItemDetail, PriceChart | Required |
| FRNT-03: Display top flips with profit calculations | FlipPanel, FlipCard | Required |
| FRNT-04: Filter items by name search | SearchBar | Required |

---

## Pre-Populated From

| Source | Decisions Used |
|--------|----------------|
| CONTEXT.md | Tech stack (React, Vite, axios, Chart.js), Layout (sidebar), Navigation items, Dark theme |
| REQUIREMENTS.md | FRNT-01 through FRNT-04 requirements |
| Backend DTOs | Data models for TypeScript interfaces |
| Default (no source) | Spacing scale (8pt), Typography (6 sizes), Color palette (dark gaming theme) |

---

## Registry

| Registry | Status | Safety Gate |
|----------|--------|-------------|
| Tailwind CSS | Required | Manual design system - no third-party components |
| Chart.js | Required | npm package - standard usage, no custom components |

---

## Notes

1. **Backend runs on port 5000** - Configure Vite proxy or CORS
2. **API base URL:** `http://localhost:5000/api`
3. **Dark theme** chosen to match gaming aesthetic (Hypixel)
4. **Mobile-responsive** - Sidebar collapses to hamburger menu on mobile
5. **Consider** adding loading skeletons for better UX during data fetch

---

*UI-SPEC created: 2026-03-28*
