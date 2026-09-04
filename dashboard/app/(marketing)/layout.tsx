import type { ReactNode } from "react";

import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

/**
 * Shell for the public site: home, screener, calculator.
 *
 * Previously each of the three pages imported <Header> and <Footer> and
 * wrapped itself in the same background/flex div independently — the product
 * area had a single shared layout for exactly this and the marketing side
 * didn't. This is that layout: one definition of the chrome, so a change to
 * either component lands on all three pages at once instead of needing to be
 * copied three times.
 *
 * `(marketing)` is a route group — it adds no path segment, so / , /screener
 * and /calculator are unchanged.
 */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        background: "var(--bg)",
        color: "var(--text)",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Header />
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>{children}</div>
      <Footer />
    </div>
  );
}
