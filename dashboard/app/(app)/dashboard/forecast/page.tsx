import type { Metadata } from "next";

import { DashPageHeader } from "@/components/dashboard/dash-page-header";
import { MetricRow } from "@/components/dashboard/metric-row";
import { DashCard } from "@/components/dashboard/dash-card";
import { ForecastProjectionChart } from "@/components/dashboard/forecast-projection-chart";
import { EmptyState } from "@/components/stat-card";
import { requireWorkspaceKey } from "@/lib/require-key";
import { ApiError, fetchForecast, fmtPct, fmtUsd } from "@/lib/tokenix-api";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Forecast · Tokenix",
  description: "Where your AI spend is heading, and what optimisation would recover.",
};

const ABOVE = "var(--red)";
const BELOW = "var(--green)";

export default async function ForecastPage() {
  const key = await requireWorkspaceKey();

  let data;
  try {
    data = await fetchForecast(key);
  } catch (error) {
    return (
      <Shell>
        <EmptyState
          title="Could not load the forecast"
          body={error instanceof ApiError ? error.message : "The analytics API did not respond. Try again in a moment."}
        />
      </Shell>
    );
  }

  const hasProjection = data.projected_this_month_usd > 0;
  const savingShare = data.projected_rest_of_year_usd
    ? data.potential_saving_usd / data.projected_rest_of_year_usd
    : 0;

  return (
    <Shell>
      <DashPageHeader title="Forecast" subtitle="Projected over the next twelve months" />

      <p style={{ fontSize: 12.5, color: "var(--text2)", lineHeight: 1.8, maxWidth: 660, margin: "0 0 24px" }}>
        Month-to-date spend run-rated to the full month, then compounded forward at your
        month-over-month growth. A trend line, not a model — treat it as direction, not a number
        to budget against.
      </p>

      {data.low_confidence && (
        <DashCard style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 12.5, color: "var(--text2)", lineHeight: 1.7 }}>
            <strong style={{ color: "var(--text)" }}>Low confidence.</strong>{" "}
            {data.months_of_history < 2
              ? "There is less than a full month of history, so growth cannot be measured yet."
              : "It is early in the month, so the run rate is extrapolated from very few days."}{" "}
            These figures will steady as data accumulates.
          </div>
        </DashCard>
      )}

      <div style={{ marginBottom: 18 }}>
        <MetricRow
          metrics={[
            {
              label: "Current burn",
              value: fmtUsd(data.projected_this_month_usd),
              width: "1.2fr",
              sub: `${fmtUsd(data.current_month_to_date_usd)} month to date`,
            },
            {
              label: "Growth rate",
              value: fmtPct(data.mom_growth_pct),
              color: data.mom_growth_pct > 0 ? ABOVE : undefined,
              sub: "month over month",
            },
            {
              label: "Next 12 months",
              value: fmtUsd(data.projected_rest_of_year_usd),
              sub: "at the current trajectory",
            },
            {
              label: "With optimisation",
              value: fmtUsd(data.projected_with_optimization_usd),
              color: BELOW,
              sub: `saves ${fmtUsd(data.potential_saving_usd)}`,
            },
          ]}
        />
      </div>

      <DashCard style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 14.5, fontWeight: 500, color: "var(--text)", marginBottom: 4 }}>
          Twelve-month projection
        </div>
        {hasProjection ? (
          <ForecastProjectionChart
            monthlyBase={data.projected_this_month_usd}
            growthRate={data.mom_growth_pct / 100}
            savingShare={savingShare}
          />
        ) : (
          <EmptyState
            title="Nothing to project yet"
            body="A forecast needs at least a few days of priced traffic. Once spend starts accumulating this becomes a twelve-month projection."
          />
        )}
      </DashCard>

      <DashCard padding="22px 24px">
        <div style={{ fontSize: 14.5, fontWeight: 500, color: "var(--text)", marginBottom: 16 }}>
          How this is calculated
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 44 }}>
          <div>
            <p style={{ fontSize: 12.5, color: "var(--text2)", lineHeight: 1.8, margin: 0 }}>
              Spend so far this month is divided by the days elapsed and multiplied by the days in
              the month. That run rate is compared with last month to get a growth rate, which is
              then compounded forward month by month.
            </p>
            <p style={{ fontSize: 12.5, color: "var(--text2)", lineHeight: 1.8, marginTop: 12 }}>
              Growth is clamped to the range −90% to +100% per month. Without that, a workspace&apos;s
              first partial month produces a growth figure that compounds into a meaningless
              annual number.
            </p>
          </div>
          <div>
            <p style={{ fontSize: 12.5, color: "var(--text2)", lineHeight: 1.8, margin: 0 }}>
              The optimised line applies the savings you could recover by moving workloads that
              currently price above the ACPI onto market-rate models. It is derived from your{" "}
              <a href="/dashboard/insights?view=benchmark" style={{ color: "var(--accent)" }}>
                measured overpayment
              </a>{" "}
              — not a flat assumption — so a workspace already at or below market shows no
              phantom saving.
            </p>
            <p style={{ fontSize: 12.5, color: "var(--text3)", lineHeight: 1.8, marginTop: 12 }}>
              Only priced requests are counted. Models absent from the ACPI dataset are excluded
              rather than treated as free.
            </p>
          </div>
        </div>
      </DashCard>
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
