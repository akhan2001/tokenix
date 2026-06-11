#!/usr/bin/env python3
"""
ACPI — AI Compute Price Index calculator.

Fetches live pricing from OpenRouter, applies quality/risk adjustments,
and computes a single blended index value. Writes:

  dashboard/data/acpi_latest.json  — current value (read by dashboard)
  dashboard/data/acpi_history.csv  — append-only historical log
  prices_YYYYMMDD_HHMMSS.csv       — raw model snapshot per run (repo root)
"""

import csv
import json
import math
import statistics
import sys
from datetime import datetime, timezone
from pathlib import Path

import httpx

# ── Constants (update these on schedule) ──────────────────────────────────────
HARDWARE_FLOOR = 0.135   # USD/1M tokens — H100 SXM5 market median, update quarterly
P2_SCORE       = 74.0    # Market health 0–100 — update monthly
BLENDED_INPUT  = 0.25    # Input token weight
BLENDED_OUTPUT = 0.75    # Output token weight

OPENROUTER_URL    = "https://openrouter.ai/api/v1/models"
PRICE_OUTLIER_CAP = 500.0   # Drop models with blended price above this

# ── Paths ─────────────────────────────────────────────────────────────────────
ROOT        = Path(__file__).parent
DASHBOARD_DATA = ROOT / "dashboard" / "data"
DASHBOARD_DATA.mkdir(parents=True, exist_ok=True)

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
    "blended_per_million_usd", "p3_spread", "quality_adjustment", "adjusted_price",
]


# ── Fetch ─────────────────────────────────────────────────────────────────────

def fetch_models() -> list[dict]:
    try:
        r = httpx.get(OPENROUTER_URL, timeout=30, follow_redirects=True)
        r.raise_for_status()
        return r.json().get("data", [])
    except Exception as exc:
        print(f"Error fetching OpenRouter API: {exc}", file=sys.stderr)
        sys.exit(1)


# ── Compute ───────────────────────────────────────────────────────────────────

def compute_acpi(models: list[dict]) -> tuple[dict, list[dict]]:
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    rows: list[dict] = []

    for m in models:
        pricing = m.get("pricing") or {}
        try:
            # OpenRouter returns prices in USD per token; multiply by 1M for per-1M
            inp = float(pricing.get("prompt") or 0) * 1_000_000
            out = float(pricing.get("completion") or 0) * 1_000_000
        except (TypeError, ValueError):
            continue

        if inp <= 0 or out <= 0:
            continue

        blended = inp * BLENDED_INPUT + out * BLENDED_OUTPUT

        if blended > PRICE_OUTLIER_CAP:
            continue

        p3_spread     = blended / HARDWARE_FLOOR
        p3_adjustment = 1.0 / math.log(min(p3_spread, 50) + 1)
        p2_adjustment = 0.5 + (P2_SCORE / 100)
        quality_score = p2_adjustment * p3_adjustment
        adj_price     = blended * quality_score

        model_id = m.get("id", "")
        provider = model_id.split("/")[0] if "/" in model_id else ""

        rows.append({
            "timestamp":               ts,
            "provider":                provider,
            "model_id":                model_id,
            "input_per_million_usd":   round(inp, 6),
            "output_per_million_usd":  round(out, 6),
            "blended_per_million_usd": round(blended, 6),
            "p3_spread":               round(p3_spread, 4),
            "quality_adjustment":      round(quality_score, 6),
            "adjusted_price":          round(adj_price, 6),
        })

    if not rows:
        print("No valid models after filtering.", file=sys.stderr)
        sys.exit(1)

    acpi_val  = statistics.mean(r["adjusted_price"] for r in rows)
    providers = {r["provider"] for r in rows if r["provider"]}

    result = {
        "acpi":           round(acpi_val, 4),
        "computed_at":    ts,
        "model_count":    len(rows),
        "provider_count": len(providers),
        "hardware_floor": HARDWARE_FLOOR,
        "p2_score":       P2_SCORE,
        "components": {
            "mean_blended_price":      round(statistics.mean(r["blended_per_million_usd"] for r in rows), 4),
            "mean_p3_spread":          round(statistics.mean(r["p3_spread"] for r in rows), 4),
            "mean_quality_adjustment": round(statistics.mean(r["quality_adjustment"] for r in rows), 6),
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


def write_snapshot(rows: list[dict], ts: str) -> Path:
    ts_clean = ts.replace(":", "").replace("-", "").replace("T", "_").replace("Z", "")
    snap_path = ROOT / f"prices_{ts_clean}.csv"
    with snap_path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=SNAPSHOT_FIELDS)
        w.writeheader()
        w.writerows(rows)
    return snap_path


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    print("Fetching OpenRouter model pricing...")
    models = fetch_models()
    print(f"  {len(models)} models received")

    print("Computing ACPI...")
    result, rows = compute_acpi(models)

    print("Writing output files...")
    write_latest_json(result)
    append_history(result)
    snap = write_snapshot(rows, result["computed_at"])

    print(f"\nACPI  = ${result['acpi']:.4f} / 1M SCU")
    print(f"Models: {result['model_count']}  |  Providers: {result['provider_count']}")
    print(f"Time  : {result['computed_at']}")
    print(f"\nWrote:")
    print(f"  {LATEST_JSON}")
    print(f"  {HISTORY_CSV}")
    print(f"  {snap}")


if __name__ == "__main__":
    main()
