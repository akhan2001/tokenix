import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

/**
 * Shell for the authenticated product area, and its gate.
 *
 * Protection lives here rather than in proxy.ts because `createRouteMatcher`
 * is deprecated in Clerk v7 in favour of resource-based checks — the guard
 * belongs with the resource it guards.
 *
 * Gating the whole group is safe now in a way it was not under the old cookie
 * auth. `/connect` is in this group, and back then it was the page that took
 * your key, so redirecting an anonymous visitor away from it was a loop. Under
 * Clerk it provisions a workspace for someone already signed in, so an
 * anonymous visitor belongs at /sign-in like every other page here.
 *
 * Each data page still calls `requireWorkspaceKey()`, which re-checks the
 * session and resolves the workspace. This layout answers "may you be here";
 * that answers "whose data is this".
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <div
      style={{
        background: "var(--bg)",
        color: "var(--text)",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Header page="index" />
      <div style={{ flex: 1 }}>{children}</div>
      <Footer />
    </div>
  );
}
