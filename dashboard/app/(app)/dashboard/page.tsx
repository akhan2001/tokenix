import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppNav } from "@/components/app-nav";
import { OverviewTable } from "@/components/dashboard/overview-table";
import { SpendChart } from "@/components/spend-chart";
import { EmptyState } from "@/components/stat-card";
import { KeyRevealModal } from "@/components/onboarding/key-reveal-modal";
import { ensureWorkspace } from "@/lib/require-key";
import {
  ApiError,
  fetchModels,
  fetchSummary,
  fetchUsageSeries,
  fmtCompact,
  fmtPct,
  fmtUsd,
} from "@/lib/tokenix-api";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Overview · Tokenix",
  description: "What you spent, what the market rate was, and the gap between them.",
};

const DAYS = 30;

const GATEWAY_URL =
  process.env.NEXT_PUBLIC_TOKENIX_GATEWAY_URL ?? "https://gateway.tokenixindex.com";

/**
 * The post-onboarding home, read by two people who want different things.
 *
 * Layered by depth rather than split by role. A CFO reads the headline row and
 * stops — spend, the ACPI-benchmarked price for the same traffic, and the gap.
 * A CTO keeps going into the per-model breakdown and the connection state at
 * the bottom. Building two dashboards would have doubled the surface for a
 * difference that is really just how far down the page someone reads.
 *
 * The delta is a real figure, not a framing. `acpi_benchmark_usd` is what this
 * exact token volume would have cost at the index rate, so the difference is
 * attributable per model rather than being a headline percentage chosen for
 * effect. Sign convention follows the rest of the app: over the reference is
 * --red, under it is --green, because this is a cost index.
 */
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  // `?welcome=1` is set by the signup flow and means "this person is new, mint
  // for them". It lives here rather than on /dashboard/insights because this is
  // where onboarding now lands: the overview is the home tab, so the key is
  // revealed over the page people actually arrive on. Anyone without a
  // workspace and without that flag is still asked at /dashboard/connect.
  const { welcome } = await searchParams;
  const { workspaceId, keyPrefix, freshKey } = await ensureWorkspace(welcome === "1");

  // Rendered over whichever branch below runs: the plaintext key exists only in
  // this response and cannot be recovered, so an analytics outage must not be
  // the reason someone never sees it.
  const keyModal = freshKey ? (
    <KeyRevealModal apiKey={freshKey} gatewayUrl={GATEWAY_URL} />
  ) : null;

  let summary, usage, models;
  try {
    [summary, usage, models] = await Promise.all([
      fetchSummary(workspaceId),
      fetchUsageSeries(workspaceId, DAYS),
      fetchModels(workspaceId, DAYS),
    ]);
  } catch (error) {
    return (
      <>
        {keyModal}
        <AppNav page="overview" connected />
        <Wrap>
          <EmptyState
            title="Could not load your overview"
            body={
              error instanceof ApiError
                ? error.message
                : "The analytics API did not respond. Try again in a moment."
            }
          />
        </Wrap>
      </>
    );
  }

  const spend = summary.this_month_spend_usd;
  const reference = summary.acpi_benchmark_usd;
  const gap = spend - reference;
  const gapPct = reference > 0 ? (gap / reference) * 100 : null;
  const over = gap > 0;

  return (
    <>
      {keyModal}
      <AppNav page="overview" connected />

      <Wrap>
        {/* ── 1. The headline row. Finance's stopping point. ───────────── */}
        <div className="sec-kicker">Last {DAYS} days</div>
        <div
          className="dash-headline"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 28,
            alignItems: "end",
            paddingBottom: 34,
            borderBottom: "1px solid var(--border)",
            marginBottom: 40,
          }}
        >
          <Figure label="You spent" value={fmtUsd(spend)} tone="var(--text)" big />
          <Figure
            label="ACPI reference for the same usage"
            value={fmtUsd(reference)}
            tone="var(--text2)"
          />
          <Figure
            label={over ? "Above the market rate" : "Below the market rate"}
            value={`${over ? "+" : ""}${fmtUsd(gap)}`}
            tone={over ? "var(--red)" : "var(--green)"}
            sub={
              gapPct === null ? "No reference volume yet" : `${fmtPct(gapPct)} vs ACPI`
            }
          />
        </div>

        {/* ── 2. The trend. Both audiences, at a glance. ───────────────── */}
        <div className="sec-kicker">Spend over time</div>
        <div style={{ marginBottom: 48 }}>
          {usage.series.length < 2 ? (
            <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.9, margin: "8px 0 0" }}>
              Not enough history to plot yet — a line needs at least two days of priced traffic.
            </p>
          ) : (
            <SpendChart
              stepped
              points={usage.series.map((p) => ({
                day: p.day,
                cost_usd: p.cost_usd,
                acpi_bench_usd: p.acpi_bench_usd,
                requests: p.requests,
              }))}
            />
          )}
        </div>

        {/* ── 3. The breakdown. Same rows, different columns matter. ───── */}
        <div className="sec-kicker">By model</div>
        <div
          style={{
            border: "1px solid var(--border)",
            background: "linear-gradient(180deg, var(--s1), transparent)",
            marginBottom: 56,
          }}
        >
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
        </div>

        {/* ── 4. The technical footer. Deliberately quiet. ─────────────── */}
        <div
          style={{
            borderTop: "1px solid var(--border)",
            paddingTop: 24,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 24,
          }}
        >
          <Minor label="Workspace key">
            {keyPrefix ? (
              <>
                <span style={{ fontFamily: "var(--mono)", color: "var(--text2)" }}>
                  {keyPrefix}…
                </span>{" "}
                <span style={{ color: "var(--green)" }}>active</span>
              </>
            ) : (
              <span style={{ color: "var(--text3)" }}>No key issued</span>
            )}
          </Minor>

          <Minor label={`Requests · last ${DAYS} days`}>
            {fmtCompact(summary.total_requests)}
          </Minor>

          <Minor label="Connection">
            <a href="/dashboard/connect" style={{ color: "var(--accent-dim)" }}>
              Connect or rotate a key →
            </a>
          </Minor>

          <Minor label="Reference">
            <a href="/#methodology" style={{ color: "var(--accent-dim)" }}>
              How ACPI is calculated →
            </a>
          </Minor>
        </div>
      </Wrap>
    </>
  );
}

function Wrap({ children }: { children: React.ReactNode }) {
  return (
    <section
      className="app-wrap"
      style={{
        maxWidth: 1080,
        margin: "0 auto",
        width: "100%",
        padding: "var(--space-section-sm) var(--pad-x) var(--space-section-md)",
      }}
    >
      {children}
    </section>
  );
}

/** One headline number. `big` marks the figure the page is actually about. */
function Figure({
  label,
  value,
  tone,
  sub,
  big = false,
}: {
  label: string;
  value: string;
  tone: string;
  sub?: string;
  big?: boolean;
}) {
  return (
    <div style={{ minWidth: 0 }}>
      <div
        style={{
          fontSize: 9,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "var(--text3)",
          marginBottom: 12,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--sans)",
          fontSize: big ? "clamp(38px, 6vw, 58px)" : "clamp(26px, 3.4vw, 34px)",
          fontWeight: 500,
          letterSpacing: "-0.022em",
          lineHeight: 1,
          color: tone,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 8 }}>{sub}</div>
      )}
    </div>
  );
}

/** The action row's type: smaller and muted, so it never competes upward. */
function Minor({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        style={{
          fontSize: 9,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "var(--text3)",
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.7 }}>{children}</div>
    </div>
  );
}
