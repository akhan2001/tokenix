import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";

/**
 * One button, three variants, replacing the per-file redefinitions.
 *
 * Typography follows the shipped app (uppercase DM Mono, square corners via
 * --radius: 0rem), not the mockups. The mockups specify Inter at 14.5px with
 * 3px radius in tokenix-cta-footer.html and 999px pills in
 * tokenix-problem.html — reproducing that needs Inter loaded in layout.tsx and
 * --radius changed, which is a typographic decision for the whole app rather
 * than something to smuggle in through a button. Flagged, not decided here.
 *
 * The variants mirror .btn-primary / .btn-text already in globals.css, plus a
 * bordered secondary the mockups use for their second CTA.
 */
export type ButtonVariant = "primary" | "secondary" | "text";

const BASE: CSSProperties = {
  fontFamily: "var(--mono)",
  fontSize: 11,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  fontWeight: 500,
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  transition: "all 0.2s",
  cursor: "pointer",
  textDecoration: "none",
  whiteSpace: "nowrap",
};

const VARIANTS: Record<ButtonVariant, CSSProperties> = {
  primary: {
    color: "#0b0c0e",
    background: "var(--accent)",
    padding: "13px 22px",
    border: "none",
  },
  secondary: {
    color: "var(--text)",
    background: "transparent",
    padding: "13px 22px",
    border: "1px solid var(--border2)",
  },
  text: {
    color: "var(--text2)",
    background: "none",
    padding: 0,
    border: "none",
    gap: 8,
  },
};

type Common = {
  variant?: ButtonVariant;
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
  children,
  style,
  className,
}: Common & {
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  const css = { ...BASE, ...VARIANTS[variant], ...style };

  if (href) {
    return (
      <Link href={href} className={className} style={css}>
        {children}
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
      {children}
    </button>
  );
}
