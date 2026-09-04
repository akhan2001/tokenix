import { DashCard } from "./dash-card";

/**
 * The hero metric row — one card, N figures side by side, dividers between
 * them. Overview's headline (spend / fair price / delta) was hand-built
 * inline; this generalizes that same shape so Insights, Forecast and
 * Benchmark's headline figures all render as the same card instead of each
 * page inventing its own hero layout.
 */
export interface Metric {
  label: string;
  value: string;
  color?: string;
  sub?: string;
  /** Column width, as a CSS grid track (e.g. "1.2fr"). Defaults to equal. */
  width?: string;
}

export function MetricRow({ metrics }: { metrics: Metric[] }) {
  return (
    <DashCard
      padding="28px 30px"
      style={{
        display: "grid",
        gridTemplateColumns: metrics.map((m) => m.width ?? "1fr").join(" "),
        gap: 34,
        alignItems: "end",
      }}
    >
      {metrics.map((m, i) => (
        <div
          key={m.label}
          style={{
            minWidth: 0,
            paddingLeft: i === 0 ? 0 : 32,
            borderLeft: i === 0 ? "none" : "1px solid var(--border)",
          }}
        >
          <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 12 }}>{m.label}</div>
          <div
            style={{
              fontSize: i === 0 ? "clamp(38px, 5vw, 58px)" : 34,
              fontWeight: i === 0 ? 400 : 450,
              letterSpacing: "-0.02em",
              lineHeight: 1,
              color: m.color ?? "var(--text)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {m.value}
          </div>
          {m.sub && <div style={{ fontSize: 12.5, color: "var(--text2)", marginTop: 11 }}>{m.sub}</div>}
        </div>
      ))}
    </DashCard>
  );
}
