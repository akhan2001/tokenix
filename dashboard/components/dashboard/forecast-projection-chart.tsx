"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { ScenarioPoint } from "@/lib/forecast-scenarios";

/**
 * Twelve-month cumulative projection: current trajectory, with optimisation,
 * and flat growth, plus the gap between current and optimised shaded in as
 * the savings opportunity.
 *
 * Takes a pre-computed `points` array rather than the raw
 * monthlyBase/growthRate/savingShare inputs it used to — the forecast page
 * needs the SAME numbers for its text checkpoints (This month / 3 months /
 * 12 months per scenario), and computing them twice (once here, once in the
 * page) risked the two silently drifting apart. lib/forecast-scenarios.ts is
 * now the one place that math happens.
 *
 * A continuous line, not stepped: unlike ACPI's recalculated snapshots, this
 * is a smooth compounding projection — there is no discrete "value that was
 * actually measured" per point the way there is on the spend/benchmark chart.
 *
 * The shaded gap is a stacked Area trick: an invisible area up to
 * `optimized`, then a visible one for `gap = current - optimized` stacked on
 * top of it — recharts has no native "fill between two arbitrary lines"
 * primitive. The Line components are drawn separately, on top, for crisp
 * edges the area fill alone wouldn't give.
 */
const CURRENT = "#ffa515";
const OPTIMIZED = "#6fd6cf";
const FLAT = "#7a8296";

function fmtUsd(n: number): string {
  if (Math.abs(n) >= 1000) return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return "$" + n.toFixed(2);
}

function fmtCompactUsd(n: number): string {
  if (n >= 1_000_000) return "$" + (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return "$" + (n / 1_000).toFixed(0) + "k";
  return "$" + Math.round(n);
}

type ChartPoint = ScenarioPoint & { label: string; gap: number };

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
  const get = (key: string) => payload.find((p) => p.dataKey === key)?.value ?? 0;
  const current = get("current");
  const optimized = get("optimized");
  const flat = get("flat");
  return (
    <div
      style={{
        background: "var(--s2)",
        border: "1px solid var(--border2)",
        borderRadius: 8,
        padding: "10px 13px",
        fontSize: 11.5,
        minWidth: 160,
      }}
    >
      <div style={{ color: "var(--text2)", marginBottom: 6 }}>{label}</div>
      {[
        { label: "Current", value: current, color: CURRENT },
        { label: "Optimized", value: optimized, color: OPTIMIZED },
        { label: "Flat growth", value: flat, color: FLAT },
      ].map((row) => (
        <div key={row.label} style={{ display: "flex", justifyContent: "space-between", gap: 14, marginTop: 2 }}>
          <span style={{ color: "var(--text2)" }}>{row.label}</span>
          <span style={{ color: row.color }}>{fmtUsd(row.value)}</span>
        </div>
      ))}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 14,
          marginTop: 6,
          paddingTop: 6,
          borderTop: "1px solid var(--border)",
        }}
      >
        <span style={{ color: "var(--text2)" }}>Savings so far</span>
        <span style={{ color: CURRENT }}>{fmtUsd(current - optimized)}</span>
      </div>
    </div>
  );
}

export function ForecastProjectionChart({ points }: { points: ScenarioPoint[] }) {
  const data: ChartPoint[] = points.map((p) => ({
    ...p,
    label: `M${p.month}`,
    gap: Math.max(p.current - p.optimized, 0),
  }));

  return (
    <div style={{ width: "100%", height: 280 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
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

          {/* Shaded savings gap: an invisible floor up to `optimized`, then the
              visible fill for the difference stacked on top of it. */}
          <Area
            dataKey="optimized"
            stackId="gap"
            stroke="none"
            fill="transparent"
            legendType="none"
            isAnimationActive={false}
            tooltipType="none"
          />
          <Area
            dataKey="gap"
            stackId="gap"
            stroke="none"
            fill={CURRENT}
            fillOpacity={0.12}
            legendType="none"
            isAnimationActive={false}
            tooltipType="none"
          />

          <Line
            type="monotone"
            dataKey="flat"
            name="Flat growth"
            stroke={FLAT}
            strokeWidth={1.5}
            strokeDasharray="2 3"
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
          <Line
            type="monotone"
            dataKey="current"
            name="Current trajectory"
            stroke={CURRENT}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
