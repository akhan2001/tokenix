#!/usr/bin/env python3
"""
Benchmark-based quality factor for ACPI.

Replaces the old price-spread proxy (which inferred "quality" from how far a
model's price sat above the hardware floor — not a quality signal at all) with a
real, HELM-aligned benchmark composite.

Source: the OpenEvals aggregated leaderboard dataset on Hugging Face, a single
Parquet file combining official benchmark runs (MMLU-Pro, GPQA, coding/SWE,
math) into one queryable table. This is the practical, programmatically
accessible equivalent of "HELM scores" for our purposes — documented publicly as
a "HELM-aligned benchmark composite, sourced via standardized leaderboard
aggregation".

What this module exposes:

  get_quality_score(model_id) -> float | None
      z-normalised benchmark composite for an OpenRouter model id, or None when
      no benchmark data exists for that model. None means "exclude from the P1
      intelligence-per-dollar screener" — the model still keeps its price in the
      published ACPI index.

Design notes vs. the original spec:
  * The live dataset's columns are not literally `mmlu_score / humaneval_score /
    math_score / ifeval_score` (the schema the spec guessed at). We map the real
    columns into four benchmark categories and weight them. See CATEGORIES.
  * Coverage is sparse — many models report only one benchmark. Per model we
    z-score each available column, average within a category, then take a
    coverage-weighted average across whatever categories that model has. A model
    with zero category coverage returns None rather than a fabricated score.
  * Fetch is via httpx (already a project dep) into memory, so we do not pull in
    huggingface_hub / fsspec / aiohttp. Cached in-process with a weekly TTL and
    degrades gracefully: if the fetch fails, every model simply gets None and
    the ACPI price index still computes.
"""

from __future__ import annotations

import io
import re
import sys
import time

import httpx

try:
    import pandas as pd
except ImportError:  # pragma: no cover - pandas is required for quality scoring
    pd = None  # type: ignore

# Direct resolve URL for the single Parquet file (LFS-backed, redirects to CDN).
# Read straight into memory with httpx so we avoid the hf:// fsspec stack.
DATASET_URL = (
    "https://huggingface.co/datasets/OpenEvals/leaderboard-data/"
    "resolve/main/data/train-00000-of-00001.parquet"
)

# Benchmark categories → real columns in the dataset, with category weights.
# Mirrors the original 0.30 / 0.25 / 0.25 / 0.20 (knowledge / coding / math /
# reasoning) structure, mapped onto the columns that actually exist. Weights are
# renormalised per model over whichever categories that model has data for.
CATEGORIES: dict[str, tuple[float, list[str]]] = {
    "knowledge": (0.30, ["mmluPro_score"]),
    "coding":    (0.25, ["sweVerified_score", "swePro_score", "terminalBench_score"]),
    "math":      (0.25, ["gsm8k_score", "aime2026_score", "hmmt2026_score"]),
    "reasoning": (0.20, ["gpqa_score", "hle_score"]),
}

ALL_BENCHMARK_COLS = [c for _, cols in CATEGORIES.values() for c in cols]

# Explicit OpenRouter-id → HF-model_name overrides for cases the normalised
# slug matcher can't catch on its own. Extend this on every new model launch —
# it is ongoing maintenance, not a one-time fix. Verify HF naming on the pull.
MODEL_ID_MAP: dict[str, str] = {
    # "openai/gpt-4o": "openai/gpt-4o",
    # "anthropic/claude-sonnet-4.6": "anthropic/claude-3.5-sonnet",
    "deepseek/deepseek-v3": "deepseek-ai/DeepSeek-V3",
    "deepseek/deepseek-r1": "deepseek-ai/DeepSeek-R1",
    "meta-llama/llama-3.1-405b-instruct": "meta-llama/Llama-3.1-405B",
}

CACHE_TTL_SECONDS = 7 * 24 * 60 * 60  # benchmark scores don't move daily
_cache: dict[str, object] = {"lookup": None, "fetched_at": 0.0}


# ── Matching ──────────────────────────────────────────────────────────────────

def _slug(name: str) -> str:
    """Normalise a model id/name to a comparable slug.

    Takes the part after the last '/', lowercases it, and strips everything but
    a-z0-9. 'deepseek-ai/DeepSeek-V3' and 'deepseek/deepseek-v3' both collapse
    to 'deepseekv3'.
    """
    tail = name.rsplit("/", 1)[-1]
    return re.sub(r"[^a-z0-9]", "", tail.lower())


# ── Load + normalise ──────────────────────────────────────────────────────────

def _z_score(series: "pd.Series") -> "pd.Series":
    std = series.std()
    if not std or pd.isna(std):
        # No spread (or single value) → everyone is average on this column.
        return series.apply(lambda v: 0.0 if pd.notna(v) else v)
    return (series - series.mean()) / std


def _build_lookup() -> dict[str, float]:
    """Fetch the dataset and return {hf_slug: benchmark_score}."""
    if pd is None:
        raise RuntimeError("pandas is required for benchmark quality scoring")

    resp = httpx.get(DATASET_URL, timeout=60, follow_redirects=True)
    resp.raise_for_status()
    df = pd.read_parquet(io.BytesIO(resp.content))

    present = [c for c in ALL_BENCHMARK_COLS if c in df.columns]
    if not present:
        raise RuntimeError(
            f"benchmark dataset schema changed; none of {ALL_BENCHMARK_COLS} present"
        )

    # z-score each available benchmark column over the models that report it.
    z = {col: _z_score(df[col]) for col in present}

    lookup: dict[str, float] = {}
    for idx, row in df.iterrows():
        weighted_sum = 0.0
        weight_total = 0.0
        for cat, (cat_weight, cols) in CATEGORIES.items():
            cat_cols = [c for c in cols if c in z and pd.notna(row[c])]
            if not cat_cols:
                continue
            cat_z = sum(z[c].iloc[idx] for c in cat_cols) / len(cat_cols)
            weighted_sum += cat_weight * cat_z
            weight_total += cat_weight

        if weight_total == 0:
            continue  # no benchmark data for this model → no quality score

        score = weighted_sum / weight_total
        name = row.get("model_name") or row.get("model_id") or ""
        if name:
            lookup[_slug(str(name))] = float(score)

    return lookup


def load_and_normalize_benchmark_data() -> dict[str, float]:
    """Return {hf_slug: benchmark_score}, cached weekly. Empty dict on failure.

    Failure is non-fatal: an empty lookup means every model gets quality None,
    so the ACPI price index still computes — it just has no P1 screener layer
    for this run.
    """
    cached = _cache["lookup"]
    if cached is not None and (time.time() - float(_cache["fetched_at"])) < CACHE_TTL_SECONDS:
        return cached  # type: ignore[return-value]

    try:
        lookup = _build_lookup()
    except Exception as exc:  # network / schema / parse — degrade gracefully
        print(f"  [quality] benchmark data unavailable: {exc}", file=sys.stderr)
        lookup = {}

    _cache["lookup"] = lookup
    _cache["fetched_at"] = time.time()
    return lookup


# ── Public API ────────────────────────────────────────────────────────────────

def get_quality_score(model_id: str) -> float | None:
    """z-normalised benchmark composite for an OpenRouter model id, or None."""
    lookup = load_and_normalize_benchmark_data()
    if not lookup:
        return None

    mapped = MODEL_ID_MAP.get(model_id)
    if mapped is not None:
        return lookup.get(_slug(mapped))

    return lookup.get(_slug(model_id))


if __name__ == "__main__":
    data = load_and_normalize_benchmark_data()
    print(f"loaded {len(data)} benchmark-scored models")
    for slug, score in sorted(data.items(), key=lambda kv: kv[1], reverse=True)[:15]:
        print(f"  {score:+.3f}  {slug}")
