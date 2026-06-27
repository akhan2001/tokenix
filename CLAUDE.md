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
├─ scripts/                # Python pipeline (run manually / by GitHub Action)
│  ├─ scrape_prices.py     #   multi-source token price scraper
│  ├─ acpi.py              #   computes the ACPI index value + history
│  ├─ benchmark_quality.py #   HF OpenEvals leaderboard → quality composite
│  └─ scheduler.py         #   local hourly loop around acpi.main()
├─ data/snapshots/         # Timestamped scraper output (token_prices_*.csv, prices_*.csv)
│                          #   gitignored working files; data.ts reads the newest from here
├─ docs/                   # Markdown notes + GPU market briefing
├─ dashboard/              # Next.js 16 app — the public site (homepage + screener)
│  ├─ app/                 # page.tsx (index), screener/page.tsx
│  ├─ components/          # acpi-hero-card, acpi-chart, price-table, ticker, header…
│  ├─ lib/data.ts          # Loads the latest CSV → PriceRow[]  ← the data layer today
│  └─ data/                # acpi_latest.json, acpi_history.csv, prices.csv (bundled fallback)
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
- **Python 3** scraper using `httpx` only (`scripts/scrape_prices.py`).
- Data transport today: **CSV files on disk**, parsed by `dashboard/lib/data.ts`.

## Run / build
- Dev site: `npm run dev` (root) → runs `next dev` in `dashboard/`.
- Build: `npm run build` (root) installs dashboard deps then `next build`.
- Scrape prices: `python scripts/scrape_prices.py` → writes a new
  `data/snapshots/token_prices_<ts>.csv`.

## Data contract (do not break)
The scraper and `dashboard/lib/data.ts` share a fixed CSV schema. Any new data
source or pipeline MUST emit these columns:
`timestamp, source, provider, model_id, model_name, context_length,
input_per_million_usd, output_per_million_usd`
`PriceRow` in `dashboard/lib/data.ts` mirrors it. `data.ts` prefers the newest
`../data/snapshots/token_prices_*.csv`, then falls back to
`dashboard/data/prices.csv`.

## ⚠️ Current state of "the index" — read before touching ACPI
The headline ACPI number is **real and implemented**. `scripts/acpi.py` fetches live
OpenRouter pricing, applies the adjustments below, and writes
`dashboard/data/acpi_latest.json` (read by `acpi-hero-card.tsx` via
`loadAcpi()`) plus an append-only `acpi_history.csv`. The GitHub Action
`.github/workflows/acpi.yml` runs it hourly.
- Benchmark quality lives in `scripts/benchmark_quality.py` (HF OpenEvals leaderboard
  Parquet → z-scored composite), powering the per-model P1 (intelligence-per-
  dollar) screener metric.
- Still synthetic: the hero **spark / 17-month chart** (`buildSeries()` in
  `acpi-hero-card.tsx`, currently commented out, and `acpi-chart.tsx`). There is
  no real long history yet — `acpi_history.csv` only accumulates from each run.

So the screener and the **headline index value are real**; only the long-range
chart art is still a placeholder. See the `build-acpi-engine` skill in
`.claude/skills/`.

## Published methodology (the spec — kept in sync with the code)
- Unit: dollars per **1M Standard Compute Units** (all modalities normalized to
  cost per 1M tokens). Each model's per-token cost is blended **75% input / 25%
  output** (the standard 3:1 input:output usage assumption).
- ACPI = **two-bucket broad-market average** of every tracked model's risk-
  adjusted price. Models split into a **premium bucket** (Tier S/A) and a
  **commodity bucket** (Tier B/C); each bucket is equal-weighted internally, then
  the two are combined **50/50** so the cheaper long-tail half of the market pulls
  on the index as hard as the frontier (CPI-style), rather than flagships
  dominating. Tier assignment is a disclosed manual classification
  (`get_tier_weight` in `scripts/acpi.py`), reviewed monthly; the 50/50 split is
  `PREMIUM_BUCKET_WEIGHT` in `scripts/acpi.py`.
- Market-risk factor (P2) scales every price; the price-spread proxy that used to
  stand in for "quality" has been removed.
- Quality factor = **HELM-aligned benchmark composite** (MMLU-Pro, coding, math,
  reasoning), z-score normalised, sourced via standardized leaderboard
  aggregation (HF OpenEvals dataset — *not* raw Stanford HELM). It feeds the P1
  screener; models without benchmark data are excluded from P1 but kept in ACPI.
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
