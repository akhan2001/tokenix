"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";

/**
 * Daily spend as bars — the recharts replacement for components/daily-bars.tsx,
 * scoped to the product area per the decision to run one charting library
 * (recharts) across /dashboard/* rather than two.
 *
 * Bars, not a line: each day is a discrete total that was billed, not a
 * sample of something continuous — same reasoning the original component's
 * header comment gave, carried over rather than re-derived.
 */
export interface DailySpendPoint {
  day: string;
  cost_usd: number;
  requests: number;
}

const FILL = "#ffa515";

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

function BarTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: DailySpendPoint }[];
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div
      style={{
        background: "var(--s2)",
        border: "1px solid var(--border2)",
        borderRadius: 8,
        padding: "9px 12px",
        fontSize: 11.5,
      }}
    >
      <div style={{ color: "var(--text2)", marginBottom: 4 }}>{fmtDay(p.day)}</div>
      <div style={{ color: "var(--text)" }}>{fmtUsd(p.cost_usd)}</div>
      <div style={{ color: "var(--text2)", marginTop: 2 }}>
        {p.requests.toLocaleString("en-US")} req
      </div>
    </div>
  );
}

export function DailySpendBars({ points }: { points: DailySpendPoint[] }) {
  if (points.length === 0) {
    return (
      <div style={{ fontSize: 12, color: "var(--text3)", padding: "18px 0" }}>
        No daily history yet.
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: 180 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={points} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="day"
            tickFormatter={fmtDay}
            tick={{ fill: "var(--text3)", fontSize: 10 }}
            axisLine={{ stroke: "var(--border2)" }}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={40}
          />
          <Tooltip content={<BarTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
          <Bar dataKey="cost_usd" fill={FILL} radius={[2, 2, 0, 0]} maxBarSize={28} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
