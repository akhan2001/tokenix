"""
Export ACPI history to /exports.
- acpi_last_24h.csv      : past 24 hours of index readings
- acpi_history_full.csv  : all available history with annotations
"""

import csv
import os
from datetime import datetime, timezone, timedelta

SRC = os.path.join(os.path.dirname(__file__), "..", "dashboard", "data", "acpi_history.csv")
OUT_DIR = os.path.dirname(__file__)

NOTABLE_EVENTS = {
    "2026-06-21T17:31:32Z": "REGIME CHANGE: +469% jump (2.83->16.18). Model count 313->309. Possible methodology or pricing data shift.",
    "2026-06-25T14:10:07Z": "POSSIBLE OUTAGE SPIKE: +6.3% to ATH 17.194. Model count dropped 309->291 (18 models offline). Index prices higher when cheaper models fall out.",
    "2026-06-25T17:06:03Z": "RECOVERY: -5.9%. Model count 291->309. Models returned to index. Price normalized.",
    "2026-06-27T15:54:56Z": "LARGE CORRECTION: -66.4% (16.17->5.43). Model count unchanged at 309. Possible methodology fix or repricing event.",
}

def parse_ts(s):
    return datetime.fromisoformat(s.replace("Z", "+00:00"))

rows = []
with open(SRC, newline="", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        row["timestamp_dt"] = parse_ts(row["timestamp"])
        rows.append(row)

rows.sort(key=lambda r: r["timestamp_dt"])

now = datetime.now(timezone.utc)
cutoff_24h = now - timedelta(hours=24)

FIELDNAMES = ["timestamp", "acpi", "model_count", "provider_count",
              "hardware_floor", "p2_score", "mean_blended_price",
              "mean_p3_spread", "mean_quality_adjustment"]
FIELDNAMES_FULL = FIELDNAMES + ["acpi_delta", "acpi_delta_pct", "notes"]

# --- last 24h ---
last_24h = [r for r in rows if r["timestamp_dt"] >= cutoff_24h]

out_24h = os.path.join(OUT_DIR, "acpi_last_24h.csv")
with open(out_24h, "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=FIELDNAMES_FULL)
    writer.writeheader()
    prev_acpi = None
    for r in last_24h:
        acpi_val = float(r["acpi"])
        if prev_acpi is not None:
            delta = round(acpi_val - prev_acpi, 6)
            delta_pct = round((acpi_val - prev_acpi) / prev_acpi * 100, 4)
        else:
            delta = ""
            delta_pct = ""
        prev_acpi = acpi_val
        note = NOTABLE_EVENTS.get(r["timestamp"], "")
        writer.writerow({
            **{k: r[k] for k in FIELDNAMES},
            "acpi_delta": delta,
            "acpi_delta_pct": delta_pct,
            "notes": note,
        })

print(f"24h export: {len(last_24h)} rows -> {out_24h}")

# --- full history ---
out_full = os.path.join(OUT_DIR, "acpi_history_full.csv")
with open(out_full, "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=FIELDNAMES_FULL)
    writer.writeheader()
    prev_acpi = None
    for r in rows:
        acpi_val = float(r["acpi"])
        if prev_acpi is not None:
            delta = round(acpi_val - prev_acpi, 6)
            delta_pct = round((acpi_val - prev_acpi) / prev_acpi * 100, 4)
            if r["timestamp"] in NOTABLE_EVENTS:
                note = NOTABLE_EVENTS[r["timestamp"]]
            elif abs(delta_pct) >= 1.0:
                note = f"Notable move: {'+' if delta_pct > 0 else ''}{delta_pct}% vs prev reading"
            else:
                note = ""
        else:
            delta = ""
            delta_pct = ""
            note = "Start of recorded history"
        prev_acpi = acpi_val
        writer.writerow({
            **{k: r[k] for k in FIELDNAMES},
            "acpi_delta": delta,
            "acpi_delta_pct": delta_pct,
            "notes": note,
        })

print(f"Full export: {len(rows)} rows -> {out_full}")

# --- console summary ---
if rows:
    first_ts  = rows[0]["timestamp"]
    last_ts   = rows[-1]["timestamp"]
    first_acpi = float(rows[0]["acpi"])
    last_acpi  = float(rows[-1]["acpi"])
    max_row = max(rows, key=lambda r: float(r["acpi"]))
    min_row = min(rows, key=lambda r: float(r["acpi"]))

    print(f"\n=== ACPI History Summary ===")
    print(f"Span       : {first_ts} to {last_ts}")
    print(f"Total rows : {len(rows)}")
    print(f"First ACPI : {first_acpi:.4f}")
    print(f"Latest ACPI: {last_acpi:.4f}  ({(last_acpi/first_acpi - 1)*100:+.2f}% vs start)")
    print(f"All-time hi: {float(max_row['acpi']):.4f} @ {max_row['timestamp']}  (models: {max_row['model_count']})")
    print(f"All-time lo: {float(min_row['acpi']):.4f} @ {min_row['timestamp']}  (models: {min_row['model_count']})")
    print(f"\n=== Last 24h ===")
    print(f"Window     : {cutoff_24h.strftime('%Y-%m-%dT%H:%M UTC')} to {now.strftime('%Y-%m-%dT%H:%M UTC')}")
    print(f"Rows       : {len(last_24h)}")
    if last_24h:
        h24_first = float(last_24h[0]["acpi"])
        h24_last  = float(last_24h[-1]["acpi"])
        print(f"Range      : {h24_first:.4f} to {h24_last:.4f}  ({(h24_last/h24_first-1)*100:+.4f}%)")
        print(f"24h open @ : {last_24h[0]['timestamp']}")
