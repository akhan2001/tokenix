import type { Metadata } from "next";

import { ComingSoon } from "@/components/dashboard/coming-soon";
import { requireWorkspaceKey } from "@/lib/require-key";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reports · Tokenix",
};

export default async function ReportsPage() {
  await requireWorkspaceKey();
  return <ComingSoon title="Reports" />;
}
