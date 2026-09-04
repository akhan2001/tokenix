import type { CSSProperties, ReactNode } from "react";

/**
 * The card surface itself — the piece the first round of this page skipped
 * entirely. Every distinct block of content (headline figures, a chart,
 * each supporting panel) gets its own bordered, padded surface a shade
 * lighter than the page background, per the approved design.
 *
 * Uses `var(--s1)`/`var(--border)` rather than the design's literal hex —
 * those names are exactly what app/dashboard-tokens.css retargets to the
 * grey-surface palette for everything under `.dashboard-scope`, so this
 * stays correct if that palette ever changes, instead of a second place
 * carrying the same numbers.
 */
export function DashCard({
  children,
  style,
  padding = "22px 24px",
}: {
  children: ReactNode;
  style?: CSSProperties;
  padding?: string;
}) {
  return (
    <div
      style={{
        background: "var(--s1)",
        border: "1px solid var(--border)",
        borderRadius: "var(--dash-radius-card)",
        padding,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
