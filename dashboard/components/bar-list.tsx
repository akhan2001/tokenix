"use client";

import { useState } from "react";

export interface BarRow {
  id: string;
  label: string;
  sub?: string;
  value: number;
  /** Pre-formatted value, shown as the direct label. */
  display: string;
}

/**
 * Ranked magnitudes as horizontal bars.
 *
 * One series, so there is no legend and no categorical palette to validate:
 * every bar is the same gold: identity comes from the row label beside it, and
 * a hue per row would encode nothing. Bars are sorted by value — length is the
 * comparison, and the shared left baseline is what makes it readable.
 *
 * Each bar is directly labelled, so the chart is legible without the hover
 * layer and the whole list doubles as its own table.
 */
const FILL = "#9a7b2e";
const BAR_H = 9;

export function BarList({ rows, max }: { rows: BarRow[]; max?: number }) {
  const [hover, setHover] = useState<string | null>(null);
  const top = max ?? Math.max(...rows.map((r) => r.value), 0);

  if (rows.length === 0 || top <= 0) {
    return (
      <div style={{ fontSize: 12, color: "var(--text3)", padding: "18px 0" }}>
        Nothing to rank yet.
      </div>
    );
  }

  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 14 }}>
      {rows.map((r) => {
        const pct = Math.max((r.value / top) * 100, r.value > 0 ? 1.5 : 0);
        const on = hover === r.id;
        return (
          <li
            key={r.id}
            onMouseEnter={() => setHover(r.id)}
            onMouseLeave={() => setHover(null)}
            style={{ display: "grid", gap: 6 }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: 14,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--serif)",
                  fontSize: 14,
                  color: "var(--text)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {r.label}
                {r.sub && (
                  <span
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: 9,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "var(--text3)",
                      marginLeft: 8,
                    }}
                  >
                    {r.sub}
                  </span>
                )}
              </span>
              {/* Direct label: the value never lives only in the bar length. */}
              <span
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 12,
                  color: "var(--text)",
                  whiteSpace: "nowrap",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {r.display}
              </span>
            </div>
            <div
              style={{
                height: BAR_H,
                background: "var(--s2)",
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${pct}%`,
                  height: "100%",
                  background: FILL,
                  // Rounded data-end only; the baseline end stays square.
                  borderRadius: "2px 4px 4px 2px",
                  opacity: on ? 1 : 0.88,
                  transition: "opacity 120ms ease",
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
