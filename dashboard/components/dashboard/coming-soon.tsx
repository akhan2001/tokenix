import Link from "next/link";

/**
 * Placeholder for a nav destination with no page behind it yet.
 *
 * The sidebar links to Budgets and Reports because they're in the approved
 * design's nav rail — but neither has a backing feature or API endpoint in
 * this codebase. A dead link would read as a bug; this reads as "not built
 * yet," which is the honest state.
 */
export function ComingSoon({ title }: { title: string }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        padding: 40,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.01em", color: "#ededf0" }}>
        {title}
      </div>
      <p style={{ fontSize: 13.5, color: "#8a8a93", maxWidth: "38ch", lineHeight: 1.7, margin: 0 }}>
        This page is coming soon.
      </p>
      <Link
        href="/dashboard"
        style={{
          marginTop: 10,
          fontSize: 13,
          color: "#ffa515",
          textDecoration: "none",
        }}
      >
        ← Back to Overview
      </Link>
    </div>
  );
}
