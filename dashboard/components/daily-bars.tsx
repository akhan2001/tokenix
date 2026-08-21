"use client";

import { useMemo, useState } from "react";

export interface DailyBar {
  day: string;
  cost_usd: number;
  requests: number;
}

/**
 * Daily spend as bars.
 *
 * One series, so no legend and no categorical palette: the title names what the
 * bars are. Bars rather than a line because each day is a discrete total that
 * was billed, not a sample of something continuous.
 *
 * Anchored at zero — spend is a magnitude, and a truncated baseline would
 * exaggerate the day-to-day movement that this chart exists to show.
 */
const FILL = "#9a7b2e";
const W = 560;
const H = 170;
const PAD = { t: 14, b: 26, l: 4, r: 4 };
/** Surface gap between adjacent bars, per the mark spec. */
const GAP = 2;

function fmtUsd(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1000) return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (abs >= 1) return "$" + n.toFixed(2);
  if (abs >= 0.01) return "$" + n.toFixed(3);
  if (abs === 0) return "$0.00";
  return "$" + n.toFixed(6);
}

function fmtDay(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function DailyBars({ points }: { points: DailyBar[] }) {
  const [hover, setHover] = useState<number | null>(null);

  const geom = useMemo(() => {
    const innerW = W - PAD.l - PAD.r;
    const innerH = H - PAD.t - PAD.b;
    const max = Math.max(...points.map((p) => p.cost_usd), 0);
    const yMax = max > 0 ? max * 1.12 : 1;
    const slot = points.length > 0 ? innerW / points.length : innerW;
    const barW = Math.max(slot - GAP, 1);
    return { innerW, innerH, yMax, slot, barW };
  }, [points]);

  if (points.length === 0) {
    return (
      <div style={{ fontSize: 12, color: "var(--text3)", padding: "18px 0" }}>
        No daily history yet.
      </div>
    );
  }

  const active = hover === null ? null : points[hover];

  return (
    <div style={{ position: "relative" }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", height: "auto", display: "block", overflow: "visible" }}
        role="img"
        aria-label={`Daily spend across ${points.length} day${
          points.length === 1 ? "" : "s"
        }. The table below lists every value.`}
        onMouseLeave={() => setHover(null)}
      >
        <line
          x1={PAD.l}
          x2={W - PAD.r}
          y1={PAD.t + geom.innerH}
          y2={PAD.t + geom.innerH}
          stroke="var(--border2)"
          strokeWidth={1}
        />
        {points.map((p, i) => {
          const h = (p.cost_usd / geom.yMax) * geom.innerH;
          const x = PAD.l + i * geom.slot;
          const on = hover === i;
          return (
            <g key={p.day}>
              {/* Hit target spans the whole slot height, not just the bar. */}
              <rect
                x={x}
                y={PAD.t}
                width={geom.slot}
                height={geom.innerH}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
              />
              <rect
                x={x}
                y={PAD.t + geom.innerH - Math.max(h, p.cost_usd > 0 ? 1.5 : 0)}
                width={geom.barW}
                height={Math.max(h, p.cost_usd > 0 ? 1.5 : 0)}
                rx={2}
                fill={FILL}
                opacity={hover === null || on ? 0.9 : 0.42}
                pointerEvents="none"
              />
            </g>
          );
        })}
        {[0, Math.floor(points.length / 2), points.length - 1]
          .filter((i, n, a) => a.indexOf(i) === n && i >= 0 && i < points.length)
          .map((i) => (
            <text
              key={i}
              x={PAD.l + i * geom.slot + geom.barW / 2}
              y={H - 8}
              textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}
              style={{ fontFamily: "var(--mono)", fontSize: 9, fill: "var(--text3)" }}
            >
              {fmtDay(points[i].day)}
            </text>
          ))}
      </svg>

      {active && (
        <div
          role="status"
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            background: "var(--s1)",
            border: "1px solid var(--border2)",
            padding: "8px 11px",
            pointerEvents: "none",
            fontFamily: "var(--mono)",
            fontSize: 11,
            lineHeight: 1.7,
            whiteSpace: "nowrap",
          }}
        >
          <div style={{ color: "var(--text3)" }}>{fmtDay(active.day)}</div>
          <div style={{ color: "var(--text)" }}>{fmtUsd(active.cost_usd)}</div>
          <div style={{ color: "var(--text3)" }}>
            {active.requests.toLocaleString("en-US")} req
          </div>
        </div>
      )}
    </div>
  );
}
