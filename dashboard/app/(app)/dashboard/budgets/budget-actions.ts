"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { findWorkspace } from "@/lib/workspace";
import { ApiError, saveBudget } from "@/lib/tokenix-api";

export interface BudgetFormState {
  error?: string;
  success?: boolean;
}

/**
 * Save the signed-in user's budget.
 *
 * The workspace is resolved from the authenticated session, never accepted
 * as a form field — same rule as saveProviderKeyAction in ../connect-actions —
 * so a submitted form can only ever write the caller's own workspace.
 */
export async function saveBudgetAction(
  _prev: BudgetFormState,
  formData: FormData,
): Promise<BudgetFormState> {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const workspace = await findWorkspace(userId);
  if (!workspace) return { error: "No workspace found for your account." };

  const monthlyLimit = Number(formData.get("monthly_limit_usd"));
  if (!Number.isFinite(monthlyLimit) || monthlyLimit <= 0) {
    return { error: "Enter a monthly limit greater than $0." };
  }

  const alertPct = Number(formData.get("alert_pct"));
  if (!Number.isFinite(alertPct) || alertPct <= 0 || alertPct > 100) {
    return { error: "Alert threshold must be between 1 and 100." };
  }

  const alertEmail = String(formData.get("alert_email") ?? "").trim();
  if (!alertEmail || !alertEmail.includes("@")) {
    return { error: "Enter a valid email for alerts." };
  }

  try {
    await saveBudget(workspace.workspace_id, {
      monthly_limit_usd: monthlyLimit,
      alert_pct: alertPct,
      alert_email: alertEmail,
    });
  } catch (error) {
    return {
      error: error instanceof ApiError ? error.message : "Could not save that budget right now. Try again in a moment.",
    };
  }
  // The status card above the form (spend so far, % used, projected EOM) is
  // computed server-side from usage_records — refresh it now rather than
  // leaving it showing pre-save numbers under a post-save form.
  revalidatePath("/dashboard/budgets");
  return { success: true };
}
