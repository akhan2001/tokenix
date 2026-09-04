import type { CSSProperties, ReactNode } from "react";

/**
 * Vertical rhythm, and nothing else. Horizontal constraint is Container's job.
 *
 * Sizes map onto the four-step scale in globals.css. The product screens run
 * xs/sm/md; the marketing sections run md/lg. `top` and `bottom` can differ,
 * because most real sections do — the shipped pages consistently open tighter
 * than they close.
 */
export type SectionSize = "xs" | "sm" | "md" | "lg" | "none";

const SPACE: Record<SectionSize, string> = {
  xs: "var(--space-section-xs)",
  sm: "var(--space-section-sm)",
  md: "var(--space-section-md)",
  lg: "var(--space-section-lg)",
  none: "0",
};

export function Section({
  size = "md",
  top,
  bottom,
  padX = "var(--pad-x)",
  as: Tag = "section",
  children,
  style,
  className,
  id,
}: {
  size?: SectionSize;
  /** Overrides `size` for the top edge only. */
  top?: SectionSize;
  /** Overrides `size` for the bottom edge only. */
  bottom?: SectionSize;
  padX?: string;
  as?: "section" | "div" | "header" | "footer";
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
  id?: string;
}) {
  return (
    <Tag
      id={id}
      className={className}
      style={{
        paddingTop: SPACE[top ?? size],
        paddingBottom: SPACE[bottom ?? size],
        paddingInline: padX,
        ...style,
      }}
    >
      {children}
    </Tag>
  );
}
