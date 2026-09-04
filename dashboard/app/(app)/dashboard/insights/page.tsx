import type { Metadata } from "next";

import { DashPageHeader } from "@/components/dashboard/dash-page-header";
import { LinkTabs } from "@/components/dashboard/link-tabs";
import { MetricRow } from "@/components/dashboard/metric-row";
import { DashCard } from "@/components/dashboard/dash-card";
import { SpendBenchmarkChart } from "@/components/dashboard/spend-benchmark-chart";
import { DailySpendBars } from "@/components/dashboard/daily-spend-bars";
import { ModelSpendBars } from "@/components/dashboard/model-spend-bars";
import { OverviewTable } from "@/components/dashboard/overview-table";
import { ExportMenu } from "@/components/dashboard/export-menu";
import { EmptyState } from "@/components/stat-card";
import { loadAcpi } from "@/lib/data";
import { requireWorkspaceKey } from "@/lib/require-key";
import {
  ApiError,
  fetchBenchmark,
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

type View = "overview" | "benchmark";

function currentMonth(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Insights, with Benchmark folded in as a `?view=benchmark` sub-view — the
 * sidebar's five icons come from the approved design and don't include
 * Benchmark on its own. See components/dashboard/sidebar.tsx.
 *
 * Rebuilt onto the same Card/Inter/recharts system as /dashboard: DashCard
 * surfaces, MetricRow for headline figures, recharts for every chart
 * (SpendBenchmarkChart, DailySpendBars, ModelSpendBars — replacing the
 * hand-rolled SpendChart/DailyBars/BarList, which were dashboard-only and
 * are now unused). Table rows reuse OverviewTable rather than a second
 * hand-rolled table, since the columns are identical.
 */
export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const key = await requireWorkspaceKey();
  const { view: viewParam } = await searchParams;
  const view: View = viewParam === "benchmark" ? "benchmark" : "overview";

  const tabs = (
    <LinkTabs
      items={[
        { href: "/dashboard/insights", label: "Insights", active: view === "overview" },
        { href: "/dashboard/insights?view=benchmark", label: "Benchmark", active: view === "benchmark" },
      ]}
    />
  );

  return (
    <Shell>
      <DashPageHeader title="Insights" subtitle={`Last ${DAYS} days`} controls={tabs} />
      {view === "overview" ? await OverviewView({ workspaceKey: key }) : await BenchmarkView({ workspaceKey: key })}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <section style={{ maxWidth: 1280, margin: "0 auto", width: "100%", padding: "30px 34px 34px" }}>
      {children}
    </section>
  );
}

// ── Insights view ────────────────────────────────────────────────────────

async function OverviewView({ workspaceKey }: { workspaceKey: string }) {
  let summary, usage, models;
  try {
    [summary, usage, models] = await Promise.all([
      fetchSummary(workspaceKey),
      fetchUsageSeries(workspaceKey, DAYS),
      fetchModels(workspaceKey, DAYS),
    ]);
  } catch (error) {
    return (
      <EmptyState
        title="Could not load your spend"
        body={error instanceof ApiError ? error.message : "The analytics API did not respond. Try again in a moment."}
      />
    );
  }

  const hasData = summary.total_requests > 0 && usage.series.length >= 2;
  const singleDay = summary.total_requests > 0 && usage.series.length === 1;

  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
        <ExportMenu days={DAYS} month={currentMonth()} />
      </div>

      <div style={{ marginBottom: 18 }}>
        <MetricRow
          metrics={[
            {
              label: "This month",
              value: fmtUsd(summary.this_month_spend_usd),
              width: "1.2fr",
              sub:
                summary.mom_change_pct === null
                  ? "no prior month to compare"
                  : `${fmtPct(summary.mom_change_pct)} vs last month`,
            },
            {
              label: "vs ACPI benchmark",
              value: fmtPct(summary.vs_acpi_pct),
              sub:
                summary.vs_acpi_pct === null
                  ? "no priced traffic yet"
                  : summary.vs_acpi_pct > 0
                    ? "above the market rate"
                    : "below the market rate",
            },
            {
              label: "Top cost model",
              value: summary.top_model ? shortModel(summary.top_model.model_id) : "—",
              sub: summary.top_model ? `${fmtUsd(summary.top_model.cost_usd)} this month` : undefined,
            },
            {
              label: "Total requests",
              value: fmtCompact(summary.total_requests),
              sub: "this month",
            },
          ]}
        />
      </div>

      <DashCard padding="24px 28px 20px" style={{ marginBottom: 18, height: 340, display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 14.5, fontWeight: 500, color: "var(--text)", marginBottom: 4 }}>
          Spend vs ACPI benchmark
        </div>
        <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 8 }}>Last {DAYS} days</div>
        <div style={{ flex: 1, minHeight: 0 }}>
          {hasData ? (
            <SpendBenchmarkChart points={usage.series.map((p) => ({ day: p.day, cost_usd: p.cost_usd, acpi_bench_usd: p.acpi_bench_usd }))} />
          ) : (
            <EmptyState
              title={singleDay ? "One day of traffic so far" : "No priced traffic yet"}
              body={
                singleDay ? (
                  "A spend trend needs at least two days to plot. Today's totals are in the breakdown below."
                ) : (
                  <>
                    Once your first request flows through the gateway it appears here within seconds. Check{" "}
                    <a href="/dashboard/connect" style={{ color: "var(--accent)" }}>Connect</a> if you have not
                    switched your base URL over yet.
                  </>
                )
              }
            />
          )}
        </div>
      </DashCard>

      {models.models.length > 0 && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
            <DashCard>
              <div style={{ fontSize: 14.5, fontWeight: 500, color: "var(--text)", marginBottom: 16 }}>
                Spend by model
              </div>
              <ModelSpendBars
                rows={[...models.models]
                  .sort((a, b) => b.cost_usd - a.cost_usd)
                  .slice(0, 8)
                  .map((m) => ({
                    id: m.model_id,
                    label: shortModel(m.model_id),
                    value: m.cost_usd,
                    display: fmtUsd(m.cost_usd),
                  }))}
              />
            </DashCard>
            <DashCard>
              <div style={{ fontSize: 14.5, fontWeight: 500, color: "var(--text)", marginBottom: 16 }}>
                Spend by day
              </div>
              <DailySpendBars
                points={usage.series.map((d) => ({ day: d.day, cost_usd: d.cost_usd, requests: d.requests }))}
              />
            </DashCard>
          </div>

          <DashCard padding="22px 24px">
            <div style={{ fontSize: 14.5, fontWeight: 500, color: "var(--text)", marginBottom: 16 }}>
              Every model, in full
            </div>
            <OverviewTable
              rows={models.models.map((m) => ({
                model_id: m.model_id,
                provider: m.provider,
                requests: m.requests,
                cost_usd: m.cost_usd,
                acpi_bench_usd: m.acpi_bench_usd,
                overpay_usd: m.overpay_usd,
              }))}
            />
          </DashCard>
        </>
      )}
    </>
  );
}

// ── Benchmark view ───────────────────────────────────────────────────────

const ABOVE = "var(--red)";
const BELOW = "var(--green)";
const NEUTRAL = "var(--text3)";

function DivergingBar({ pct, max }: { pct: number | null; max: number }) {
  if (pct === null || max <= 0) {
    return <span style={{ color: NEUTRAL, fontSize: 11 }}>—</span>;
  }
  const half = Math.min(Math.abs(pct) / max, 1) * 50;
  const above = pct > 0;
  return (
    <div style={{ position: "relative", width: 120, height: 8, background: "var(--s2)", marginLeft: "auto" }} aria-hidden="true">
      <div style={{ position: "absolute", left: "50%", top: -2, width: 1, height: 12, background: "var(--border2)" }} />
      <div
        style={{
          position: "absolute",
          top: 0,
          height: 8,
          background: above ? ABOVE : BELOW,
          left: above ? "50%" : `${50 - half}%`,
          width: `${half}%`,
          borderRadius: 2,
        }}
      />
    </div>
  );
}

async function BenchmarkView({ workspaceKey }: { workspaceKey: string }) {
  const acpiRate = loadAcpi()?.acpi ?? null;

  let data;
  try {
    data = await fetchBenchmark(workspaceKey, DAYS);
  } catch (error) {
    return (
      <EmptyState
        title="Could not load the benchmark"
        body={error instanceof ApiError ? error.message : "The analytics API did not respond. Try again in a moment."}
      />
    );
  }

  const worstPct = Math.max(...data.models.map((m) => Math.abs(m.overpay_pct ?? 0)), 1);
  const overpaying = data.overpay_usd > 0;

  return (
    <>
      <div style={{ marginBottom: 12 }}>
        <MetricRow
          metrics={[
            { label: "You paid", value: fmtUsd(data.total_cost_usd), width: "1.2fr" },
            { label: "Market rate", value: fmtUsd(data.acpi_benchmark_usd) },
            {
              label: overpaying ? "Overpaid" : "Saved vs market",
              value: fmtUsd(Math.abs(data.overpay_usd)),
              color: overpaying ? ABOVE : BELOW,
              sub: `${fmtPct(data.overpay_pct)} vs market${acpiRate !== null ? ` · ACPI $${acpiRate.toFixed(4)}/1M SCU` : ""}`,
            },
          ]}
        />
      </div>

      <p style={{ fontSize: 12.5, color: "var(--text2)", lineHeight: 1.8, maxWidth: 660, margin: "0 0 24px" }}>
        Every request you sent, repriced at the market-wide ACPI rate for the same token volume. The gap is what
        your model choices cost you relative to the market.
      </p>

      {data.models.length === 0 ? (
        <EmptyState
          title="Nothing to benchmark yet"
          body="Once priced traffic flows through the gateway, this page compares it with the market rate model by model."
        />
      ) : (
        <>
          <DashCard padding="22px 24px" style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 14.5, fontWeight: 500, color: "var(--text)", marginBottom: 16 }}>
              Every model, priced against the market
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
                <thead>
                  <tr>
                    {["Model", "Tokens", "Actual", "ACPI rate", "Difference", "", "Status"].map((h, i) => (
                      <th
                        key={h + i}
                        scope="col"
                        style={{
                          textAlign: i === 0 || i === 6 ? "left" : "right",
                          fontWeight: 400,
                          fontSize: 11,
                          color: "var(--text3)",
                          padding: "0 0 9px",
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
                  {data.models.map((m) => {
                    const above = m.status === "above_market";
                    const known = m.overpay_pct !== null;
                    return (
                      <tr key={m.model_id} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "12.5px 0" }}>
                          <div style={{ fontSize: 12.5, color: "var(--text)" }}>{shortModel(m.model_id)}</div>
                          <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>
                            {m.provider}
                            {m.acpi_score !== null && ` · P1 ${m.acpi_score.toFixed(1)}`}
                          </div>
                        </td>
                        <td style={cell}>{fmtCompact(m.tokens)}</td>
                        <td style={{ ...cell, color: "var(--text)" }}>{fmtUsd(m.cost_usd)}</td>
                        <td style={cell}>{fmtUsd(m.acpi_bench_usd)}</td>
                        <td style={{ ...cell, color: "var(--text)" }}>
                          {m.overpay_usd > 0 ? "+" : ""}
                          {fmtUsd(m.overpay_usd)}
                          <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 3 }}>{fmtPct(m.overpay_pct)}</div>
                        </td>
                        <td style={{ padding: "12.5px 0" }}>
                          <DivergingBar pct={m.overpay_pct} max={worstPct} />
                        </td>
                        <td style={{ padding: "12.5px 0", whiteSpace: "nowrap" }}>
                          <span style={{ fontSize: 11.5, color: !known ? NEUTRAL : above ? ABOVE : BELOW }}>
                            {!known ? "—" : above ? "Above market" : "Below market"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </DashCard>

          {data.opportunities.length > 0 && (
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 500, color: "var(--text)", marginBottom: 14 }}>
                Savings opportunities
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
                {data.opportunities.slice(0, 3).map((o) => (
                  <DashCard key={o.model_id} style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 16, minHeight: 116 }}>
                    <div style={{ fontSize: 12.5, color: "var(--text2)", lineHeight: 1.7 }}>{o.action}</div>
                    <div style={{ fontSize: 24, color: "var(--accent)", lineHeight: 1 }}>{fmtUsd(o.potential_saving_usd)}</div>
                  </DashCard>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

const cell: React.CSSProperties = {
  padding: "12.5px 0",
  textAlign: "right",
  fontSize: 12.5,
  color: "var(--text2)",
  whiteSpace: "nowrap",
  fontVariantNumeric: "tabular-nums",
};
