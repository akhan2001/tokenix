"use client";

import { useMemo } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/**
 * Twelve-month cumulative projection — the recharts replacement for
 * components/forecast-chart.tsx. The compounding math is copied verbatim
 * from that component's useMemo block, not re-derived: same monthly base,
 * same growth compounding, same optimized-trajectory discount.
 *
 * A continuous line, not stepped: unlike ACPI's recalculated snapshots, this
 * is a smooth compounding projection — there is no discrete "value that was
 * actually measured" per point the way there is on the spend/benchmark chart.
 */
const CURRENT = "#ffa515";
const OPTIMIZED = "#6fd6cf";

function fmtUsd(n: number): string {
  if (Math.abs(n) >= 1000) return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return "$" + n.toFixed(2);
}

function fmtCompactUsd(n: number): string {
  if (n >= 1_000_000) return "$" + (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return "$" + (n / 1_000).toFixed(0) + "k";
  return "$" + Math.round(n);
}

export interface ForecastProjectionChartProps {
  monthlyBase: number;
  growthRate: number;
  savingShare: number;
}

function ProjectionTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; dataKey: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const current = payload.find((p) => p.dataKey === "current")?.value ?? 0;
  const optimized = payload.find((p) => p.dataKey === "optimized")?.value ?? 0;
  return (
    <div
      style={{
        background: "var(--s2)",
        border: "1px solid var(--border2)",
        borderRadius: 8,
        padding: "10px 13px",
        fontSize: 11.5,
        minWidth: 150,
      }}
    >
      <div style={{ color: "var(--text2)", marginBottom: 6 }}>{label}</div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 14 }}>
        <span style={{ color: "var(--text2)" }}>Current</span>
        <span style={{ color: "var(--text)" }}>{fmtUsd(current)}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 14, marginTop: 2 }}>
        <span style={{ color: "var(--text2)" }}>Optimized</span>
        <span style={{ color: "var(--text)" }}>{fmtUsd(optimized)}</span>
      </div>
    </div>
  );
}

export function ForecastProjectionChart({
  monthlyBase,
  growthRate,
  savingShare,
}: ForecastProjectionChartProps) {
  const months = useMemo(() => {
    const labels = ["M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8", "M9", "M10", "M11", "M12"];
    let running = monthlyBase;
    let cumulative = 0;
    let cumulativeOpt = 0;
    return labels.map((label, i) => {
      if (i > 0) running *= 1 + growthRate;
      cumulative += running;
      cumulativeOpt += running * (1 - savingShare);
      return { label, current: cumulative, optimized: cumulativeOpt };
    });
  }, [monthlyBase, growthRate, savingShare]);

  return (
    <div style={{ width: "100%", height: 280 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={months} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "var(--text3)", fontSize: 10 }}
            axisLine={{ stroke: "var(--border2)" }}
            tickLine={false}
          />
          <YAxis
            orientation="right"
            tickFormatter={fmtCompactUsd}
            tick={{ fill: "var(--text3)", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={54}
          />
          <Tooltip content={<ProjectionTooltip />} cursor={{ stroke: "var(--border2)" }} />
          <Legend
            verticalAlign="top"
            align="right"
            height={28}
            iconType="plainline"
            wrapperStyle={{ fontSize: 12, color: "var(--text2)" }}
          />
          <Line
            type="monotone"
            dataKey="current"
            name="Current trajectory"
            stroke={CURRENT}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="optimized"
            name="With optimization"
            stroke={OPTIMIZED}
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
