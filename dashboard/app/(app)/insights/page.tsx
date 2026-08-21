import type { Metadata } from "next";

import { AppNav } from "@/components/app-nav";
import { BarList } from "@/components/bar-list";
import { DailyBars } from "@/components/daily-bars";
import { HeadlineFact, HeadlineFigure } from "@/components/headline-figure";
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

  // Two points, not one: SpendChart draws a trend between days and returns
  // null below that, which would leave this section blank rather than
  // explaining itself.
  const hasData = summary.total_requests > 0 && usage.series.length >= 2;
  const singleDay = summary.total_requests > 0 && usage.series.length === 1;

  return (
    <>
      <AppNav page="insights" connected />

      <section
        className="app-wrap"
        style={{ maxWidth: 1200, margin: "0 auto", width: "100%", padding: "40px 48px 22px" }}
      >
        <h1 className="sr-only">Insights</h1>
        <HeadlineFigure
          kicker="Cost visibility"
          value={fmtUsd(summary.this_month_spend_usd)}
          caption={`This month's AI spend · last ${DAYS} days through the gateway`}
          aside={
            <>
              <HeadlineFact
                tone={
                  summary.mom_change_pct === null
                    ? "plain"
                    : summary.mom_change_pct > 0
                      ? "up"
                      : "down"
                }
              >
                {summary.mom_change_pct === null
                  ? "— no prior month to compare"
                  : `${summary.mom_change_pct > 0 ? "↑" : "↓"} ${fmtPct(
                      summary.mom_change_pct,
                    )} vs last month`}
              </HeadlineFact>
              <HeadlineFact>
                {models.models.length.toLocaleString("en-US")} model
                {models.models.length === 1 ? "" : "s"} in your traffic
              </HeadlineFact>
              <HeadlineFact>
                {fmtCompact(summary.total_requests)} requests this month
              </HeadlineFact>
            </>
          }
        />
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
            title={singleDay ? "One day of traffic so far" : "No priced traffic yet"}
            body={
              singleDay ? (
                <>
                  A spend trend needs at least two days to plot. Today&rsquo;s totals are in the
                  breakdown below, and this chart fills in from tomorrow.
                </>
              ) : (
                <>
                  Once your first request flows through the gateway it appears here within seconds.
                  Check the <a href="/connect" style={{ color: "var(--accent)" }}>Connect</a> page
                  if you have not switched your base URL over yet.
                </>
              )
            }
          />
        )}
      </section>

      {models.models.length > 0 && (
        <section
          className="app-wrap"
          style={{ maxWidth: 1200, margin: "0 auto", width: "100%", padding: "40px 48px 64px" }}
        >
          <div className="app-duo" style={{ marginBottom: 46 }}>
            <div>
              <div className="sec-kicker">Breakdown</div>
              <h2 style={panelTitle}>Spend by model</h2>
              <BarList
                rows={[...models.models]
                  .sort((a, b) => b.cost_usd - a.cost_usd)
                  .slice(0, 8)
                  .map((m) => ({
                    id: m.model_id,
                    label: shortModel(m.model_id),
                    sub: m.provider,
                    value: m.cost_usd,
                    display: fmtUsd(m.cost_usd),
                  }))}
              />
            </div>
            <div>
              <div className="sec-kicker">Daily</div>
              <h2 style={panelTitle}>Spend by day</h2>
              <DailyBars
                points={usage.series.map((d) => ({
                  day: d.day,
                  cost_usd: d.cost_usd,
                  requests: d.requests,
                }))}
              />
            </div>
          </div>

          <div className="sec-kicker">Detail</div>
          <div
            style={{
              fontFamily: "var(--serif)",
              fontSize: 22,
              fontWeight: 500,
              color: "var(--text)",
              marginBottom: 22,
            }}
          >
            Every model, in full
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

const panelTitle: React.CSSProperties = {
  fontFamily: "var(--serif)",
  fontSize: 19,
  fontWeight: 500,
  color: "var(--text)",
  margin: "6px 0 20px",
};

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
