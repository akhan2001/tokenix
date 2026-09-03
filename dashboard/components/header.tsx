import { Container } from "@/components/primitives";

interface HeaderProps {
  /** Which nav item to highlight. "index" = homepage, "screener" = screener page. */
  page?: "index" | "screener" | "calculator" | "methodology";
}

export function Header({ page = "index" }: HeaderProps) {
  return (
    <nav
      style={{
        padding: "18px var(--pad-x)",
        borderBottom: "1px solid var(--border)",
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "var(--header-bg)",
        backdropFilter: "blur(16px)",
      }}
    >
      <Container
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
      {/* Logo */}
      <a
        href="/"
        style={{
          fontFamily: "var(--sans)",
          fontSize: 18,
          fontWeight: 700,
          letterSpacing: "0.04em",
          color: "var(--text)",
          textDecoration: "none",
        }}
      >
        Token<span style={{ color: "var(--accent)" }}>ix</span>
      </a>

      {/* Nav links — hidden on mobile */}
      <ul
        className="hidden md:flex"
        style={{ listStyle: "none", margin: 0, padding: 0, gap: 30 }}
      >
        {(
          [
            { label: "Index",       href: "/",           key: "index" },
            { label: "Screener",    href: "/screener",   key: "screener" },
            { label: "Calculator",  href: "/calculator", key: "calculator" },
            { label: "Methodology", href: "/#methodology", key: "methodology" },
          ] as const
        ).map(({ label, href, key }) => (
          <li key={key}>
            <a
              href={href}
              className={`nav-link${page === key ? " active" : ""}`}
            >
              {label}
            </a>
          </li>
        ))}
      </ul>

      {/* Right: status + CTA */}
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        {page !== "screener" && (
          <a href="/screener" className="nav-cta">
            Live Screener <span className="arr">→</span>
          </a>
        )}
        {page === "screener" && (
          <a href="/" className="nav-cta">
            ← Index
          </a>
        )}
      </div>
      </Container>
    </nav>
  );
}
