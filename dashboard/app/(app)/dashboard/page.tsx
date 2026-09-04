import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { DashCard } from "@/components/dashboard/dash-card";
import { PeriodTabs } from "@/components/dashboard/period-tabs";
import { daysFor, type Period } from "@/lib/period";
import { SpendBenchmarkChart } from "@/components/dashboard/spend-benchmark-chart";
import { OverviewTable } from "@/components/dashboard/overview-table";
import { ExportMenu } from "@/components/dashboard/export-menu";
import { EmptyState } from "@/components/stat-card";
import { requireClerkUser } from "@/lib/require-key";
import { findWorkspace } from "@/lib/workspace";
import { ApiError, fetchModels, fetchSummary, fetchUsageSeries, fmtUsd, fmtPct } from "@/lib/tokenix-api";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Overview · Tokenix",
  description: "What you spent, what the market rate was, and the gap between them.",
};

function isPeriod(v: string | undefined): v is Period {
  return v === "week" || v === "month" || v === "quarter" || v === "year";
}

function currentMonth(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * The post-onboarding home — rebuilt against the approved Claude Design
 * project ("Crypto dashboard homepage design", `Tokenix Dashboard.dc.html`),
 * not the marketing site's visual language the first pass at this page
 * carried over (mono kickers, tracked-caps labels, a single vertical column
 * with one bordered box). This version: grey Card surfaces for every
 * distinct block, Inter throughout, and the design's actual grid — one hero
 * card, a chart card, then a row of three smaller supporting cards.
 *
 * Two departures from the design file worth being explicit about, because
 * they replace decorative placeholder content with what the backend can
 * actually answer rather than porting the placeholder as if it were real:
 *
 * 1. "Recent activity" (a live per-request feed) has no backing endpoint —
 *    there is no such route in lib/tokenix-api.ts. Rather than fabricate
 *    request rows, the third supporting card is workspace/connection status,
 *    which mirrors what the previous version of this page's footer showed
 *    and is genuinely available.
 * 2. The headline figures and chart total the SELECTED PERIOD's usage
 *    series, not `summary.this_month_spend_usd` (which is always calendar-
 *    month regardless of which period tab is active) — otherwise picking
 *    "Week" would keep showing the month's number.
 *
 * No longer handles `?welcome=1` or minting — that moved to /dashboard/
 * connect, which is now the sole onboarding surface (key, provider setup,
 * code snippet and a live test, all in one place, all before anyone lands
 * here). A signed-in person with no workspace at all is sent there instead.
 */
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period: periodParam } = await searchParams;
  const period: Period = isPeriod(periodParam) ? periodParam : "month";
  const days = daysFor(period);

  const user = await requireClerkUser();
  const workspace = await findWorkspace(user.id);
  if (!workspace) redirect("/dashboard/connect");
  const { workspace_id: workspaceId, name, key_prefix: keyPrefix } = workspace;

  let summary, usage, models;
  try {
    [summary, usage, models] = await Promise.all([
      fetchSummary(workspaceId),
      fetchUsageSeries(workspaceId, days),
      fetchModels(workspaceId, days),
    ]);
  } catch (error) {
    return (
      <Shell>
        <EmptyState
          title="Could not load your overview"
          body={
            error instanceof ApiError
              ? error.message
              : "The analytics API did not respond. Try again in a moment."
          }
        />
      </Shell>
    );
  }

  const spend = usage.series.reduce((sum, p) => sum + p.cost_usd, 0);
  const reference = usage.series.reduce((sum, p) => sum + p.acpi_bench_usd, 0);
  const totalRequests = usage.series.reduce((sum, p) => sum + p.requests, 0);
  const gap = spend - reference;
  const gapPct = reference > 0 ? (gap / reference) * 100 : null;
  const over = gap > 0;
  const connected = totalRequests > 0;

  const providerCount = new Set(models.models.map((m) => m.provider).filter(Boolean)).size;

  const periodLabel: Record<Period, string> = {
    week: "last 7 days",
    month: "last 30 days",
    quarter: "last 90 days",
    year: "last 12 months",
  };

  return (
    <Shell>
        {/* ── Header row ────────────────────────────────────────────── */}
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
              <h1 style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.01em", margin: 0, color: "#ededf0" }}>
                Overview
              </h1>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "4px 10px",
                  borderRadius: 20,
                  background: connected ? "rgba(76,175,125,0.1)" : "rgba(138,138,147,0.1)",
                  border: `1px solid ${connected ? "rgba(76,175,125,0.24)" : "rgba(138,138,147,0.24)"}`,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: connected ? "#4caf7d" : "#8a8a93",
                  }}
                />
                <span style={{ fontSize: 11.5, color: connected ? "#4caf7d" : "#8a8a93" }}>
                  {connected ? "Connected" : "Waiting for traffic"}
                </span>
              </div>
            </div>
            <div style={{ fontSize: 12.5, color: "#8a8a93", marginTop: 6 }}>
              {name} workspace · {periodLabel[period]}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <PeriodTabs active={period} />
            <ExportMenu days={days} month={currentMonth()} />
          </div>
        </div>

        {/* ── Hero card ─────────────────────────────────────────────── */}
        <DashCard
          padding="28px 30px"
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 1fr 1.05fr",
            gap: 34,
            alignItems: "end",
            marginBottom: 18,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, color: "#8a8a93", marginBottom: 12 }}>
              Spend · {periodLabel[period]}
            </div>
            <div style={{ fontSize: "clamp(38px, 5vw, 58px)", fontWeight: 400, letterSpacing: "-0.03em", lineHeight: 1, color: "#ededf0" }}>
              {fmtUsd(spend)}
            </div>
            <div style={{ fontSize: 12.5, color: "#8a8a93", marginTop: 11 }}>
              {totalRequests.toLocaleString("en-US")} requests
            </div>
          </div>

          <div style={{ paddingLeft: 32, borderLeft: "1px solid rgba(255,255,255,0.08)", minWidth: 0 }}>
            <div style={{ fontSize: 12, color: "#8a8a93", marginBottom: 12 }}>
              ACPI fair price · same usage
            </div>
            <div style={{ fontSize: 34, fontWeight: 400, letterSpacing: "-0.02em", lineHeight: 1, color: "#c8c8d0" }}>
              {fmtUsd(reference)}
            </div>
            <div style={{ fontSize: 12.5, color: "#8a8a93", marginTop: 11 }}>
              {summary.acpi_benchmark_usd > 0 ? "index-rate reference" : "no reference volume yet"}
            </div>
          </div>

          <div style={{ paddingLeft: 32, borderLeft: "1px solid rgba(255,255,255,0.08)", minWidth: 0 }}>
            <div style={{ fontSize: 12, color: "#8a8a93", marginBottom: 12 }}>Delta to benchmark</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              <span style={{ fontSize: 34, fontWeight: 450, letterSpacing: "-0.02em", lineHeight: 1, color: over ? "#e0644f" : "#4caf7d" }}>
                {gapPct === null ? "—" : `${over ? "+" : ""}${fmtPct(gapPct)}`}
              </span>
              {gapPct !== null && (
                <span style={{ fontSize: 17, color: over ? "#e0644f" : "#4caf7d" }}>
                  {over ? "↑" : "↓"} {fmtUsd(Math.abs(gap))}
                </span>
              )}
            </div>
            <div style={{ fontSize: 12.5, color: "#8a8a93", marginTop: 11 }}>
              {gapPct === null
                ? "No reference volume yet"
                : over
                  ? "Above ACPI fair price for this usage"
                  : "Below ACPI fair price for this usage"}
            </div>
          </div>
        </DashCard>

        {/* ── Chart card ────────────────────────────────────────────── */}
        <DashCard padding="24px 28px 20px" style={{ marginBottom: 18, height: 340, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 500, color: "#ededf0" }}>Spend vs ACPI benchmark</div>
              <div style={{ fontSize: 12, color: "#8a8a93", marginTop: 4 }}>
                Stepped — index recalculated hourly, {periodLabel[period]}
              </div>
            </div>
            <div style={{ display: "flex", gap: 18, fontSize: 12, color: "#8a8a93" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ width: 11, height: 2, background: "#ffa515", display: "inline-block" }} />
                Actual spend
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ width: 11, height: 2, background: "#6a6a74", display: "inline-block" }} />
                ACPI reference
              </span>
            </div>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <SpendBenchmarkChart
              points={usage.series.map((p) => ({
                day: p.day,
                cost_usd: p.cost_usd,
                acpi_bench_usd: p.acpi_bench_usd,
              }))}
            />
          </div>
        </DashCard>

        {/* ── Supporting row ────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1.35fr 1.35fr 0.85fr", gap: 18 }}>
          <DashCard style={{ display: "flex", flexDirection: "column", gap: 13 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div style={{ fontSize: 14.5, fontWeight: 500, color: "#ededf0" }}>Top models by spend</div>
              <div style={{ fontSize: 11.5, color: "#6f6f78" }}>vs ACPI reference</div>
            </div>
            <OverviewTable
              rows={models.models
                .slice()
                .sort((a, b) => b.cost_usd - a.cost_usd)
                .slice(0, 6)
                .map((m) => ({
                  model_id: m.model_id,
                  provider: m.provider,
                  requests: m.requests,
                  cost_usd: m.cost_usd,
                  acpi_bench_usd: m.acpi_bench_usd,
                  overpay_usd: m.overpay_usd,
                }))}
            />
          </DashCard>

          <DashCard style={{ display: "flex", flexDirection: "column", gap: 13 }}>
            <div style={{ fontSize: 14.5, fontWeight: 500, color: "#ededf0" }}>Connection</div>
            <Row label="Workspace key">
              {keyPrefix ? (
                <>
                  <span style={{ color: "#c8c8d0" }}>{keyPrefix}…</span>{" "}
                  <span style={{ color: connected ? "#4caf7d" : "#8a8a93" }}>
                    {connected ? "active" : "issued"}
                  </span>
                </>
              ) : (
                <span style={{ color: "#6f6f78" }}>No key issued</span>
              )}
            </Row>
            <Row label={`Requests · ${periodLabel[period]}`}>{totalRequests.toLocaleString("en-US")}</Row>
            <Row label="Manage">
              <a href="/dashboard/connect" style={{ color: "#ffa515" }}>
                Connect or rotate a key →
              </a>
            </Row>
            <Row label="Reference">
              <a href="/#methodology" style={{ color: "#ffa515" }}>
                How ACPI is calculated →
              </a>
            </Row>
          </DashCard>

          <DashCard style={{ display: "flex", flexDirection: "column", gap: 15 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: "#c8c8d0" }}>Quick stats</div>
            <Stat label="Total requests" value={totalRequests.toLocaleString("en-US")} />
            <Stat label="Active models" value={String(models.models.length)} />
            <Stat label="Providers connected" value={String(providerCount)} last />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11.5, color: "#6f6f78" }}>Connection</span>
              <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: connected ? "#4caf7d" : "#8a8a93" }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: connected ? "#4caf7d" : "#8a8a93" }} />
                {connected ? "Healthy" : "No traffic yet"}
              </span>
            </div>
          </DashCard>
        </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <section
      style={{
        maxWidth: 1280,
        margin: "0 auto",
        width: "100%",
        padding: "30px 34px 34px",
        fontFamily:
          "Inter, var(--sans), 'Neue Haas Grotesk', 'Helvetica Neue', Helvetica, Arial, sans-serif",
      }}
    >
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 12.5 }}>
      <span style={{ color: "#8a8a93" }}>{label}</span>
      <span>{children}</span>
    </div>
  );
}

function Stat({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        paddingBottom: last ? 0 : 11,
        borderBottom: last ? "none" : "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <span style={{ fontSize: 12, color: "#8a8a93" }}>{label}</span>
      <span style={{ fontSize: 15, fontWeight: 450, color: "#ededf0" }}>{value}</span>
    </div>
  );
}
