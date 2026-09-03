import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AppHeader } from "@/components/app-header";

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
  // /signup, not /sign-in: it is the passwordless front door, and it carries a
  // "Sign in" link for anyone who already has an account. Sending a stranger
  // to a sign-in card first asks them to remember an account they never made.
  if (!userId) redirect("/signup");

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
      <AppHeader />
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}
