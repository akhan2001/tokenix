"use client";

import { useMemo, useState } from "react";

export interface SpendPoint {
  day: string;
  cost_usd: number;
  acpi_bench_usd: number;
  requests: number;
}

/**
 * Daily spend, with the ACPI market rate for the same token volume behind it.
 *
 * Two series on ONE axis — both are USD for the same traffic, so they share a
 * scale. (A second y-axis would let any shape be manufactured at will.)
 *
 * Colours are tokens (--series-1 / --series-2), not literals; they are
 * defined once in app/globals.css so the chart call sites cannot drift.
 *
 * Validated against the dark surface #07070a. Method: Vienot 1999 dichromat
 * simulation (sRGB D65), difference reported as CIEDE2000.
 *   --series-1 #ffc46b  12.80:1   --series-2 #5eb0ff  8.75:1
 *   separation  dE00 49.2 normal / 62.4 deuteranope / 57.1 protanope
 * Both clear 3:1 against the surface and sit well above the confusion floor
 * under both dichromacies, so colour alone carries the series distinction.
 */
const SPEND = "var(--series-1)";
const BENCH = "var(--series-2)";

const W = 1100;
const H = 300;
const PAD = { t: 20, b: 34, l: 8, r: 62 };

function fmtUsd(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1000) return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (abs >= 1) return "$" + n.toFixed(2);
  return "$" + n.toFixed(4);
}

function fmtDay(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function SpendChart({ points }: { points: SpendPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);

  const geom = useMemo(() => {
    const innerW = W - PAD.l - PAD.r;
    const innerH = H - PAD.t - PAD.b;
    const values = points.flatMap((p) => [p.cost_usd, p.acpi_bench_usd]);
    const max = Math.max(...values, 0);
    // Anchor at zero: spend is a magnitude, and a truncated baseline would
    // exaggerate day-to-day movement.
    const yMax = max > 0 ? max * 1.15 : 1;

    const xAt = (i: number) =>
      PAD.l + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
    const yAt = (v: number) => PAD.t + (1 - v / yMax) * innerH;

    const path = (pick: (p: SpendPoint) => number) =>
      points
        .map((p, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(1)} ${yAt(pick(p)).toFixed(1)}`)
        .join(" ");

    const spendPath = path((p) => p.cost_usd);
    const areaPath =
      spendPath +
      ` L${xAt(points.length - 1).toFixed(1)} ${(PAD.t + innerH).toFixed(1)}` +
      ` L${PAD.l} ${(PAD.t + innerH).toFixed(1)} Z`;

    return {
      innerW,
      innerH,
      yMax,
      xAt,
      yAt,
      spendPath,
      areaPath,
      benchPath: path((p) => p.acpi_bench_usd),
    };
  }, [points]);

  if (points.length < 2) return null;

  const gridValues = [0, 0.25, 0.5, 0.75, 1].map((f) => geom.yMax * f);
  const labelCount = Math.min(6, points.length);
  const active = hover === null ? null : points[hover];

  return (
    <div style={{ position: "relative", width: "100%" }}>
      {/* Legend — two series, so identity is never colour-alone. */}
      <div
        style={{
          display: "flex",
          gap: 22,
          marginBottom: 12,
          fontSize: 10,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--text3)",
        }}
      >
        {[
          { c: SPEND, label: "Your spend" },
          { c: BENCH, label: "ACPI market rate" },
        ].map(({ c, label }) => (
          <span key={label} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 14, height: 2, background: c, display: "inline-block" }} />
            {label}
          </span>
        ))}
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", height: "auto", display: "block", overflow: "visible" }}
        onMouseLeave={() => setHover(null)}
        role="img"
        aria-label="Daily spend compared with the ACPI market rate"
      >
        <defs>
          <linearGradient id="spend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SPEND} stopOpacity="0.16" />
            <stop offset="100%" stopColor={SPEND} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Recessive grid + right-hand value labels */}
        {gridValues.map((v, i) => (
          <g key={i}>
            <line
              x1={PAD.l}
              y1={geom.yAt(v)}
              x2={PAD.l + geom.innerW}
              y2={geom.yAt(v)}
              stroke="var(--border)"
              strokeWidth={1}
            />
            <text
              x={PAD.l + geom.innerW + 10}
              y={geom.yAt(v) + 3.5}
              fill="var(--text3)"
              fontFamily="var(--mono)"
              fontSize={10}
            >
              {fmtUsd(v)}
            </text>
          </g>
        ))}

        <path d={geom.areaPath} fill="url(#spend-fill)" />
        <path
          d={geom.benchPath}
          fill="none"
          stroke={BENCH}
          strokeWidth={2}
          strokeDasharray="5 4"
          strokeLinejoin="round"
        />
        <path
          d={geom.spendPath}
          fill="none"
          stroke={SPEND}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* X labels */}
        {Array.from({ length: labelCount }, (_, k) => {
          const idx = Math.round((k / (labelCount - 1)) * (points.length - 1));
          return (
            <text
              key={k}
              x={geom.xAt(idx)}
              y={H - 12}
              fill="var(--text3)"
              fontFamily="var(--mono)"
              fontSize={10}
              textAnchor={k === 0 ? "start" : k === labelCount - 1 ? "end" : "middle"}
            >
              {fmtDay(points[idx].day)}
            </text>
          );
        })}

        {/* Crosshair */}
        {hover !== null && (
          <g pointerEvents="none">
            <line
              x1={geom.xAt(hover)}
              y1={PAD.t}
              x2={geom.xAt(hover)}
              y2={PAD.t + geom.innerH}
              stroke="var(--border2)"
              strokeWidth={1}
            />
            {/* 2px surface ring keeps the markers legible where lines cross. */}
            <circle
              cx={geom.xAt(hover)}
              cy={geom.yAt(points[hover].acpi_bench_usd)}
              r={4.5}
              fill={BENCH}
              stroke="var(--bg)"
              strokeWidth={2}
            />
            <circle
              cx={geom.xAt(hover)}
              cy={geom.yAt(points[hover].cost_usd)}
              r={4.5}
              fill={SPEND}
              stroke="var(--bg)"
              strokeWidth={2}
            />
          </g>
        )}

        {/* Hit targets, wider than the marks */}
        {points.map((p, i) => {
          const half = geom.innerW / Math.max(1, points.length - 1) / 2;
          return (
            <rect
              key={p.day}
              x={geom.xAt(i) - half}
              y={PAD.t}
              width={half * 2}
              height={geom.innerH}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          );
        })}
      </svg>

      {active && (
        <div
          style={{
            position: "absolute",
            top: 34,
            left: `${(geom.xAt(hover!) / W) * 100}%`,
            transform:
              hover! > points.length / 2 ? "translate(calc(-100% - 14px))" : "translate(14px)",
            background: "var(--s1)",
            border: "1px solid var(--border2)",
            padding: "10px 13px",
            pointerEvents: "none",
            minWidth: 170,
          }}
        >
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: 10,
              letterSpacing: "0.1em",
              color: "var(--text3)",
              marginBottom: 8,
            }}
          >
            {fmtDay(active.day)} · {active.requests.toLocaleString("en-US")} req
          </div>
          {[
            { c: SPEND, label: "Spend", v: active.cost_usd },
            { c: BENCH, label: "Market", v: active.acpi_bench_usd },
          ].map(({ c, label, v }) => (
            <div
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                fontSize: 11,
                color: "var(--text2)",
                marginTop: 3,
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                <span style={{ width: 8, height: 8, background: c, display: "inline-block" }} />
                {label}
              </span>
              <span style={{ fontFamily: "var(--mono)", color: "var(--text)" }}>{fmtUsd(v)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
