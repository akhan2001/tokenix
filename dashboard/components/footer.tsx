const LINKS = [
  { label: "Index",       href: "/" },
  { label: "Screener",    href: "/screener" },
  { label: "Methodology", href: "/#methodology" },
  { label: "Status",      href: "#" },
  { label: "Terms",       href: "#" },
];

export function Footer() {
  return (
    <footer
      className="home-footer"
      style={{
        borderTop: "1px solid var(--border)",
        padding: "30px 48px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 16,
        flexWrap: "wrap",
      }}
    >
      <div style={{ fontFamily: "var(--sans)", fontSize: 15, color: "var(--text3)" }}>
        Token<span style={{ color: "var(--accent-dim)" }}>ix</span>
      </div>

      <div style={{ display: "flex", gap: 22 }}>
        {LINKS.map(({ label, href }) => (
          <a key={label} href={href} className="footer-link">
            {label}
          </a>
        ))}
      </div>

      <div style={{ fontSize: 10, color: "var(--text3)", letterSpacing: "0.04em" }}>
        © 2026 Tokenix · Prices in USD per million tokens
      </div>
    </footer>
  );
}
