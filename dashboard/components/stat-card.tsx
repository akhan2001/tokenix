import type { ReactNode } from "react";

import { DashCard } from "@/components/dashboard/dash-card";

/**
 * Shown when a workspace has no priced traffic yet. An empty chart with an
 * axis and no line reads as broken; this says why there is nothing to see.
 *
 * `StatCard`/`StatStrip`, this file's other former exports, are retired —
 * components/dashboard/metric-row.tsx (`MetricRow`) is the one hero-metric
 * card shape every product page uses now, replacing four hand-copied
 * variants of the same headline row.
 */
export function EmptyState({ title, body }: { title: string; body: ReactNode }) {
  return (
    <DashCard padding="var(--space-section-sm) 32px" style={{ textAlign: "center" }}>
      <div style={{ fontSize: 19, color: "var(--text)", marginBottom: 10 }}>{title}</div>
      <div style={{ fontSize: 12.5, color: "var(--text2)", lineHeight: 1.9, maxWidth: 520, margin: "0 auto" }}>
        {body}
      </div>
    </DashCard>
  );
}
