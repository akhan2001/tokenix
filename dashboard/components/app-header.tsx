import Link from "next/link";

import { WORDMARK } from "@/components/primitives";

/**
 * The product area's identity bar.
 *
 * app/(app) used to render the marketing <Header>, which meant a signed-in
 * customer got two stacked navs — Screener / Calculator / Methodology above the
 * product tabs — with the top one selling them the public site they had already
 * bought past. This replaces it: a wordmark, and nothing else, because <AppNav>
 * directly beneath it is the actual navigation.
 *
 * Width is 1080 to match <AppNav>, so the wordmark, the tabs and the page
 * content share one left edge.
 */
export function AppHeader() {
  return (
    <div
      style={{
        maxWidth: 1080,
        margin: "0 auto",
        width: "100%",
        padding: "20px var(--pad-x) 16px",
      }}
    >
      <Link href="/dashboard" style={{ ...WORDMARK, color: "var(--ink)" }}>
        TOKENIX
      </Link>
    </div>
  );
}
