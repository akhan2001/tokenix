import { SignOutButton } from "@clerk/nextjs";

export type AppPage = "overview" | "connect" | "insights" | "benchmark" | "forecast";

const TABS: { label: string; href: string; key: AppPage }[] = [
  // Overview leads: it is the post-onboarding home, and the only tab that
  // answers "are we overpaying" without the reader picking a lens first.
  { label: "Overview", href: "/dashboard", key: "overview" },
  { label: "Insights", href: "/dashboard/insights", key: "insights" },
  { label: "Benchmark", href: "/dashboard/benchmark", key: "benchmark" },
  { label: "Forecast", href: "/dashboard/forecast", key: "forecast" },
  { label: "Connect", href: "/dashboard/connect", key: "connect" },
];

interface AppNavProps {
  page: AppPage;
  /** Hidden when there is no session to end. */
  connected?: boolean;
}

export function AppNav({ page, connected = false }: AppNavProps) {
  return (
    <div
      style={{
        maxWidth: 1080,
        margin: "0 auto",
        width: "100%",
        padding: "0 var(--pad-x)",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 24,
      }}
    >
      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "flex",
          gap: 4,
        }}
      >
        {TABS.map(({ label, href, key }) => {
          const active = page === key;
          return (
            <li key={key}>
              <a
                href={href}
                style={{
                  display: "inline-block",
                  padding: "16px 18px",
                  fontSize: 11,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  textDecoration: "none",
                  color: active ? "var(--accent)" : "var(--text3)",
                  borderBottom: `1px solid ${active ? "var(--accent)" : "transparent"}`,
                  marginBottom: -1,
                }}
              >
                {label}
              </a>
            </li>
          );
        })}
      </ul>

      {connected && (
        <SignOutButton redirectUrl="/">
          <button
            type="button"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: "var(--mono)",
              fontSize: 10,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--text3)",
              padding: 0,
            }}
          >
            Sign out
          </button>
        </SignOutButton>
      )}
    </div>
  );
}
