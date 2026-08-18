#!/usr/bin/env python3
"""
Calculator price export — a cleaned, deduplicated cut of the model price feed.

`acpi.py` already writes dashboard/data/prices.csv: every priced model in the
OpenRouter catalog, with the index's variant-SKU deduplication applied. That is
the right feed for the screener (show everything), but the wrong one for a cost
calculator, which needs a short, unambiguous list of things a buyer can
actually choose between. This script produces that cut:

  * normalised ids   — `~anthropic/claude-x` and `openai/gpt-5:batch` collapse
                       to their base model, so no alias or batch-priced SKU
                       shows up as its own line in a cost comparison
  * major providers  — the raw catalog spans ~57 providers, most of them
                       single-model fine-tunes and roleplay hosts; see
                       APPROVED_PROVIDERS
  * a blended price  — the same 75/25 input:output blend the index is built on,
                       precomputed so the frontend doesn't re-derive it
  * one row per model

Reads   dashboard/data/prices.csv          (written by acpi.py — run that first)
Writes  dashboard/data/prices_latest.csv

Usage:
    python scripts/acpi.py
    python scripts/export_prices.py
"""

import csv
import sys
from pathlib import Path

# Blend weights and the outlier cap are imported rather than redeclared so this
# export can never drift from the published index methodology.
from acpi import (
    BLENDED_INPUT,
    BLENDED_OUTPUT,
    PRICE_OUTLIER_CAP,
    VARIANT_SUFFIXES,
)

# ── Paths ─────────────────────────────────────────────────────────────────────
ROOT           = Path(__file__).resolve().parent.parent
DASHBOARD_DATA = ROOT / "dashboard" / "data"
SOURCE_CSV     = DASHBOARD_DATA / "prices.csv"
OUTPUT_CSV     = DASHBOARD_DATA / "prices_latest.csv"

OUTPUT_FIELDS = [
    "model_id", "model_name", "provider",
    "input_per_million_usd", "output_per_million_usd",
    "blended_per_million_usd", "context_length", "last_updated",
    "benchmark_score", "p1",
]

# Providers the calculator compares. Deliberately curated rather than
# exhaustive: a cost comparison across all 57 catalog providers is noise, not
# coverage. Add or remove a provider here to change what the calculator shows.
APPROVED_PROVIDERS = {
    "openai", "anthropic", "google", "meta-llama", "meta",
    "mistralai", "deepseek", "x-ai", "qwen", "amazon",
    "cohere", "microsoft", "moonshotai", "z-ai", "minimax",
    "nvidia", "perplexity", "ai21",
}


# ── Normalisation ─────────────────────────────────────────────────────────────

def normalize_model_id(model_id: str) -> str:
    """Strip alias prefix and variant suffix: `~openai/gpt-5:batch` → `openai/gpt-5`.

    acpi.py's `get_base_model_id` handles one or the other; the calculator needs
    both stripped so the id it displays is the id a buyer would recognise.
    """
    mid = model_id.strip().lstrip("~")
    for suffix in VARIANT_SUFFIXES:
        if mid.endswith(suffix):
            return mid[: -len(suffix)]
    return mid


def blended_price(input_usd: float, output_usd: float) -> float:
    """USD per 1M blended tokens — the index's 3:1 input:output assumption."""
    return input_usd * BLENDED_INPUT + output_usd * BLENDED_OUTPUT


def parse_optional_float(raw) -> float | None:
    """Empty/missing → None (no benchmark data), distinct from a real 0.0 score."""
    if raw is None or str(raw).strip() == "":
        return None
    try:
        return float(raw)
    except (TypeError, ValueError):
        return None


# ── Clean ─────────────────────────────────────────────────────────────────────

def clean_rows(records: list[dict]) -> tuple[list[dict], dict[str, int]]:
    """Filter, normalise and deduplicate raw price rows.

    Returns (rows sorted cheapest-first, drop counts by reason).
    """
    kept: dict[str, dict] = {}
    dropped = {"unpriced": 0, "outlier": 0, "provider": 0, "duplicate": 0}

    for r in records:
        try:
            inp = float(r.get("input_per_million_usd") or 0)
            out = float(r.get("output_per_million_usd") or 0)
        except (TypeError, ValueError):
            dropped["unpriced"] += 1
            continue

        # A model priced at zero on either side is a free-tier or unpriced
        # listing, not a $0 product — including it would sink every comparison.
        if inp <= 0 or out <= 0:
            dropped["unpriced"] += 1
            continue

        blended = blended_price(inp, out)
        if blended > PRICE_OUTLIER_CAP:
            dropped["outlier"] += 1
            continue

        raw_id = (r.get("model_id") or "").strip()
        model_id = normalize_model_id(raw_id)
        if not model_id or "/" not in model_id:
            dropped["provider"] += 1
            continue

        provider = model_id.split("/")[0]
        if provider not in APPROVED_PROVIDERS:
            dropped["provider"] += 1
            continue

        row = {
            "model_id":                model_id,
            "model_name":              (r.get("model_name") or model_id).strip(),
            "provider":                provider,
            "input_per_million_usd":   round(inp, 6),
            "output_per_million_usd":  round(out, 6),
            "blended_per_million_usd": round(blended, 6),
            "context_length":          (r.get("context_length") or "").strip(),
            "last_updated":            (r.get("timestamp") or "").strip(),
            "benchmark_score":         parse_optional_float(r.get("benchmark_score")),
            "p1":                      parse_optional_float(r.get("p1")),
            "_is_bare":                raw_id == model_id,
        }

        existing = kept.get(model_id)
        if existing is None:
            kept[model_id] = row
            continue

        dropped["duplicate"] += 1
        # Same tie-break as acpi.py's deduplication: the bare listing is the
        # standard synchronous price, so it wins over any alias/batch variant.
        # Only when neither is bare do we fall back to the cheaper of the two.
        if row["_is_bare"] and not existing["_is_bare"]:
            kept[model_id] = row
        elif row["_is_bare"] == existing["_is_bare"] and (
            row["blended_per_million_usd"] < existing["blended_per_million_usd"]
        ):
            kept[model_id] = row

    rows = sorted(kept.values(), key=lambda r: r["blended_per_million_usd"])
    return rows, dropped


# ── IO ────────────────────────────────────────────────────────────────────────

def read_source() -> list[dict]:
    if not SOURCE_CSV.exists():
        print(
            f"Source not found: {SOURCE_CSV}\n"
            f"Run `python scripts/acpi.py` first — it writes this file.",
            file=sys.stderr,
        )
        sys.exit(1)
    with SOURCE_CSV.open(newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def write_output(rows: list[dict]) -> None:
    with OUTPUT_CSV.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=OUTPUT_FIELDS, extrasaction="ignore")
        w.writeheader()
        w.writerows(rows)


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    records = read_source()
    print(f"Read {len(records)} rows from {SOURCE_CSV.name}")

    rows, dropped = clean_rows(records)
    if not rows:
        print("No models survived filtering — refusing to write an empty export.", file=sys.stderr)
        sys.exit(1)

    write_output(rows)

    providers = {r["provider"] for r in rows}
    print(
        f"  dropped: {dropped['unpriced']} unpriced, {dropped['outlier']} outlier, "
        f"{dropped['provider']} off-list provider, {dropped['duplicate']} duplicate"
    )
    print(f"\nWrote {OUTPUT_CSV}")
    print(f"  {len(rows)} models across {len(providers)} providers")
    print(f"  cheapest: {rows[0]['model_id']} @ ${rows[0]['blended_per_million_usd']:.4f}/1M blended")
    print(f"  dearest : {rows[-1]['model_id']} @ ${rows[-1]['blended_per_million_usd']:.4f}/1M blended")


if __name__ == "__main__":
    main()
