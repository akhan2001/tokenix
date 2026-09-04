import type { ReactNode } from "react";

/**
 * The title row every product page opens with — extracted from /dashboard's
 * Overview so Insights, Forecast, and Connect share exactly one
 * implementation of "title + optional status pill + subtitle, controls on
 * the right" instead of four hand-copied versions.
 */
export function DashPageHeader({
  title,
  pill,
  subtitle,
  controls,
}: {
  title: string;
  pill?: { label: string; on: boolean };
  subtitle?: ReactNode;
  controls?: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 16,
        marginBottom: 18,
      }}
    >
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 500,
              letterSpacing: "-0.01em",
              margin: 0,
              color: "var(--text)",
            }}
          >
            {title}
          </h1>
          {pill && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "4px 10px",
                borderRadius: 20,
                background: pill.on ? "rgba(76,175,125,0.1)" : "rgba(138,138,147,0.1)",
                border: `1px solid ${pill.on ? "rgba(76,175,125,0.24)" : "rgba(138,138,147,0.24)"}`,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: pill.on ? "var(--green)" : "var(--text2)",
                }}
              />
              <span style={{ fontSize: 11.5, color: pill.on ? "var(--green)" : "var(--text2)" }}>
                {pill.label}
              </span>
            </div>
          )}
        </div>
        {subtitle && <div style={{ fontSize: 12.5, color: "var(--text2)", marginTop: 6 }}>{subtitle}</div>}
      </div>

      {controls && <div style={{ display: "flex", alignItems: "center", gap: 10 }}>{controls}</div>}
    </div>
  );
}
