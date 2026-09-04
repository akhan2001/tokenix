import type { Metadata } from "next";

import { BudgetForm } from "@/components/dashboard/budget-form";
import { DashPageHeader } from "@/components/dashboard/dash-page-header";
import { MetricRow } from "@/components/dashboard/metric-row";
import { EmptyState } from "@/components/stat-card";
import { requireClerkUser, requireWorkspaceKey } from "@/lib/require-key";
import { ApiError, fetchBudget, fmtUsd } from "@/lib/tokenix-api";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Budgets · Tokenix",
};

const ABOVE = "var(--red)";
const OK = "var(--green)";

export default async function BudgetsPage() {
  const workspaceId = await requireWorkspaceKey();
  const user = await requireClerkUser();
  const userEmail = user.emailAddresses[0]?.emailAddress;

  let budget;
  try {
    budget = await fetchBudget(workspaceId);
  } catch (error) {
    return (
      <Shell>
        <DashPageHeader title="Budgets" />
        <EmptyState
          title="Could not load your budget"
          body={error instanceof ApiError ? error.message : "The analytics API did not respond. Try again in a moment."}
        />
      </Shell>
    );
  }

  return (
    <Shell>
      <DashPageHeader
        title="Budgets"
        subtitle="Set a monthly spend limit and get emailed before you go over"
        pill={
          budget.configured
            ? { label: budget.will_exceed ? "Trending over" : "On track", on: !budget.will_exceed }
            : undefined
        }
      />

      {budget.configured && (
        <div style={{ marginBottom: 18 }}>
          <MetricRow
            metrics={[
              {
                label: "Spent this month",
                value: fmtUsd(budget.current_spend_usd),
                width: "1.2fr",
                sub: `of ${fmtUsd(budget.monthly_limit_usd)} limit`,
              },
              {
                label: "% of budget used",
                value: `${budget.pct_used.toFixed(1)}%`,
                color: budget.pct_used >= budget.alert_pct ? ABOVE : OK,
              },
              {
                label: "Projected month-end",
                value: fmtUsd(budget.projected_eom_usd),
                color: budget.will_exceed ? ABOVE : undefined,
                sub: budget.will_exceed ? "over limit at this pace" : "within limit at this pace",
              },
              {
                label: "Days remaining",
                value: String(budget.days_remaining),
                sub: "in this billing month",
              },
            ]}
          />
        </div>
      )}

      <BudgetForm
        defaults={
          budget.configured
            ? {
                monthly_limit_usd: budget.monthly_limit_usd,
                alert_pct: budget.alert_pct,
                alert_email: budget.alert_email,
              }
            : { alert_email: userEmail }
        }
      />
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
