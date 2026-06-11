# TypeScript Dashboard Implementation Guide

## Overview

This is a complete TypeScript-based conversion of the Tokenix dashboard with full type safety and dynamic properties. The implementation follows React best practices with strong typing throughout.

## File Structure

```
dashboard/
├── lib/
│   ├── types.ts                 # Core TypeScript interfaces
│   ├── utils.ts                 # Utility functions for formatting and data manipulation
│   └── dashboard-config.ts      # Data provider with sample configuration
├── components/
│   └── dashboard.tsx            # Main Dashboard component with all subcomponents
└── README.md                    # This file
```

## Type System

### Core Types

#### `Model`
Represents a single AI model in the screener.

```typescript
interface Model {
  name: string;                  // e.g., "GPT-4o"
  provider: string;              // e.g., "openai"
  tier: "S" | "A" | "B" | "C";   // Performance tier
  context: string;               // Context window (e.g., "128K")
  input: number;                 // Input price per 1M tokens
  output: number;                // Output price per 1M tokens
  chg: number;                   // 1-day price change (percentage)
}
```

#### `TickerItem`
Represents a single item in the scrolling ticker.

```typescript
interface TickerItem {
  name: string;                  // Model name
  price: string;                 // Formatted price (e.g., "$2.50")
  chg: string;                   // Formatted change (e.g., "-1.2%")
  dir: "up" | "dn" | "fl";       // Direction: up, down, or flat
}
```

#### `StatItem`
Represents a statistic in the stats row.

```typescript
interface StatItem {
  label: string;                 // Stat label (e.g., "Index today")
  value: string | number;        // Stat value
  sub: string;                   // Subtitle/description
  cls?: "gold" | "green" | "blue" | ""; // Color class
}
```

#### `DashboardConfig`
Complete configuration for the dashboard.

```typescript
interface DashboardConfig {
  title: string;
  description: string;
  indexValue: number;            // Current ACPI value
  indexDate: string;             // Publication date
  deflation: number;             // Deflation percentage
  deflationPeriod: string;       // Time period (e.g., "6 months")
  cheapestModel: number;         // Cheapest model price
  modelsTracked: number;         // Total models
  providers: number;             // Total providers
  hardwareFloor: number;         // GPU cost floor
  stats: StatItem[];
  models: Model[];
  tickerItems: TickerItem[];
}
```

#### `FilterState`
Tracks all filtering and sorting state.

```typescript
interface FilterState {
  search: string;                // Search query
  provider: string;              // Selected provider (or "all")
  tier: "all" | "S" | "A" | "B" | "C";
  sortKey: keyof Model;          // Column to sort by
  sortDir: "asc" | "desc";
  currentPage: number;
  pageSize: number;
}
```

## Utility Functions

All formatting and data manipulation functions are in `lib/utils.ts`:

### Formatting
- `formatPrice(n: number): string` — Formats numbers as prices
- `formatLargeNumber(n: number): string` — Adds thousand separators
- `formatChangePercent(change: number): string` — Formats percentage changes
- `getTierLabel(tier: string): string` — Gets human-readable tier name
- `getChangeColor(change: number): "up" | "dn" | "fl"` — Determines change color

### Data Manipulation
- `filterModels()` — Filters by search, provider, and tier
- `sortModels()` — Sorts by any column
- `paginateArray()` — Handles pagination
- `getTierFromPrice()` — Calculates tier from price

## Component Structure

### Main Component: `<Dashboard />`

The main Dashboard component manages all pages and state.

```tsx
<Dashboard 
  config={dashboardConfig}
  onPageChange={(page) => console.log(page)}
/>
```

### Sub-components (all self-contained)

- **`<HeroSection />`** — Homepage hero with index value
- **`<StatsRow />`** — Five-column stats display
- **`<ScreenerControls />`** — Search, filter, tier buttons
- **`<ModelTable />`** — Sortable, paginated table
- **`<TierBadge />`** — Tier indicator (S/A/B/C)

## Usage Example

### Basic Setup

```typescript
import { Dashboard } from "@/components/dashboard";
import { generateDashboardConfig } from "@/lib/dashboard-config";

export default function Page() {
  const config = generateDashboardConfig();

  return <Dashboard config={config} />;
}
```

### With Custom Data

```typescript
import { generateDashboardConfig } from "@/lib/dashboard-config";
import type { DashboardConfig } from "@/lib/types";

const customConfig = generateDashboardConfig({
  models: [
    // Your custom models
  ],
  indexValue: 6.5,
  indexDate: "Jun 11, 2026",
  // ... other overrides
});

<Dashboard config={customConfig} />
```

### With Dynamic Data Loading

```typescript
const MyDashboardPage = () => {
  const [config, setConfig] = useState<DashboardConfig | null>(null);

  useEffect(() => {
    // Fetch from API
    fetch("/api/dashboard-config")
      .then((r) => r.json())
      .then((data) => setConfig(data));
  }, []);

  if (!config) return <div>Loading...</div>;

  return <Dashboard config={config} />;
};
```

## Features

### ✅ Implemented

- Full TypeScript type safety
- Three-page navigation (Home, Screener, Methodology)
- Real-time search filtering
- Provider filtering
- Tier filtering (S/A/B/C)
- Multi-column sorting (click headers)
- Pagination (25/50/100 per page)
- Responsive inline styling
- Dynamic calculation of stats
- Formatted prices and numbers
- Change indicators (↓/↑/—)

### 🎨 Styling

All components use inline styles with CSS variables for consistency:

```typescript
style={{
  color: "var(--ink)",
  background: "var(--bg)",
  fontFamily: "var(--serif)" // or "var(--mono)"
}}
```

Available CSS variables (defined in globals.css):
- `--bg`, `--bg2`, `--bg3` — Background colors
- `--ink`, `--ink2`, `--ink3`, `--ink4` — Text colors
- `--gold`, `--gold2`, `--gold3` — Accent colors
- `--green`, `--red`, `--blue` — Status colors
- `--serif`, `--mono` — Font families

## State Management

The Dashboard component manages all state internally using React hooks:
- `activePage` — Current page (home/screener/methodology)
- `filters` — All filter, sort, and pagination state

For more complex state needs, consider lifting state up or using Context API.

## Integration Points

### Adding Real Data

Replace `SAMPLE_MODELS` in `lib/dashboard-config.ts`:

```typescript
export const SAMPLE_MODELS: Model[] = [
  // ... your real data
];
```

Or fetch from an API:

```typescript
const config = await fetch("/api/dashboard-config").then(r => r.json());
const dashboard = generateDashboardConfig(config);
```

### Real-time Updates

To enable live updates:

```typescript
useEffect(() => {
  const interval = setInterval(async () => {
    const newConfig = await fetchLatestConfig();
    setConfig(newConfig);
  }, 60000); // Update every minute

  return () => clearInterval(interval);
}, []);
```

## Performance Considerations

- Filtering and sorting are memoized with `useMemo`
- Pagination prevents rendering all rows at once
- No unnecessary re-renders due to proper dependency arrays

## Extending the Dashboard

### Adding a New Filter

1. Add to `FilterState` interface
2. Add handler in Dashboard component
3. Update `filterModels()` function
4. Add UI control in `<ScreenerControls />`

### Adding a New Page

1. Add to the page navigation logic
2. Create new section component
3. Add page button in header

### Customizing Styling

All colors and fonts are CSS variables. Update `app/globals.css` to change the theme globally:

```css
:root {
  --gold: #c8a96e;
  --ink: #1a1714;
  /* ... */
}
```

## Browser Support

Works in all modern browsers. Uses:
- ES2020+ syntax (optional chaining, nullish coalescing)
- CSS Grid and Flexbox
- React 18+ Hooks

## Testing

To test the dashboard:

```bash
npm run dev
# Navigate to the dashboard page
# Test search, filtering, sorting, pagination
```

## Migration from HTML

The component structure mirrors the original HTML:

| HTML Section | Component |
|---|---|
| `.hero` | `<HeroSection />` |
| `.stats-row` | `<StatsRow />` |
| `.sc-controls` | `<ScreenerControls />` |
| `.sc-tbl` | `<ModelTable />` |
| `.page` | `<Page />` |

All styling matches the original design through CSS variables.

## Next Steps

1. Replace sample data with real data from your CSV/API
2. Connect the ticker component
3. Implement the methodology page content
4. Add real-time update subscriptions
5. Test filtering and sorting performance
