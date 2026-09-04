import Link from "next/link";

/**
 * A pill-style tab bar that navigates via plain links, not client state —
 * same visual language as PeriodTabs' segmented control, generalized for any
 * set of href/label pairs. Insights' Insights/Benchmark switch uses this
 * rather than the marketing site's `.range-tab` class: that class is mono,
 * tracked-caps styling, which is exactly what this redesign moves labels and
 * headers away from. `.range-tab` still fits CodeBlock's Python/TypeScript/
 * cURL switcher on Connect, since that one is choosing a representation of
 * code, not navigating.
 *
 * A server component works here because navigation is the only behavior —
 * no client state to hold, so no "use client" boundary is needed.
 */
export function LinkTabs({
  items,
}: {
  items: { href: string; label: string; active: boolean }[];
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        gap: 2,
        background: "var(--s1)",
        border: "1px solid var(--border)",
        borderRadius: 9,
        padding: 3,
      }}
    >
      {items.map(({ href, label, active }) => (
        <Link
          key={href}
          href={href}
          aria-current={active ? "page" : undefined}
          style={{
            padding: "6px 14px",
            borderRadius: 6,
            fontSize: 12.5,
            color: active ? "var(--text)" : "var(--text2)",
            background: active ? "var(--s2)" : "transparent",
            textDecoration: "none",
          }}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}
