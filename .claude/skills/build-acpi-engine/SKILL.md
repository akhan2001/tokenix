---
name: build-acpi-engine
description: >-
  Build or extend the Tokenix ACPI (AI Compute Price Index) calculation engine —
  turning scraped token prices into the single quality- and risk-adjusted index
  number. Use when work involves computing, storing, serving, or displaying the
  ACPI value/history, the methodology, the scraper pipeline (scrape_prices.py),
  the CSV data contract, or replacing the mocked hero number in the dashboard.
---

# Build the ACPI engine

## The job
Tokenix publishes a methodology but the headline index number is currently a
**mockup** (`dashboard/components/acpi-hero-card.tsx` → `CountUp target={5.84}`,
synthetic `buildSeries()`). The real work is producing that number from real
data, storing it append-only, and rendering the actual value. Build this so it
stays consistent with the methodology already published in the site copy
(`dashboard/app/page.tsx` methodology section). See root `CLAUDE.md` for the
authoritative state and spec.

## Hard constraints (don't violate)
1. **CSV data contract is fixed.** Columns:
   `timestamp, source, provider, model_id, model_name, context_length,
   input_per_million_usd, output_per_million_usd`. `scrape_prices.py` writes it,
   `dashboard/lib/data.ts` (`PriceRow`) reads it. Extend additively if needed.
2. **Append-only history.** Never overwrite a `token_prices_*.csv` snapshot or a
   computed index value. A credible index is auditable: every value ever
   computed is retained with its timestamp and the inputs that produced it.
3. **Honor the published methodology** (the UI is the public spec):
   - Unit: $ per **1M Standard Compute Units** (normalize all to cost/1M tokens).
   - ACPI = **equal-weighted average** of each model's adjusted score.
   - Adjustments: a **quality factor** (benchmark scores) and a **market-risk
     factor** (provider concentration/stability) applied to raw price.
   - Cadence: **daily** is what the site promises. Don't claim "live"/tick data
     the inputs can't support — OpenRouter/provider prices change a few times a
     day at most. "Live because it *can* change," not a spinning counter.
4. **No fabricated values presented as real.** When wiring the number, *replace*
   the synthetic values; don't add new mock data next to them. If a real value
   isn't available yet, show an honest empty/"—" state, not an invented one.

## Stack reality (no new infra unless asked)
- Today everything flows through **CSV on disk** → `dashboard/lib/data.ts`.
- This is **Next.js 16** + React 19. Read `dashboard/AGENTS.md` and
  `node_modules/next/dist/docs/` before writing Next/route code — APIs differ
  from training data.
- The scraper uses **httpx only**. Keep it dependency-light.
- TimescaleDB / Redis / FastAPI are aspirational, not present. Prefer the
  simplest thing that works (e.g. a committed `acpi_history.csv` + a computed
  value read by the dashboard) before introducing services. Confirm with the
  user before adding a database or backend service.

## Suggested build order (smallest credible slice first)
1. **Calc function** (Python, alongside `scrape_prices.py`): read the latest
   price CSV → normalize → apply quality + risk factors → equal-weighted ACPI.
   Output one row: `{timestamp, acpi_value, model_count, ...}` appended to an
   `acpi_history.csv`. Make the formula explicit and documented (it's the
   methodology of record).
2. **Wire the dashboard to the real value**: replace the hardcoded `5.84` /
   synthetic series in `acpi-hero-card.tsx` and `acpi-chart.tsx` with reads from
   the computed history (same pattern as `dashboard/lib/data.ts`). Compute the
   real MoM delta; drop the static badge if it can't be substantiated.
3. **Methodology page**: make `tokenix…/methodology` reflect the *implemented*
   formula, weights, sources, cadence, and version it (ACPI v1.0). The site
   already links to it.
4. **Only then** consider an API layer / DB / websockets — and only if polling a
   committed/served CSV is genuinely insufficient. Raise the tradeoff first.

## Before you finish
- Verify the dashboard renders the new number: `npm run dev` (root) and check the
  homepage hero + chart show computed values, not the mock.
- Confirm the screener still loads (the CSV contract wasn't broken).
- State plainly what's now real vs. still placeholder — don't imply the whole
  index is live if only part is wired.
