"use client";

import { useMemo, useState } from "react";

/**
 * Twelve-month projection, current trajectory versus an optimised one.
 *
 * Both series are cumulative USD on one shared axis. Colours validated against
 * surface #f5f2ec: gold #9a7b2e + blue #2b6ea8 → CVD ΔE 20.2, both clear the
 * chroma floor and 3:1 contrast. Two series, so a legend is always present and
 * both lines are directly labelled at their end point.
 */
const CURRENT = "#9a7b2e";
const OPTIMIZED = "#2b6ea8";

const W = 1100;
const H = 300;
const PAD = { t: 22, b: 34, l: 8, r: 96 };

function fmtUsd(n: number): string {
  if (Math.abs(n) >= 1000) return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return "$" + n.toFixed(2);
}

export interface ForecastChartProps {
  /** Projected spend for the current month, month 1 of the projection. */
  monthlyBase: number;
  /** Month-over-month growth as a fraction, e.g. 0.18 for +18%. */
  growthRate: number;
  /** Share of spend recoverable by optimisation, as a fraction. */
  savingShare: number;
}

export function ForecastChart({ monthlyBase, growthRate, savingShare }: ForecastChartProps) {
  const [hover, setHover] = useState<number | null>(null);

  const { months, geom } = useMemo(() => {
    const labels = ["M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8", "M9", "M10", "M11", "M12"];
    let running = monthlyBase;
    let cumulative = 0;
    let cumulativeOpt = 0;

    const months = labels.map((label, i) => {
      if (i > 0) running *= 1 + growthRate;
      cumulative += running;
      cumulativeOpt += running * (1 - savingShare);
      return { label, current: cumulative, optimized: cumulativeOpt };
    });

    const innerW = W - PAD.l - PAD.r;
    const innerH = H - PAD.t - PAD.b;
    const max = Math.max(...months.map((m) => m.current), 1);
    const yMax = max * 1.12;

    const xAt = (i: number) => PAD.l + (i / (months.length - 1)) * innerW;
    const yAt = (v: number) => PAD.t + (1 - v / yMax) * innerH;
    const path = (pick: (m: (typeof months)[number]) => number) =>
      months
        .map((m, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(1)} ${yAt(pick(m)).toFixed(1)}`)
        .join(" ");

    return {
      months,
      geom: {
        innerW,
        innerH,
        yMax,
        xAt,
        yAt,
        currentPath: path((m) => m.current),
        optimizedPath: path((m) => m.optimized),
        // The gap between the two trajectories IS the saving, so shade it
        // rather than leaving the reader to measure the distance by eye.
        savingsBand:
          path((m) => m.current) +
          " " +
          months
            .slice()
            .reverse()
            .map((m, i) => `L${xAt(months.length - 1 - i).toFixed(1)} ${yAt(m.optimized).toFixed(1)}`)
            .join(" ") +
          " Z",
      },
    };
  }, [monthlyBase, growthRate, savingShare]);

  const last = months[months.length - 1];
  const active = hover === null ? null : months[hover];

  return (
    <div style={{ position: "relative", width: "100%" }}>
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
          { c: CURRENT, label: "Current trajectory" },
          { c: OPTIMIZED, label: "With optimisation" },
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
        aria-label="Twelve month cumulative spend projection, current trajectory versus optimised"
      >
        {[0, 0.25, 0.5, 0.75, 1].map((f, i) => {
          const v = geom.yMax * f;
          return (
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
          );
        })}

        {/* Savings band: drawn under both lines so neither is obscured. */}
        <path d={geom.savingsBand} fill={CURRENT} opacity={0.1} stroke="none" />
        <path
          d={geom.optimizedPath}
          fill="none"
          stroke={OPTIMIZED}
          strokeWidth={2}
          strokeDasharray="5 4"
          strokeLinejoin="round"
        />
        <path
          d={geom.currentPath}
          fill="none"
          stroke={CURRENT}
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {/* Direct end labels — identity without relying on the legend alone. */}
        <circle
          cx={geom.xAt(months.length - 1)}
          cy={geom.yAt(last.current)}
          r={4}
          fill={CURRENT}
          stroke="var(--bg)"
          strokeWidth={2}
        />
        <circle
          cx={geom.xAt(months.length - 1)}
          cy={geom.yAt(last.optimized)}
          r={4}
          fill={OPTIMIZED}
          stroke="var(--bg)"
          strokeWidth={2}
        />

        {months.map((m, i) =>
          i % 2 === 0 ? (
            <text
              key={m.label}
              x={geom.xAt(i)}
              y={H - 12}
              fill="var(--text3)"
              fontFamily="var(--mono)"
              fontSize={10}
              textAnchor={i === 0 ? "start" : "middle"}
            >
              {m.label}
            </text>
          ) : null,
        )}

        {hover !== null && (
          <line
            x1={geom.xAt(hover)}
            y1={PAD.t}
            x2={geom.xAt(hover)}
            y2={PAD.t + geom.innerH}
            stroke="var(--border2)"
            strokeWidth={1}
            pointerEvents="none"
          />
        )}

        {months.map((m, i) => {
          const half = geom.innerW / (months.length - 1) / 2;
          return (
            <rect
              key={m.label}
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
            top: 40,
            left: `${(geom.xAt(hover!) / W) * 100}%`,
            transform: hover! > months.length / 2 ? "translate(calc(-100% - 14px))" : "translate(14px)",
            background: "var(--s1)",
            border: "1px solid var(--border2)",
            padding: "10px 13px",
            pointerEvents: "none",
            minWidth: 180,
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
            CUMULATIVE THROUGH {active.label}
          </div>
          {[
            { c: CURRENT, label: "Current", v: active.current },
            { c: OPTIMIZED, label: "Optimised", v: active.optimized },
          ].map(({ c, label, v }) => (
            <div
              key={label}
              style={{
                display: "flex",
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
