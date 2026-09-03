import type { CSSProperties, ReactNode } from "react";

/**
 * The small label above a section heading.
 *
 * Two patterns existed. tokenix-problem.html has a left-aligned mono label
 * with a square amber bullet; globals.css has .sec-kicker, a plain uppercase
 * amber line with wider tracking. The bullet form is the real component and
 * the plain form is a variant of it — not a second implementation.
 *
 * Note the two disagree on colour: the mockup dims the text and puts the amber
 * only in the bullet, while .sec-kicker makes the whole line amber. Both are
 * kept, because that difference reads as deliberate emphasis rather than drift
 * — "bullet" sits beside body copy, "kicker" opens a section on its own.
 */
export type EyebrowVariant = "bullet" | "kicker";

export function Eyebrow({
  variant = "bullet",
  children,
  style,
  className,
}: {
  variant?: EyebrowVariant;
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
}) {
  if (variant === "kicker") {
    return (
      <div
        className={className}
        style={{
          fontFamily: "var(--mono)",
          fontSize: 10,
          letterSpacing: "0.26em",
          textTransform: "uppercase",
          color: "var(--accent)",
          marginBottom: 10,
          ...style,
        }}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontFamily: "var(--mono)",
        fontSize: 12,
        letterSpacing: "0.06em",
        color: "var(--text2)",
        height: "fit-content",
        ...style,
      }}
    >
      <span aria-hidden style={{ fontSize: 7, color: "var(--accent)", lineHeight: 1 }}>
        ■
      </span>
      {children}
    </div>
  );
}
