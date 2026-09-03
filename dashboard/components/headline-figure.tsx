import type { ReactNode } from "react";

export interface HeadlineFigureProps {
  /** Small uppercase kicker above the number. */
  kicker: string;
  /** The number itself, pre-formatted. */
  value: string;
  /** What the number is. Sits directly under it. */
  caption: string;
  /** Right-hand supporting facts, stacked. */
  aside?: ReactNode;
}

/**
 * The one number a page is about, set large.
 *
 * A hero number rather than a chart: a single scalar has no shape to plot, and
 * a one-value "chart" would be decoration. The figure carries text tokens, not
 * a series colour — nothing here encodes identity, so nothing needs a hue.
 */
export function HeadlineFigure({ kicker, value, caption, aside }: HeadlineFigureProps) {
  return (
    <div
      className="headline-figure"
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 32,
        flexWrap: "wrap",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div className="sec-kicker">{kicker}</div>
        <div
          style={{
            fontFamily: "var(--sans)",
            fontSize: "clamp(38px, 7vw, 62px)",
            fontWeight: 500,
            letterSpacing: "-0.022em",
            lineHeight: 1,
            color: "var(--text)",
            margin: "6px 0 10px",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value}
        </div>
        <div style={{ fontSize: 12, color: "var(--text3)", letterSpacing: "0.02em" }}>
          {caption}
        </div>
      </div>
      {aside && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            alignItems: "flex-start",
            paddingBottom: 4,
          }}
        >
          {aside}
        </div>
      )}
    </div>
  );
}

/**
 * One line of supporting fact beside a headline figure.
 *
 * `tone` is status, so it never travels as colour alone — the caller passes the
 * arrow glyph and wording that carry the same meaning.
 */
export function HeadlineFact({
  children,
  tone = "plain",
}: {
  children: ReactNode;
  tone?: "plain" | "up" | "down";
}) {
  const color =
    tone === "up" ? "var(--red)" : tone === "down" ? "var(--green)" : "var(--text2)";
  return (
    <div
      style={{
        fontFamily: "var(--mono)",
        fontSize: 12,
        color,
        letterSpacing: "0.02em",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </div>
  );
}
