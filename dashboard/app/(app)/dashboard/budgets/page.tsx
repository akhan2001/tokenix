import type { Metadata } from "next";

import { ComingSoon } from "@/components/dashboard/coming-soon";
import { requireWorkspaceKey } from "@/lib/require-key";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Budgets · Tokenix",
};

export default async function BudgetsPage() {
  await requireWorkspaceKey();
  return <ComingSoon title="Budgets" />;
}
