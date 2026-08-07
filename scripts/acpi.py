#!/usr/bin/env python3
"""
ACPI — AI Compute Price Index calculator.

Fetches live pricing from OpenRouter, applies quality/risk adjustments,
and computes a single blended index value. Writes:

  dashboard/data/acpi_latest.json       — current value (read by dashboard)
  dashboard/data/acpi_history.csv        — append-only historical log
  data/snapshots/prices_YYYYMMDD_HHMMSS.csv — raw model snapshot per run
"""

import csv
import json
import statistics
import sys
from datetime import datetime, timezone
from pathlib import Path

import httpx

from benchmark_quality import get_quality_score

# ── Constants (update these on schedule) ──────────────────────────────────────
HARDWARE_FLOOR = 0.135   # USD/1M tokens — H100 SXM5 market median, update quarterly
P2_SCORE       = 74.0    # Market health 0–100 — update monthly
BLENDED_INPUT  = 0.75    # Input token weight (3:1 input:output, the standard blend)
BLENDED_OUTPUT = 0.25    # Output token weight

# Broad-market weighting: the index is the average of two equally-weighted
# buckets — premium frontier models (Tier S/A) and the commodity long tail
# (Tier B/C) — so the cheaper half of the market pulls on the index as hard as
# the frontier (CPI-style), instead of flagships dominating via a ×10 tier.
PREMIUM_BUCKET_WEIGHT = 0.50   # premium (S/A) share; commodity (B/C) gets the rest

OPENROUTER_URL    = "https://openrouter.ai/api/v1/models"
PRICE_OUTLIER_CAP = 500.0   # Drop models with blended price above this

# Variant SKUs OpenRouter lists as separate catalog entries even though they're
# not independent market entrants (async batch pricing, free-tier mirrors,
# "latest" aliases, etc). Left undeduped, each one is counted as its own
# equal-weighted model and can swing the bucket means on a listing change
# alone, with no underlying provider having repriced anything.
VARIANT_SUFFIXES = (":batch", ":free", ":extended", ":nitro", ":floor")


# ── Tiered weighting ──────────────────────────────────────────────────────────
# ACPI is a tier-weighted average so flagship models pull on the index in
# proportion to their market significance rather than a $0.10 long-tail model
# counting the same as a frontier one. Tier assignment is a MANUAL classification
# (market consensus on flagship vs. niche as of 2026-06) — not derived from an
# external data source — and is reviewed monthly. Disclosed in the methodology.
# Matched on model family keywords so versioned ids (claude-opus-4.8, etc.) tier
# correctly without an exact-id table.
TIER_S_KEYWORDS = (          # frontier flagships → 10x
    "claude-opus", "claude-sonnet",
    "gpt-4o", "gpt-4.1", "gpt-5", "gpt-chat", "/o3", "/o4",
    "grok-4",
)
# Cheap/derivative SKUs that carry a flagship family name but are not flagships
# (mini/nano/lite/flash/image/codex-mini, etc.) — demoted from Tier S to Tier A.
TIER_DEMOTE_KEYWORDS = (
    "mini", "nano", "lite", "flash", "small", "tiny", "-image", "image-",
)
TIER_A_KEYWORDS = (          # strong, non-flagship → 5x
    "claude-haiku", "gemini", "grok-3", "grok-build",
    "deepseek", "mistral-large", "mistral-medium",
    "llama-3.1-405b", "llama-4-maverick", "llama-4",
    "qwen", "kimi", "glm", "minimax", "command",
)
TIER_B_PROVIDERS = {         # any other model from a major lab → 2x
    "openai", "anthropic", "google", "deepseek", "mistralai",
    "meta-llama", "x-ai", "qwen", "cohere", "moonshotai", "z-ai",
}


def get_tier_weight(model_id: str, provider: str) -> int:
    mid = model_id.lower()

    flagship = any(k in mid for k in TIER_S_KEYWORDS) or ("gemini" in mid and "pro" in mid)
    is_derivative = any(k in mid for k in TIER_DEMOTE_KEYWORDS)

    if flagship and not is_derivative:
        return 10
    if flagship or any(k in mid for k in TIER_A_KEYWORDS):
        return 5
    if provider in TIER_B_PROVIDERS:
        return 2
    return 1  # long-tail / niche models

# ── Paths ─────────────────────────────────────────────────────────────────────
ROOT        = Path(__file__).resolve().parent.parent  # repo root (this file lives in scripts/)
DASHBOARD_DATA = ROOT / "dashboard" / "data"
DASHBOARD_DATA.mkdir(parents=True, exist_ok=True)
SNAPSHOT_DIR = ROOT / "data" / "snapshots"
SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)

LATEST_JSON  = DASHBOARD_DATA / "acpi_latest.json"
HISTORY_CSV  = DASHBOARD_DATA / "acpi_history.csv"

HISTORY_FIELDS = [
    "timestamp", "acpi", "model_count", "provider_count",
    "hardware_floor", "p2_score",
    "mean_blended_price", "mean_p3_spread", "mean_quality_adjustment",
]
SNAPSHOT_FIELDS = [
    "timestamp", "provider", "model_id",
    "input_per_million_usd", "output_per_million_usd",
    "blended_per_million_usd", "p3_spread", "risk_adjustment", "adjusted_price",
    "tier_weight", "benchmark_score", "p1",
]
# Screener CSV — same schema as scrape_prices.py so data.ts can read it directly
PRICES_FIELDS = [
    "timestamp", "source", "provider", "model_id", "model_name",
    "context_length", "input_per_million_usd", "output_per_million_usd",
]
PRICES_CSV = DASHBOARD_DATA / "prices.csv"


# ── Fetch ─────────────────────────────────────────────────────────────────────

def fetch_models() -> list[dict]:
    try:
        r = httpx.get(OPENROUTER_URL, timeout=30, follow_redirects=True)
        r.raise_for_status()
        return r.json().get("data", [])
    except Exception as exc:
        print(f"Error fetching OpenRouter API: {exc}", file=sys.stderr)
        sys.exit(1)


def _extract_blended_price(m: dict) -> float | None:
    """USD per 1M blended tokens for a raw OpenRouter model dict, or None if unpriced."""
    pricing = m.get("pricing") or {}
    try:
        # OpenRouter returns prices in USD per token; multiply by 1M for per-1M
        inp = float(pricing.get("prompt") or 0) * 1_000_000
        out = float(pricing.get("completion") or 0) * 1_000_000
    except (TypeError, ValueError):
        return None
    if inp <= 0 or out <= 0:
        return None
    return inp * BLENDED_INPUT + out * BLENDED_OUTPUT


def get_base_model_id(model_id: str) -> str:
    """Maps a variant SKU id back to its base model id (see VARIANT_SUFFIXES)."""
    for suffix in VARIANT_SUFFIXES:
        if model_id.endswith(suffix):
            return model_id[: -len(suffix)]
    return model_id.lstrip("~")


def deduplicate_models(models: list[dict]) -> tuple[list[dict], int]:
    """Collapses variant SKUs (batch/free/alias/...) onto their base model id.
    The bare (no-suffix) listing — standard synchronous pricing, what the
    methodology actually prices — wins whenever it's present in the group;
    batch/nitro/floor variants are consistently discounted off that price and
    would otherwise silently re-price the model to a rate nobody pays for
    normal usage. Falls back to the cheapest priced variant only when no bare
    listing exists (pure ~alias-only entries). Returns (models, count_removed)."""
    canonical: dict[str, dict] = {}
    for m in models:
        model_id = m.get("id", "")
        base_id = get_base_model_id(model_id)
        price = _extract_blended_price(m)
        existing = canonical.get(base_id)

        if existing is None:
            canonical[base_id] = m
            continue

        is_bare = model_id == base_id
        existing_is_bare = existing.get("id", "") == base_id

        if is_bare and not existing_is_bare and price is not None:
            canonical[base_id] = m
        elif not is_bare and existing_is_bare:
            continue  # bare listing already canonical, never displaced by a variant
        else:
            existing_price = _extract_blended_price(existing)
            if price is not None and (existing_price is None or price < existing_price):
                canonical[base_id] = m
    return list(canonical.values()), len(models) - len(canonical)


# ── Compute ───────────────────────────────────────────────────────────────────

def compute_acpi(models: list[dict]) -> tuple[dict, list[dict]]:
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    rows: list[dict] = []

    for m in models:
        blended = _extract_blended_price(m)
        if blended is None:
            continue

        if blended > PRICE_OUTLIER_CAP:
            continue

        pricing = m.get("pricing") or {}
        inp = float(pricing.get("prompt") or 0) * 1_000_000
        out = float(pricing.get("completion") or 0) * 1_000_000

        model_id = m.get("id", "")
        provider = model_id.split("/")[0] if "/" in model_id else ""

        # Markup over the hardware floor — kept as a reported diagnostic only.
        # It used to masquerade as the "quality" factor (the price-spread proxy);
        # quality is now sourced from real benchmarks, see below.
        p3_spread = blended / HARDWARE_FLOOR

        # Market-risk factor (P2): a market-health scalar applied to every price.
        risk_adjustment = 0.5 + (P2_SCORE / 100)
        adj_price       = blended * risk_adjustment

        # Quality factor: HELM-aligned benchmark composite (z-normalised), or None
        # when no benchmark data exists for this model. None → excluded from the
        # P1 intelligence-per-dollar screener, but the model keeps its price in
        # the ACPI index.
        quality = get_quality_score(model_id)
        p1 = round((quality / blended) * 10, 6) if quality is not None else None

        rows.append({
            "timestamp":               ts,
            "provider":                provider,
            "model_id":                model_id,
            "model_name":              m.get("name", ""),
            "context_length":          m.get("context_length", ""),
            "input_per_million_usd":   round(inp, 6),
            "output_per_million_usd":  round(out, 6),
            "blended_per_million_usd": round(blended, 6),
            "p3_spread":               round(p3_spread, 4),
            "risk_adjustment":         round(risk_adjustment, 6),
            "adjusted_price":          round(adj_price, 6),
            "tier_weight":             get_tier_weight(model_id, provider),
            "benchmark_score":         round(quality, 6) if quality is not None else None,
            "p1":                      p1,
        })

    if not rows:
        print("No valid models after filtering.", file=sys.stderr)
        sys.exit(1)

    # Two-bucket broad-market average of the risk-adjusted price → published ACPI.
    # Premium = Tier S/A (weight >= 5); commodity = Tier B/C (weight < 5). Each
    # bucket is equal-weighted internally, then the buckets are combined 50/50 so
    # the commodity half of the market is not drowned out by expensive flagships.
    premium   = [r["adjusted_price"] for r in rows if r["tier_weight"] >= 5]
    commodity = [r["adjusted_price"] for r in rows if r["tier_weight"] <  5]

    if premium and commodity:
        acpi_val = (PREMIUM_BUCKET_WEIGHT * statistics.mean(premium)
                    + (1 - PREMIUM_BUCKET_WEIGHT) * statistics.mean(commodity))
    else:  # degenerate: one bucket empty → fall back to whatever we have
        acpi_val = statistics.mean(premium or commodity)

    providers = {r["provider"] for r in rows if r["provider"]}
    scored    = [r for r in rows if r["p1"] is not None]

    result = {
        "acpi":           round(acpi_val, 4),
        "computed_at":    ts,
        "model_count":    len(rows),
        "provider_count": len(providers),
        "weighting":      "bucket-5050",
        "buckets": {
            "premium_weight":    PREMIUM_BUCKET_WEIGHT,
            "premium_count":     len(premium),
            "premium_mean":      round(statistics.mean(premium), 4) if premium else None,
            "commodity_count":   len(commodity),
            "commodity_mean":    round(statistics.mean(commodity), 4) if commodity else None,
        },
        "hardware_floor": HARDWARE_FLOOR,
        "p2_score":       P2_SCORE,
        "components": {
            "mean_blended_price":      round(statistics.mean(r["blended_per_million_usd"] for r in rows), 4),
            "mean_p3_spread":          round(statistics.mean(r["p3_spread"] for r in rows), 4),
            "mean_quality_adjustment": round(statistics.mean(r["risk_adjustment"] for r in rows), 6),
        },
        "screener": {
            "scored_model_count":  len(scored),
            "mean_benchmark_score": round(statistics.mean(r["benchmark_score"] for r in scored), 6) if scored else None,
            "mean_p1":              round(statistics.mean(r["p1"] for r in scored), 6) if scored else None,
        },
    }
    return result, rows


# ── Write ─────────────────────────────────────────────────────────────────────

def write_latest_json(result: dict) -> None:
    LATEST_JSON.write_text(json.dumps(result, indent=2), encoding="utf-8")


def append_history(result: dict) -> None:
    write_header = not HISTORY_CSV.exists()
    with HISTORY_CSV.open("a", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=HISTORY_FIELDS)
        if write_header:
            w.writeheader()
        w.writerow({
            "timestamp":               result["computed_at"],
            "acpi":                    result["acpi"],
            "model_count":             result["model_count"],
            "provider_count":          result["provider_count"],
            "hardware_floor":          result["hardware_floor"],
            "p2_score":                result["p2_score"],
            "mean_blended_price":      result["components"]["mean_blended_price"],
            "mean_p3_spread":          result["components"]["mean_p3_spread"],
            "mean_quality_adjustment": result["components"]["mean_quality_adjustment"],
        })


def write_prices_csv(rows: list[dict]) -> None:
    with PRICES_CSV.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=PRICES_FIELDS, extrasaction="ignore")
        w.writeheader()
        for r in rows:
            w.writerow({**r, "source": "openrouter"})


def write_snapshot(rows: list[dict], ts: str) -> Path:
    ts_clean = ts.replace(":", "").replace("-", "").replace("T", "_").replace("Z", "")
    snap_path = SNAPSHOT_DIR / f"prices_{ts_clean}.csv"
    with snap_path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=SNAPSHOT_FIELDS, extrasaction="ignore")
        w.writeheader()
        w.writerows(rows)
    return snap_path


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    print("Fetching OpenRouter model pricing...")
    models = fetch_models()
    print(f"  {len(models)} models received")

    models, duplicates_removed = deduplicate_models(models)
    print(f"  {duplicates_removed} variant listings deduplicated (batch/free/alias SKUs)")

    print("Computing ACPI...")
    result, rows = compute_acpi(models)
    result["deduped_variants_removed"] = duplicates_removed

    print("Writing output files...")
    write_latest_json(result)
    append_history(result)
    write_prices_csv(rows)
    snap = write_snapshot(rows, result["computed_at"])

    print(f"\nACPI  = ${result['acpi']:.4f} / 1M SCU  ({result['weighting']}-weighted)")
    print(f"Models: {result['model_count']}  |  Providers: {result['provider_count']}")
    print(f"P1 screener: {result['screener']['scored_model_count']} models with benchmark data")
    print(f"Time  : {result['computed_at']}")
    print(f"\nWrote:")
    print(f"  {LATEST_JSON}")
    print(f"  {HISTORY_CSV}")
    print(f"  {PRICES_CSV}  ({len(rows)} models — screener)")
    print(f"  {snap}")


if __name__ == "__main__":
    main()
