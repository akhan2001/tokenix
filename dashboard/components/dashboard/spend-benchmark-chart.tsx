"use client";

import {
  ComposedChart,
  Area,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

/**
 * Spend vs. ACPI benchmark, ported from the design's chart card.
 *
 * Recharts, per the explicit choice to scope it to the new dashboard rather
 * than extend the hand-rolled SVG convention the rest of the app uses (see
 * components/spend-chart.tsx, which already draws this exact shape — stepped
 * area, dashed benchmark, hover crosshair — for /insights). Worth knowing
 * that overlap exists; the decision to use recharts here was made with that
 * named as the alternative, so this isn't a silent duplication.
 *
 * `type="stepAfter"` on both series for the same reason SpendChart's
 * `stepped` mode exists: ACPI is a sequence of recalculated snapshots, not a
 * continuously varying quantity, so a sloped line between two points would
 * imply values that were never computed.
 */
export interface ChartPoint {
  day: string;
  cost_usd: number;
  acpi_bench_usd: number;
}

const ACCENT = "#ffa515";
const BENCH = "#6a6a74";
const GRID = "rgba(255,255,255,0.055)";

function fmtCompactUsd(n: number): string {
  if (n >= 1_000_000) return "$" + (n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1) + "M";
  if (n >= 1_000) return "$" + (n / 1_000).toFixed(n >= 10_000 ? 0 : 1) + "k";
  return "$" + Math.round(n);
}

function fmtDay(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; dataKey: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const actual = payload.find((p) => p.dataKey === "cost_usd")?.value ?? 0;
  const bench = payload.find((p) => p.dataKey === "acpi_bench_usd")?.value ?? 0;
  const delta = actual - bench;
  const over = delta > 0;
  const deltaColor = over ? "#e0644f" : "#4caf7d";
  const deltaPct = bench > 0 ? Math.abs((delta / bench) * 100) : 0;

  return (
    <div
      style={{
        background: "#212126",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 10,
        padding: "11px 13px",
        minWidth: 186,
        boxShadow: "0 18px 40px -16px rgba(0,0,0,0.9)",
      }}
    >
      <div style={{ fontSize: 11.5, color: "#8a8a93", marginBottom: 9 }}>{fmtDay(label ?? "")}</div>
      <Row label="Actual" value={fmtCompactUsd(actual)} color="#ededf0" />
      <Row label="ACPI ref" value={fmtCompactUsd(bench)} color="#c8c8d0" />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 18,
          fontSize: 12.5,
          paddingTop: 7,
          marginTop: 2,
          borderTop: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <span style={{ color: "#8a8a93" }}>Delta</span>
        <span style={{ color: deltaColor }}>
          {over ? "+" : "−"}
          {fmtCompactUsd(Math.abs(delta)).slice(1)} ({over ? "+" : "−"}
          {deltaPct.toFixed(1)}%)
        </span>
      </div>
    </div>
  );
}

function Row({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 18, fontSize: 12.5, marginBottom: 5 }}>
      <span style={{ color: "#8a8a93" }}>{label}</span>
      <span style={{ color }}>{value}</span>
    </div>
  );
}

export function SpendBenchmarkChart({ points }: { points: ChartPoint[] }) {
  if (points.length < 2) {
    return (
      <p style={{ fontSize: 12, color: "#6f6f78", lineHeight: 1.9, margin: 0 }}>
        Not enough history to plot yet — a chart needs at least two days of priced traffic.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={points} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="dash-spend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ACCENT} stopOpacity={0.18} />
            <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
          </linearGradient>
        </defs>

        <CartesianGrid stroke={GRID} vertical={false} />

        <XAxis
          dataKey="day"
          tickFormatter={fmtDay}
          tick={{ fill: "#6f6f78", fontSize: 11 }}
          axisLine={{ stroke: GRID }}
          tickLine={false}
          interval="preserveStartEnd"
          minTickGap={60}
        />
        <YAxis
          orientation="right"
          tickFormatter={fmtCompactUsd}
          tick={{ fill: "#6f6f78", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={56}
        />

        <Tooltip
          content={<ChartTooltip />}
          cursor={{ stroke: "rgba(255,255,255,0.28)", strokeWidth: 1 }}
        />

        <Area
          type="stepAfter"
          dataKey="cost_usd"
          stroke={ACCENT}
          strokeWidth={2}
          fill="url(#dash-spend-fill)"
          dot={false}
          activeDot={{ r: 4.5, fill: ACCENT, stroke: "#0b0b0c", strokeWidth: 2 }}
          isAnimationActive={false}
        />
        <Line
          type="stepAfter"
          dataKey="acpi_bench_usd"
          stroke={BENCH}
          strokeWidth={1.6}
          strokeDasharray="5 5"
          dot={false}
          activeDot={{ r: 4.5, fill: BENCH, stroke: "#0b0b0c", strokeWidth: 2 }}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
