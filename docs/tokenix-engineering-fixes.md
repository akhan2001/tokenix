tokenix# Tokenix — ACPI Engineering Fixes

**For: Engineering implementation**
**From: Hussain**
**Re: Two gaps identified in the current acpi.py implementation**

---

## Context

The current build (reviewed via the June 2026 internal one-pager) has two gaps between
what the methodology claims and what the code actually does:

1. **Quality factor** — methodology says HELM benchmark scores, code uses a price-spread proxy
2. **Model weighting** — currently equal-weighted across all 308 models, meaning a $0.10/1M
   long-tail model counts identically to GPT-4o or Claude Opus

Both are fixable now. This document gives the data source, the math, and the drop-in code
for each. Priority order: fix quality factor first (credibility gap, not just accuracy),
then ship tiered weighting (quick win, no new data dependency).

---

# PART 1 — Quality Factor: Replacing the Price-Spread Proxy

### The honest finding

There is no single clean "HELM API" that returns per-model benchmark scores on demand.
Stanford HELM (crfm.stanford.edu/helm) is a research framework, not a developer API.
Scale AI's SEAL leaderboards are excellent but not built for bulk programmatic pull.

The actually-buildable path is Hugging Face's aggregated leaderboard dataset, which
combines official benchmark scores (MMLU, coding evals, math evals, instruction-following)
into one queryable Parquet file. This is the practical equivalent of "HELM scores" for
our purposes — standardised, sourced from official benchmark runs, programmatically
accessible.

Decision: use this as the V1 quality data source. Document it publicly as "HELM-aligned
benchmark composite, sourced via standardized leaderboard aggregation" — more accurate
than claiming raw Stanford HELM, and equally defensible.

### Data source

```python
import pandas as pd

df = pd.read_parquet(
    "hf://datasets/OpenEvals/leaderboard-data/data/train-00000-of-00001.parquet"
)

# Relevant columns (verify exact names on pull -- schema may shift):
# model_name, provider, mmlu_score (or mmluPro_score),
# humaneval_score (or equivalent coding score), math_score,
# ifeval_score (or instruction_following_score)
```

For models missing from the aggregated dataset, fall back to per-model lookup:
```python
from huggingface_hub import HfApi
api = HfApi()
info = api.model_info(model_id, expand=["evalResults"])
```

If still no data exists for a model — exclude it from the P1 screener but keep it in
the published ACPI price index. A model with no benchmark data can still have a price;
it just can't get a quality score until benchmark data exists for it. Do not fabricate
or estimate a score to fill the gap.

### Normalisation (unchanged from existing methodology)

```python
def z_score_normalize(series):
    return (series - series.mean()) / series.std()

df['mmlu_z']      = z_score_normalize(df['mmlu_score'])
df['humaneval_z'] = z_score_normalize(df['humaneval_score'])
df['math_z']      = z_score_normalize(df['math_score'])
df['ifeval_z']    = z_score_normalize(df['ifeval_score'])

df['benchmark_score'] = (
    df['mmlu_z']      * 0.30 +
    df['humaneval_z'] * 0.25 +
    df['math_z']      * 0.25 +
    df['ifeval_z']    * 0.20
)
```

### Wiring into acpi.py — replace the placeholder

Remove:
```python
def get_quality_score(model):
    return price_spread_proxy(model)  # <-- the gap
```

Replace with:
```python
BENCHMARK_DF = load_and_normalize_benchmark_data()  # cached, see below

def get_quality_score(model_id):
    row = BENCHMARK_DF[BENCHMARK_DF['model_name'] == model_id]
    if row.empty:
        return None  # no data -- exclude from P1, keep in ACPI
    return float(row['benchmark_score'].iloc[0])

def get_p1(model_id, blended_price):
    quality = get_quality_score(model_id)
    if quality is None:
        return None
    return (quality / blended_price) * 10
```

Model ID mapping (the real maintenance burden): OpenRouter's IDs ("openai/gpt-4o")
won't match Hugging Face's model_name field exactly. Build and maintain a mapping table:

```python
MODEL_ID_MAP = {
    "openai/gpt-4o": "gpt-4o",
    "anthropic/claude-sonnet-4.6": "claude-3.5-sonnet",  # verify actual HF naming
    # extend on every new model launch
}
```

Budget ongoing time for this — it's not a one-time fix, it needs updating every time a
new model launches on either side.

### Refresh cadence

Benchmark scores don't move daily like prices do. Cache with a weekly TTL:

```python
import time

_cache = {"data": None, "fetched_at": 0}
CACHE_TTL_SECONDS = 7 * 24 * 60 * 60  # 1 week

def load_and_normalize_benchmark_data():
    if _cache["data"] is not None and (time.time() - _cache["fetched_at"]) < CACHE_TTL_SECONDS:
        return _cache["data"]
    df = pd.read_parquet("hf://datasets/OpenEvals/leaderboard-data/data/train-00000-of-00001.parquet")
    df = normalize(df)
    _cache["data"] = df
    _cache["fetched_at"] = time.time()
    return df
```

---

# PART 2 — Model Weighting: From Equal-Weight to Tiered

### The problem

Current state: ACPI is an equal-weighted average across all 308 tracked models. A
$0.10/1M long-tail model counts exactly as much as GPT-4o or Claude Opus. This is why
the index moves mainly because the basket changes (models added/removed) rather than
because real market prices change — the long tail dominates and dilutes the signal
flagship buyers actually care about.

### The fix — tiered weighting (ship this first, no new data source needed)

```python
def get_tier_weight(model_id, provider):
    TIER_S = {
        "gpt-4o", "claude-opus", "claude-sonnet",
        "gemini-2.5-pro", "gemini-3-pro",
    }
    TIER_A = {
        "deepseek-v3", "mistral-large",
        "llama-3.1-405b", "grok-2",
    }
    TIER_B_PROVIDERS = {
        "openai", "anthropic", "google",
        "deepseek", "mistral", "meta", "xai",
    }

    if model_id in TIER_S:
        return 10
    elif model_id in TIER_A:
        return 5
    elif provider in TIER_B_PROVIDERS:
        return 2
    else:
        return 1  # long-tail / niche models
```

Wiring into the ACPI calculation:

```python
weighted_sum = sum(
    price[i] * get_tier_weight(model[i], provider[i])
    for i in models
)
weight_total = sum(
    get_tier_weight(model[i], provider[i])
    for i in models
)
ACPI = weighted_sum / weight_total
```

### What this changes — concretely

```
                          Today (equal weight)   After (tiered weight)
GPT-4o weight                      1                      10
Random $0.10 model weight          1                      1
GPT-4o's influence on ACPI       0.32%                  ~3.1%
```

GPT-4o's pull on the index goes from negligible to proportionate to its actual market
significance. The index starts reflecting what flagship buyers pay, not just whatever
happens to be listed that day.

### Important — document the judgment call

Tier assignment (which models go in Tier S vs A vs the provider list) is a manual
classification decision. This must be disclosed in the methodology doc — it is not
derived from an external data source the way usage-weighting would be. State plainly:
"Tier assignment reflects [date]'s market consensus on flagship vs. niche models and is
reviewed [monthly/quarterly]."

### The roadmap after this (don't build now, just know the path)

```
Tiered weighting (this week)
  -> no new data source, fixes the worst distortion immediately

Provider revenue weighting (this month)
  -> Weight_i = Provider_ARR_i / Sum(Provider_ARR)
  -> mirrors S&P 500 market-cap weighting
  -> requires sourcing public revenue estimates (imprecise for private labs)

Usage weighting (V2 -- requires design partners)
  -> Weight_i = Actual_API_Calls_i / Sum(Actual_API_Calls)
  -> the real fix -- Ornn's equivalent of moving to HydraHost's actual transaction data
  -> not buildable until design partners share real usage data
```

---

# PART 3 — Update the Methodology Doc Once Both Ship

Replace this line in the one-pager:
"Our methodology says quality is standardised HELM benchmark scores. The code
currently uses a price-spread proxy instead. This gap must be closed before we
lean on the methodology publicly."

With:
"Quality is computed from a HELM-aligned benchmark composite (MMLU, coding, math,
instruction-following), sourced via standardized leaderboard aggregation and z-score
normalised. Models without available benchmark data are excluded from the P1 screener
but remain in the published ACPI price index."

Replace this line:
"ACPI is an equal-weighted average of the whole list. A $0.10 long-tail model counts
exactly as much as GPT-4o or Claude Opus."

With:
"ACPI uses tiered weighting — frontier models (Tier S) are weighted 10x relative to
long-tail models (Tier C), reflecting actual market significance. Tier assignments
are reviewed monthly and disclosed in full in the methodology appendix."

---

# Known Limitations After Both Fixes (disclose, don't hide)

- Benchmark aggregation quality depends on the upstream dataset staying current —
  a new model launch may have a temporary gap before benchmark data is available.
- The model ID mapping table (OpenRouter to Hugging Face naming) is manually maintained
  and needs updates on every new model launch — ongoing work, not one-time.
- "HELM-aligned" via aggregated sources is not identical to running Stanford's actual
  HELM suite directly — a reasonable, common simplification, but state it plainly if asked.
- Tier weighting is a manual classification, not derived from external market data —
  the next refinement (provider revenue weighting) closes that gap partially; usage
  weighting closes it fully but requires design partner data we don't have yet.

---

Priority order to execute:
1. Quality factor fix — credibility risk if discovered as-is, fix before any investor sees the code
2. Tiered weighting — quick win, ships this week, no new dependency
3. Update methodology doc to match what's actually running
4. Provider revenue weighting — next refinement, sourced from public data
5. Usage weighting — V2, once design partners are providing real usage data
