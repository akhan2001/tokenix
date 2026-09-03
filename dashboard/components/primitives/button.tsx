import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { LINK } from "./type";

/**
 * One button. Three variants, one radius, one type treatment.
 *
 * Before this the page carried eleven clickable elements in almost as many
 * shapes: a white 999px pill in the problem section, a 5px bordered box in the
 * index, 3px filled and bordered pairs in the CTA, bare amber text links in
 * three more places, and a square nav CTA inherited from the shipped app.
 *
 *   primary   — amber fill, for the single main action in a section
 *   secondary — bordered, for the alternative alongside a primary
 *   text      — amber inline link with an arrow, for "read more" affordances
 *
 * `arrow` appends the trailing glyph so call sites stop hand-rolling it.
 */
export type ButtonVariant = "primary" | "secondary" | "text";

const BASE: CSSProperties = {
  ...LINK,
  cursor: "pointer",
  whiteSpace: "nowrap",
  transition: "opacity 0.15s ease, border-color 0.15s ease, background 0.15s ease",
};

const BOX: CSSProperties = {
  padding: "12px 22px",
  borderRadius: "var(--radius-control)",
};

const VARIANTS: Record<ButtonVariant, CSSProperties> = {
  primary: { ...BOX, background: "var(--amber)", color: "#0a0b0d", border: "1px solid var(--amber)" },
  secondary: { ...BOX, background: "transparent", color: "var(--ink)", border: "1px solid var(--line-strong)" },
  text: { background: "none", border: "none", padding: 0, color: "var(--amber-hot)" },
};

type Props = {
  variant?: ButtonVariant;
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  /** Trailing glyph. Defaults to an arrow on the text variant. */
  arrow?: string | false;
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
};

export function Button({
  variant = "primary",
  href,
  onClick,
  type = "button",
  disabled,
  arrow,
  children,
  style,
  className,
}: Props) {
  const glyph = arrow === false ? null : (arrow ?? (variant === "text" ? "→" : null));
  const css = { ...BASE, ...VARIANTS[variant], ...style };
  const body = (
    <>
      {children}
      {glyph && <span aria-hidden>{glyph}</span>}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className} style={css}>
        {body}
      </Link>
    );
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={className}
      style={{ ...css, opacity: disabled ? 0.5 : 1 }}
    >
      {body}
    </button>
  );
}
