import type { ReactNode } from "react";

export interface StatCardProps {
  label: string;
  value: string;
  sub?: ReactNode;
  /** `gold` for the headline figure; `plain` for the rest. */
  tone?: "gold" | "plain";
}

/**
 * One cell of the stat strip.
 *
 * A stat tile, not a chart: these are single headline numbers where a plot
 * would add nothing. Values wear text tokens — the only colour carried is the
 * gold accent on the primary figure.
 */
export function StatCard({ label, value, sub, tone = "plain" }: StatCardProps) {
  return (
    <div style={{ padding: "26px 28px" }}>
      <div
        style={{
          fontSize: 9,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "var(--text3)",
          marginBottom: 12,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--serif)",
          fontSize: 26,
          fontWeight: 500,
          color: tone === "gold" ? "var(--accent)" : "var(--text)",
          lineHeight: 1,
          marginBottom: 8,
        }}
      >
        {value}
      </div>
      {sub !== undefined && (
        <div style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.5 }}>{sub}</div>
      )}
    </div>
  );
}

export function StatStrip({ children }: { children: ReactNode }) {
  return (
    <section
      className="app-stats"
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        width: "100%",
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      {children}
    </section>
  );
}

/**
 * Shown when a workspace has no priced traffic yet. An empty chart with an
 * axis and no line reads as broken; this says why there is nothing to see.
 */
export function EmptyState({ title, body }: { title: string; body: ReactNode }) {
  return (
    <div
      style={{
        border: "1px solid var(--border)",
        background: "linear-gradient(180deg, var(--s1), transparent)",
        padding: "44px 32px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontFamily: "var(--serif)",
          fontSize: 19,
          color: "var(--text)",
          marginBottom: 10,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: 12,
          color: "var(--text3)",
          lineHeight: 1.9,
          maxWidth: 520,
          margin: "0 auto",
        }}
      >
        {body}
      </div>
    </div>
  );
}
