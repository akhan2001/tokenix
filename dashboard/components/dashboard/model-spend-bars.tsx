"use client";

import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, XAxis, YAxis } from "recharts";

/**
 * Ranked spend by model as a horizontal bar chart — the recharts replacement
 * for components/bar-list.tsx. A horizontal `BarChart` with `layout="vertical"`
 * is recharts' idiom for a ranked list: the category axis (model name) runs
 * down the Y axis, magnitude reads left to right.
 *
 * Each bar carries its own value as an end label — direct labelling, so the
 * chart is legible without a hover layer, same as the component it replaces.
 */
export interface ModelSpendRow {
  id: string;
  label: string;
  value: number;
  /** Pre-formatted value, shown as the bar's end label. */
  display: string;
}

const FILL = "#ffa515";

function CategoryTick({ x, y, payload }: { x?: number; y?: number; payload?: { value: string } }) {
  return (
    <text x={x} y={y} dy={4} textAnchor="end" fill="var(--text)" fontSize={12.5}>
      {payload?.value}
    </text>
  );
}

export function ModelSpendBars({ rows }: { rows: ModelSpendRow[] }) {
  if (rows.length === 0) {
    return (
      <div style={{ fontSize: 12, color: "var(--text3)", padding: "18px 0" }}>
        Nothing to rank yet.
      </div>
    );
  }

  const height = rows.length * 34 + 8;

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 44, bottom: 0, left: 0 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="label"
            width={140}
            axisLine={false}
            tickLine={false}
            tick={<CategoryTick />}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={9} isAnimationActive={false}>
            {rows.map((r) => (
              <Cell key={r.id} fill={FILL} />
            ))}
            <LabelList
              dataKey="display"
              position="right"
              style={{ fill: "var(--text)", fontSize: 12, fontVariantNumeric: "tabular-nums" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
