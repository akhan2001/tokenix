import type { CSSProperties, ReactNode } from "react";

/**
 * The horizontal constraint. 1200px is not a new number — it is what 20 call
 * sites across 10 shipped files were already using independently (app-nav,
 * every dashboard page, the homepage). This makes that de-facto standard
 * explicit so it stops being re-typed.
 *
 * 1080 is the default because it is the measure that was reviewed and approved
 * on the methodology section; every landing section now shares it so their left
 * edges line up. 1200 survives as "wide" for the product screens and the ACPI
 * chart, which were laid out against it.
 *
 * "narrow" is the prose/form tier, standing in for the 620/640/660 values the
 * shipped pages use for readable measure.
 */
export type ContainerWidth = "default" | "wide" | "narrow" | "full";

const WIDTHS: Record<ContainerWidth, number | undefined> = {
  default: 1080,
  wide: 1200,
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
