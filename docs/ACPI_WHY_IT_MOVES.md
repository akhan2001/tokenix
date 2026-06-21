# ACPI — How It Works & Why It Moves

*One-pager for the team. Plain-English explanation of the headline index number.*

---

## What the number is

The **ACPI** (AI Compute Price Index) is a single figure — currently **~$2.84 per 1M
standard compute units** — that represents the average cost of one unit of AI
"intelligence" across the market. Think of it like the S&P 500 or CPI, but for AI
model pricing.

It is **real and live** (computed by `acpi.py`), not a placeholder. It is recomputed
roughly hourly and logged to `dashboard/data/acpi_history.csv`.

## How it's calculated (in plain English)

1. **Pull live prices** for every model listed on OpenRouter (~300+ models).
2. **Blend** each model's input and output price into one number (25% input / 75% output).
3. **Adjust** that price by two factors (a price-vs-hardware-floor factor and a market
   factor).
4. **Average** the adjusted price across *every* model. That average is the ACPI.

> Key point: it's an **equal-weighted average of the whole list** — a $0.10 long-tail
> model counts exactly as much as GPT-4 or Claude.

## Why it moves

The index drifted from **$2.79 → $2.84** over the past week. The movement comes from
**two sources, in order of impact:**

### 1. The basket of models changes daily (the main driver)
Because ACPI averages *every* model on OpenRouter, the number shifts whenever the
**list itself changes** — new models launch, old ones get delisted — *even if no price
changed.*

| Date | ACPI | Models | Providers |
|------|-----:|-------:|----------:|
| Jun 4 | 2.79 | 315 | 54 |
| Jun 6 | 2.75 | 310 | 54 |
| Jun 9 | 2.83 | 310 | 53 |
| Jun 11 | 2.84 | 308 | 53 |

The model count fell 315 → 308 and providers 54 → 53 over the week. That reshuffling of
the basket is what produced the daily wiggle.

### 2. Providers re-pricing models
Any provider changing a model's price moves the average. This is smaller than basket
churn but real.

### What is NOT moving it
The two "adjustment" constants (`HARDWARE_FLOOR = 0.135`, `P2_SCORE = 74`) are **fixed
values** updated manually on a quarterly/monthly cadence — they are not what's causing
the day-to-day movement.

## Honest caveats (so we're not caught out)

- **Equal weighting means the long tail dominates.** A wave of cheap niche models can
  pull the index around in ways that don't reflect what flagship-model buyers actually
  pay. A usage- or capability-weighted version would be more stable and more meaningful.
- **The "quality factor" is not yet the benchmark score we publish.** Our site
  methodology says quality is standardized HELM benchmark scores; the code currently uses
  a **price-spread proxy** instead. This gap should be closed before we lean on the
  methodology publicly.
- **Hardware-floor and market constants are static**, not live inputs yet.

## Bottom line for the question "why is it moving?"

> The index is an average of every AI model on the market, and that set of models changes
> every day. The number moves mainly because models are constantly being added and removed
> from the basket — and secondarily because providers change their prices. The "quality"
> and "risk" adjustments are currently fixed constants and are **not** what's causing the
> daily movement.

---
*Source: `acpi.py`, `dashboard/data/acpi_history.csv`. History reviewed through 2026-06-11.*
