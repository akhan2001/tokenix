"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { saveBudgetAction, type BudgetFormState } from "@/app/(app)/dashboard/budgets/budget-actions";
import { DashCard } from "@/components/dashboard/dash-card";

const inputStyle = {
  fontSize: 13,
  padding: "9px 10px",
  borderRadius: "var(--dash-radius-control)",
  background: "var(--s2)",
  border: "1px solid var(--border)",
  color: "var(--text)",
  outline: "none",
  width: "100%",
} as const;

const labelStyle = {
  display: "block",
  fontSize: 11.5,
  color: "var(--text2)",
  marginBottom: 6,
} as const;

function SaveButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      style={{
        padding: "9px 16px",
        borderRadius: "var(--dash-radius-control)",
        background: "var(--accent)",
        color: "#141416",
        fontSize: 12.5,
        fontWeight: 500,
        border: "none",
        cursor: pending ? "default" : "pointer",
        opacity: pending ? 0.6 : 1,
      }}
    >
      {pending ? "Saving…" : label}
    </button>
  );
}

/**
 * Set or edit the workspace's monthly budget. Posts to `/api/v1/budget` via
 * `saveBudgetAction`, which resolves the workspace from the Clerk session —
 * this form never sends a workspace id itself.
 */
export function BudgetForm({
  defaults,
}: {
  defaults: { monthly_limit_usd?: number; alert_pct?: number; alert_email?: string };
}) {
  const [state, action] = useActionState<BudgetFormState, FormData>(saveBudgetAction, {});

  return (
    <DashCard>
      <div style={{ fontSize: 14.5, fontWeight: 500, color: "var(--text)", marginBottom: 4 }}>
        {defaults.monthly_limit_usd ? "Edit budget" : "Set a monthly budget"}
      </div>
      <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.7, margin: "0 0 16px", maxWidth: "56ch" }}>
        Get an email when spend crosses your alert threshold, and again at 100% and 120% of the
        limit. Checked hourly against this month&apos;s actual spend.
      </p>
      <form action={action} style={{ display: "grid", gap: 12, maxWidth: 360 }}>
        <div>
          <label htmlFor="monthly_limit_usd" style={labelStyle}>
            Monthly limit (USD)
          </label>
          <input
            id="monthly_limit_usd"
            name="monthly_limit_usd"
            type="number"
            min={1}
            step="0.01"
            defaultValue={defaults.monthly_limit_usd}
            placeholder="1000"
            required
            style={inputStyle}
          />
        </div>
        <div>
          <label htmlFor="alert_pct" style={labelStyle}>
            Warn me at (% of limit)
          </label>
          <input
            id="alert_pct"
            name="alert_pct"
            type="number"
            min={1}
            max={100}
            defaultValue={defaults.alert_pct ?? 80}
            required
            style={inputStyle}
          />
        </div>
        <div>
          <label htmlFor="alert_email" style={labelStyle}>
            Alert email
          </label>
          <input
            id="alert_email"
            name="alert_email"
            type="email"
            defaultValue={defaults.alert_email}
            placeholder="you@company.com"
            required
            style={inputStyle}
          />
        </div>
        {state.error && (
          <div role="alert" style={{ fontSize: 11.5, color: "var(--red)" }}>
            {state.error}
          </div>
        )}
        {state.success && (
          <div style={{ fontSize: 11.5, color: "var(--green)" }}>Budget saved.</div>
        )}
        <div>
          <SaveButton label={defaults.monthly_limit_usd ? "Update budget" : "Save budget"} />
        </div>
      </form>
    </DashCard>
  );
}
