# Tokenix — AI Compute Price Index (ACPI)

"The standard measure of AI compute value." A financial-style index that tracks
what one unit of AI intelligence costs across every major model/provider, as a
single quality- and risk-adjusted number ("$ per 1M Standard Compute Units").
Think S&P 500 / CPI for AI tokens, not a website with a number on it.

## Local path
`C:\Users\User\Work\Business\token-index\tokenix`
Remote: `https://github.com/akhan2001/tokenix.git`

## Repo layout (this is NOT a monorepo)

```
tokenix/
├─ scrape_prices.py        # Python price scraper (multi-source). Run manually today.
├─ token_prices_*.csv      # Timestamped scraper output (committed snapshots)
├─ dashboard/              # Next.js 16 app — the public site (homepage + screener)
│  ├─ app/                 # page.tsx (index), screener/page.tsx
│  ├─ components/          # acpi-hero-card, acpi-chart, price-table, ticker, header…
│  ├─ lib/data.ts          # Loads the latest CSV → PriceRow[]  ← the data layer today
│  └─ data/prices.csv      # Bundled fallback snapshot (used on Vercel)
├─ package.json            # Root wrapper: `npm run dev|build|start` proxy into dashboard/
└─ vercel.json
```

There is **no** `apps/`, no `packages/`, no FastAPI service, no TimescaleDB, no
Redis, no Cloudflare Worker. If a plan references those, it's describing a
different/aspirational project — confirm before building against it.

## Stack
- **Next.js 16.2.6** + React 19 (`dashboard/`). ⚠️ Read `dashboard/AGENTS.md`: this
  Next version has breaking changes vs. model training data — check
  `node_modules/next/dist/docs/` before writing Next code.
- Tailwind v4, shadcn, base-ui, lucide, cobe (globe). Most styling is **inline
  styles**, not utility classes — match the surrounding file.
- **Python 3** scraper using `httpx` only (`scrape_prices.py`).
- Data transport today: **CSV files on disk**, parsed by `dashboard/lib/data.ts`.

## Run / build
- Dev site: `npm run dev` (root) → runs `next dev` in `dashboard/`.
- Build: `npm run build` (root) installs dashboard deps then `next build`.
- Scrape prices: `python scrape_prices.py` → writes a new `token_prices_<ts>.csv`.

## Data contract (do not break)
The scraper and `dashboard/lib/data.ts` share a fixed CSV schema. Any new data
source or pipeline MUST emit these columns:
`timestamp, source, provider, model_id, model_name, context_length,
input_per_million_usd, output_per_million_usd`
`PriceRow` in `dashboard/lib/data.ts` mirrors it. `data.ts` prefers the newest
`../token_prices_*.csv`, then falls back to `dashboard/data/prices.csv`.

## ⚠️ Current state of "the index" — read before touching ACPI
The ACPI **methodology is published as UI prose** (`dashboard/app/page.tsx`,
methodology section) but is **NOT implemented**. The hero number, delta, "Live"
badge, and the 17-month chart are **hardcoded / synthetic**:
- `dashboard/components/acpi-hero-card.tsx`: `CountUp target={5.84}`, `▼ 13.0% MoM`,
  static "Live" badge.
- `buildSeries()` in the same file generates a deterministic fake curve
  (11.84 → 5.84). `acpi-chart.tsx` is similarly synthetic.

So the screener shows **real scraped prices**, but the headline **index value is a
mockup**. The active build is making that number real — see the
`build-acpi-engine` skill in `.claude/skills/`.

## Published methodology (from the site copy — the spec to honor)
- Unit: dollars per **1M Standard Compute Units** (all modalities normalized to
  cost per 1M tokens).
- ACPI = **equal-weighted average** of every tracked model's adjusted score.
- Two adjustments on raw price: a **quality factor** (standardized benchmark
  scores, stated source: Scale AI HELM) and a **market-risk factor** (provider
  concentration / stability).
- Stated cadence: **updated daily** (hero copy says "One number, updated daily").
- Stated data sources in copy: provider docs (token pricing), Lambda Labs H100
  SXM5 median (GPU), Hyperstack vLLM / Llama 3.1 70B (throughput), HELM
  (benchmarks). Treat these as the target spec, not as already-wired inputs.

## Working norms
- Match existing style (inline styles, the serif/mono CSS vars, the "ledger"/
  terminal aesthetic). Don't introduce a CSS framework refactor unasked.
- Keep the index **auditable and append-only**: never overwrite historical CSV
  snapshots; add new timestamped rows/files.
- Don't fabricate index values in places that imply they're real. If wiring the
  number, replace the synthetic values; don't add more mock data beside them.
- Git user is `akhan2001`; remote is `github.com/akhan2001/tokenix`.
