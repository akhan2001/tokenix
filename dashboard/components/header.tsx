"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Show } from "@clerk/nextjs";
import { Container, WORDMARK } from "@/components/primitives";

/**
 * The public site's nav.
 *
 * This is marketing chrome and belongs only to anonymous traffic — the product
 * area under app/(app) carries its own icon-rail <Sidebar> instead, with no
 * top bar at all. What this header does owe a signed-in visitor is a way
 * back: someone who already pays for this landing on the homepage should see
 * "Dashboard", not a pitch for the screener they are already entitled to.
 *
 * <Show> is the Core 3 replacement for <SignedIn>/<SignedOut>, which v7 removed
 * — the old names typecheck fine and then throw at prerender, so the build is
 * the only thing that catches them.
 *
 * Active state used to be a `page` prop threaded in by every marketing page
 * individually. Since app/(marketing)/layout.tsx now mounts this once for all
 * three pages, there is no per-page call site left to pass one — so it reads
 * its own pathname instead. This is a client component for that reason alone;
 * everything else here is static.
 */
type NavKey = "screener" | "calculator";

function activeKey(pathname: string): NavKey | null {
  if (pathname.startsWith("/screener")) return "screener";
  if (pathname.startsWith("/calculator")) return "calculator";
  return null;
}

export function Header() {
  const pathname = usePathname();
  const active = activeKey(pathname);
  const onScreener = active === "screener";

  return (
    <nav
      style={{
        padding: "18px var(--pad-x)",
        // borderBottom: "1px solid var(--border)",
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
      {/* <Link href="/" style={{ ...WORDMARK, color: "var(--text)" }}>
        Token<span style={{ color: "var(--accent)" }}>ix</span>
      </Link> */}
      <div
        style={{ ...WORDMARK, color: "var(--ink)" }}
      >
        TOKENIX
      </div>

      {/* Nav links — hidden on mobile */}
      <ul
        className="hidden md:flex"
        style={{ listStyle: "none", margin: 0, padding: 0, gap: 30 }}
      >
        {(
          [
            // { label: "Index",       href: "/",           key: "index" },
            { label: "Screener",    href: "/screener",   key: "screener" },
            { label: "Calculator",  href: "/calculator", key: "calculator" },
            { label: "Methodology", href: "/#methodology", key: "methodology" },
          ] as const
        ).map(({ label, href, key }) => (
          <li key={key}>
            <Link
              href={href}
              className={`nav-link${active === key ? " active" : ""}`}
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>

      {/* Right: status + CTA */}
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <Show
          when="signed-in"
          fallback={
            onScreener ? (
              <Link href="/" className="nav-cta">
                ← Index
              </Link>
            ) : (
              <Link href="/screener" className="nav-cta">
                Live Screener <span className="arr">→</span>
              </Link>
            )
          }
        >
          <Link href="/dashboard" className="nav-cta">
            Dashboard <span className="arr">→</span>
          </Link>
        </Show>
      </div>
      </Container>
    </nav>
  );
}
