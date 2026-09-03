import Link from "next/link";

/**
 * Ported to the two-row form from data/tokenix-cta-footer.html: identity and
 * links on top, a hairline, then the legal/status line beneath.
 *
 * The mockup's four links are kept but pointed at routes that exist. Its
 * "Contact Us" becomes /connect, since that is where a visitor actually lands.
 */
const LINKS = [
  { label: "Index", href: "/" },
  { label: "Screener", href: "/screener" },
  { label: "Methodology", href: "/#methodology" },
  { label: "Connect", href: "/connect" },
];

export function Footer() {
  return (
    <footer
      className="home-footer"
      style={{
        borderTop: "1px solid var(--line)",
        padding: "var(--space-section-sm) var(--pad-x) var(--space-section-xs)",
      }}
    >
      <div
        className="footer-top"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
          paddingBottom: 28,
          borderBottom: "1px solid var(--line)",
          marginBottom: 20,
        }}
      >
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 13,
            fontWeight: 500,
            letterSpacing: "0.08em",
            color: "var(--ink)",
          }}
        >
          TOKENIX
        </div>
        <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
          {LINKS.map(({ label, href }) => (
            <Link key={label} href={href} className="footer-link">
              {label}
            </Link>
          ))}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          fontFamily: "var(--mono)",
          fontSize: 11.5,
          color: "var(--ink-faint)",
        }}
      >
        <span>© 2026 Tokenix</span>
        <span>ACPI recalculated hourly · prices in USD per million tokens</span>
      </div>
    </footer>
  );
}
