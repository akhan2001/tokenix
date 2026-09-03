import type { CSSProperties, ReactNode } from "react";

/**
 * The horizontal constraint. 1200px is not a new number — it is what 20 call
 * sites across 10 shipped files were already using independently (app-nav,
 * every dashboard page, the homepage). This makes that de-facto standard
 * explicit so it stops being re-typed.
 *
 * The mockups mostly ran full-bleed off --pad-x, with one 1080px outlier in
 * tokenix-methodology.html. That outlier reconciles up to 1200, not the other
 * way round: matching it would mean re-laying-out the 20 shipped call sites.
 *
 * "narrow" is the prose/form tier, standing in for the 620/640/660 values the
 * shipped pages use for readable measure.
 */
export type ContainerWidth = "default" | "narrow" | "full";

const WIDTHS: Record<ContainerWidth, number | undefined> = {
  default: 1200,
  narrow: 640,
  full: undefined,
};

export function Container({
  width = "default",
  children,
  style,
  className,
}: {
  width?: ContainerWidth;
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        width: "100%",
        maxWidth: WIDTHS[width],
        marginInline: "auto",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
