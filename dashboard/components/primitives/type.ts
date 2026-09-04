import type { CSSProperties } from "react";

/**
 * The type scale. One definition per role, imported by every section, so the
 * same heading level cannot end up at three different weights again.
 *
 * Before this existed the h2s across the landing page ran weight 200, 300 and
 * 600 at five different sizes, body copy at 15/15.5/16, links at 13.5/14.5,
 * and the header and footer logos used different faces entirely.
 *
 * Two families, per the brief: a light Swiss grotesque (Inter, --sans) for
 * headlines, DM Mono (--mono) for data, labels and identity. Nothing else.
 * Headline weight is 300 throughout — the "thin, wide" end of the grotesque is
 * the whole point of the pairing, so nothing above 500 appears in display type.
 */

/** Hero headline. The only display-scale text on the page. */
export const DISPLAY: CSSProperties = {
  fontFamily: "var(--sans)",
  fontWeight: 300,
  fontSize: "clamp(40px, 5.2vw, 72px)",
  lineHeight: 1.04,
  letterSpacing: "-0.01em",
  margin: 0,
};

/** The ACPI price quote. Display scale, tighter tracking for figures. */
export const FIGURE: CSSProperties = {
  fontFamily: "var(--sans)",
  fontWeight: 300,
  fontSize: "clamp(52px, 6.4vw, 88px)",
  lineHeight: 1,
  letterSpacing: "-0.02em",
};

/** Secondary figure — the gateway's estimated spend. */
export const FIGURE_SM: CSSProperties = {
  fontFamily: "var(--sans)",
  fontWeight: 300,
  fontSize: "clamp(34px, 4vw, 48px)",
  lineHeight: 1,
  letterSpacing: "-0.02em",
};

/** Every section heading. One weight, one size, one rhythm. */
export const H2: CSSProperties = {
  fontFamily: "var(--sans)",
  fontWeight: "var(--h2-weight)" as CSSProperties["fontWeight"],
  fontSize: "var(--h2-size)",
  lineHeight: "var(--h2-leading)",
  letterSpacing: "var(--h2-tracking)",
  margin: 0,
};

/** Sub-heading inside a section — step titles, panel titles. */
export const H3: CSSProperties = {
  fontFamily: "var(--sans)",
  fontWeight: 500,
  fontSize: 17,
  lineHeight: 1.35,
  letterSpacing: "-0.005em",
  margin: 0,
};

/** Section body copy. */
export const BODY: CSSProperties = {
  fontFamily: "var(--sans)",
  fontWeight: 400,
  fontSize: 15.5,
  lineHeight: 1.7,
  margin: 0,
};

/** Supporting copy inside panels and cards. */
export const BODY_SM: CSSProperties = {
  fontFamily: "var(--sans)",
  fontWeight: 400,
  fontSize: 13.5,
  lineHeight: 1.6,
  margin: 0,
};

/** Inline text link / CTA. */
export const LINK: CSSProperties = {
  fontFamily: "var(--sans)",
  fontWeight: 500,
  fontSize: 14.5,
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
};

/** Mono data label — column heads, units, timestamps. */
export const LABEL: CSSProperties = {
  fontFamily: "var(--mono)",
  fontWeight: 400,
  fontSize: 12,
  letterSpacing: "0.06em",
};

/** Smaller mono label — legends, footnotes, axis text. */
export const LABEL_SM: CSSProperties = {
  fontFamily: "var(--mono)",
  fontWeight: 400,
  fontSize: 11,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
};

/** Tabular figures in tables and readouts. */
export const DATA: CSSProperties = {
  fontFamily: "var(--mono)",
  fontWeight: 400,
  fontSize: 12.5,
  fontVariantNumeric: "tabular-nums",
};

/** Wordmark. Mono in both header and footer — it is an identity, not a headline. */
export const WORDMARK: CSSProperties = {
  fontFamily: "var(--mono)",
  fontWeight: 500,
  fontSize: 17,
  letterSpacing: "0.08em",
  textDecoration: "none",
};

/** Footer copy of the wordmark — same face, quieter scale. */
export const WORDMARK_SM: CSSProperties = {
  ...WORDMARK,
  fontSize: 14,
};
