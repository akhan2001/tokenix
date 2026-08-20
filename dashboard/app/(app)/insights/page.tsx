import type { Metadata } from "next";

import { AppNav } from "@/components/app-nav";
import { SpendChart } from "@/components/spend-chart";
import { EmptyState, StatCard, StatStrip } from "@/components/stat-card";
import { requireWorkspaceKey } from "@/lib/require-key";
import {
  ApiError,
  fetchModels,
  fetchSummary,
  fetchUsageSeries,
  fmtCompact,
  fmtPct,
  fmtUsd,
  shortModel,
} from "@/lib/tokenix-api";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Insights · Tokenix",
  description: "What your AI traffic cost, and how that compares with the market.",
};

const DAYS = 30;

export default async function InsightsPage() {
  const key = await requireWorkspaceKey();

  let summary, usage, models;
  try {
    [summary, usage, models] = await Promise.all([
      fetchSummary(key),
      fetchUsageSeries(key, DAYS),
      fetchModels(key, DAYS),
    ]);
  } catch (error) {
    return (
      <>
        <AppNav page="insights" connected />
        <section style={{ maxWidth: 1200, margin: "0 auto", padding: "56px 48px" }}>
          <EmptyState
            title="Could not load your spend"
            body={
              error instanceof ApiError
                ? error.message
                : "The analytics API did not respond. Try again in a moment."
            }
          />
        </section>
      </>
    );
  }

  const hasData = summary.total_requests > 0 && usage.series.length > 0;

  return (
    <>
      <AppNav page="insights" connected />

      <section
        className="app-wrap"
        style={{ maxWidth: 1200, margin: "0 auto", width: "100%", padding: "40px 48px 22px" }}
      >
        <div className="sec-kicker">Cost visibility</div>
        <h1
          style={{
            fontFamily: "var(--serif)",
            fontSize: 30,
            fontWeight: 500,
            letterSpacing: "-0.01em",
            color: "var(--text)",
            margin: "0 0 8px",
          }}
        >
          Insights
        </h1>
        <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.9, maxWidth: 620 }}>
          Live spend across every model your workspace calls through the gateway, priced against
          the AI Compute Price Index. Last {DAYS} days.
        </p>
      </section>

      <StatStrip>
        <StatCard
          label="This month"
          value={fmtUsd(summary.this_month_spend_usd)}
          sub={
            summary.mom_change_pct === null
              ? "no prior month to compare"
              : `${fmtPct(summary.mom_change_pct)} vs last month`
          }
          tone="gold"
        />
        <StatCard
          label="vs ACPI benchmark"
          value={fmtPct(summary.vs_acpi_pct)}
          sub={
            summary.vs_acpi_pct === null
              ? "no priced traffic yet"
              : summary.vs_acpi_pct > 0
                ? "above the market rate"
                : "below the market rate"
          }
        />
        <StatCard
          label="Top cost model"
          value={summary.top_model ? shortModel(summary.top_model.model_id) : "—"}
          sub={summary.top_model ? fmtUsd(summary.top_model.cost_usd) + " this month" : "—"}
        />
        <StatCard
          label="Total requests"
          value={fmtCompact(summary.total_requests)}
          sub="this month"
        />
      </StatStrip>

      <section
        className="app-wrap"
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          width: "100%",
          padding: "40px 48px 48px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        {hasData ? (
          <SpendChart points={usage.series} />
        ) : (
          <EmptyState
            title="No priced traffic yet"
            body={
              <>
                Once your first request flows through the gateway it appears here within seconds.
                Check the <a href="/connect" style={{ color: "var(--accent)" }}>Connect</a> page if
                you have not switched your base URL over yet.
              </>
            }
          />
        )}
      </section>

      {models.models.length > 0 && (
        <section
          className="app-wrap"
          style={{ maxWidth: 1200, margin: "0 auto", width: "100%", padding: "40px 48px 64px" }}
        >
          <div className="sec-kicker">Breakdown</div>
          <div
            style={{
              fontFamily: "var(--serif)",
              fontSize: 22,
              fontWeight: 500,
              color: "var(--text)",
              marginBottom: 22,
            }}
          >
            Spend by model
          </div>

          {/* The table doubles as the accessible view of the chart above. */}
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                borderTop: "1px solid var(--border)",
              }}
            >
              <thead>
                <tr>
                  {["Model", "Requests", "Tokens", "Cost", "vs market"].map((h, i) => (
                    <th
                      key={h}
                      scope="col"
                      style={{
                        textAlign: i >= 1 ? "right" : "left",
                        fontWeight: 400,
                        fontSize: 9,
                        letterSpacing: "0.16em",
                        textTransform: "uppercase",
                        color: "var(--text3)",
                        padding: "13px 16px",
                        borderBottom: "1px solid var(--border)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {models.models.map((m) => {
                  const pct = m.acpi_bench_usd
                    ? (m.overpay_usd / m.acpi_bench_usd) * 100
                    : null;
                  return (
                    <tr key={m.model_id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "14px 16px" }}>
                        <div
                          style={{
                            fontFamily: "var(--serif)",
                            fontSize: 15,
                            color: "var(--text)",
                          }}
                        >
                          {shortModel(m.model_id)}
                        </div>
                        <div
                          style={{
                            fontSize: 10,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            color: "var(--text3)",
                            marginTop: 2,
                          }}
                        >
                          {m.provider}
                        </div>
                      </td>
                      <td style={numCell("var(--text2)")}>
                        {m.requests.toLocaleString("en-US")}
                      </td>
                      <td style={numCell("var(--text2)")}>
                        {fmtCompact(m.input_tokens + m.output_tokens)}
                      </td>
                      <td style={numCell("var(--text)")}>{fmtUsd(m.cost_usd)}</td>
                      <td style={numCell("var(--text2)")}>{fmtPct(pct)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}

function numCell(color: string): React.CSSProperties {
  return {
    padding: "14px 16px",
    textAlign: "right",
    fontFamily: "var(--mono)",
    fontSize: 13,
    color,
    whiteSpace: "nowrap",
  };
}
