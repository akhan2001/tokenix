import type { Metadata } from "next";

import { AppNav } from "@/components/app-nav";
import { HeadlineFact, HeadlineFigure } from "@/components/headline-figure";
import { ForecastChart } from "@/components/forecast-chart";
import { EmptyState, StatCard, StatStrip } from "@/components/stat-card";
import { requireWorkspaceKey } from "@/lib/require-key";
import { ApiError, fetchForecast, fmtPct, fmtUsd } from "@/lib/tokenix-api";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Forecast · Tokenix",
  description: "Where your AI spend is heading, and what optimisation would recover.",
};

export default async function ForecastPage() {
  const key = await requireWorkspaceKey();

  let data;
  try {
    data = await fetchForecast(key);
  } catch (error) {
    return (
      <>
        <AppNav page="forecast" connected />
        <section style={{ maxWidth: 1200, margin: "0 auto", padding: "var(--space-section-md) 48px" }}>
          <EmptyState
            title="Could not load the forecast"
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

  const hasProjection = data.projected_this_month_usd > 0;
  const savingShare = data.projected_rest_of_year_usd
    ? data.potential_saving_usd / data.projected_rest_of_year_usd
    : 0;

  return (
    <>
      <AppNav page="forecast" connected />

      <section
        className="app-wrap"
        style={{ maxWidth: 1200, margin: "0 auto", width: "100%", padding: "var(--space-section-sm) 48px var(--space-section-xs)" }}
      >
        <div className="sec-kicker">Projections</div>
        <h1
          className="sr-only"
        >
          Forecast
        </h1>
        <HeadlineFigure
          kicker="At current growth"
          value={fmtUsd(data.projected_rest_of_year_usd)}
          caption="Projected spend over the next twelve months"
          aside={
            <>
              <HeadlineFact tone={data.mom_growth_pct > 0 ? "up" : "plain"}>
                {data.mom_growth_pct > 0 ? "↑" : ""} {fmtPct(data.mom_growth_pct)} monthly
                growth
              </HeadlineFact>
              <HeadlineFact tone="down">
                With optimization {fmtUsd(data.projected_with_optimization_usd)}
              </HeadlineFact>
              <HeadlineFact tone="down">
                ↓ Save {fmtUsd(data.potential_saving_usd)}
              </HeadlineFact>
            </>
          }
        />
        <p
          style={{
            fontSize: 12,
            color: "var(--text3)",
            lineHeight: 1.9,
            maxWidth: 660,
            marginTop: 22,
          }}
        >
          Month-to-date spend run-rated to the full month, then compounded forward at your
          month-over-month growth. A trend line, not a model — treat it as direction, not a
          number to budget against.
        </p>

        {data.low_confidence && (
          <div
            style={{
              marginTop: 20,
              border: "1px solid var(--border2)",
              background: "var(--s2)",
              padding: "13px 17px",
              fontSize: 11,
              color: "var(--text2)",
              lineHeight: 1.8,
            }}
            role="note"
          >
            <strong style={{ color: "var(--text)" }}>Low confidence.</strong>{" "}
            {data.months_of_history < 2
              ? "There is less than a full month of history, so growth cannot be measured yet."
              : "It is early in the month, so the run rate is extrapolated from very few days."}{" "}
            These figures will steady as data accumulates.
          </div>
        )}
      </section>

      <StatStrip>
        <StatCard
          label="Current burn"
          value={fmtUsd(data.projected_this_month_usd)}
          sub={`${fmtUsd(data.current_month_to_date_usd)} month to date`}
          tone="gold"
        />
        <StatCard
          label="Growth rate"
          value={fmtPct(data.mom_growth_pct)}
          sub="month over month"
        />
        <StatCard
          label="Next 12 months"
          value={fmtUsd(data.projected_rest_of_year_usd)}
          sub="at the current trajectory"
        />
        <StatCard
          label="With optimisation"
          value={fmtUsd(data.projected_with_optimization_usd)}
          sub={`saves ${fmtUsd(data.potential_saving_usd)}`}
        />
      </StatStrip>

      <section
        className="app-wrap"
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          width: "100%",
          padding: "var(--space-section-sm) 48px var(--space-section-sm)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        {hasProjection ? (
          <ForecastChart
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
      </section>

      <section
        className="app-wrap"
        style={{ maxWidth: 1200, margin: "0 auto", width: "100%", padding: "var(--space-section-sm) 48px var(--space-section-md)" }}
      >
        <div className="sec-kicker">How this is calculated</div>
        <div
          style={{
            fontFamily: "var(--sans)",
            fontSize: 22,
            fontWeight: 500,
            color: "var(--text)",
            marginBottom: 18,
          }}
        >
          Method
        </div>
        <div
          className="forecast-meth"
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 44 }}
        >
          <div>
            <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.95, margin: 0 }}>
              Spend so far this month is divided by the days elapsed and multiplied by the days in
              the month. That run rate is compared with last month to get a growth rate, which is
              then compounded forward month by month.
            </p>
            <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.95, marginTop: 12 }}>
              Growth is clamped to the range −90% to +100% per month. Without that, a workspace&apos;s
              first partial month produces a growth figure that compounds into a meaningless
              annual number.
            </p>
          </div>
          <div>
            <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.95, margin: 0 }}>
              The optimised line applies the savings you could recover by moving workloads that
              currently price above the ACPI onto market-rate models. It is derived from your{" "}
              <a href="/benchmark" style={{ color: "var(--accent)" }}>
                measured overpayment
              </a>{" "}
              — not a flat assumption — so a workspace already at or below market shows no
              phantom saving.
            </p>
            <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.95, marginTop: 12 }}>
              Only priced requests are counted. Models absent from the ACPI dataset are excluded
              rather than treated as free.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
