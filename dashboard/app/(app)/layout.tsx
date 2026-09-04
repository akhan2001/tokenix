import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { Sidebar } from "@/components/dashboard/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

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
 *
 * The chrome here is a deliberate second visual system from the marketing
 * site: a daily-use tool reads as a different kind of product than a pricing
 * instrument, on the same dark base and the same amber accent — see
 * app/dashboard-tokens.css. `.dashboard-scope` is applied once, here, so
 * every page under this layout inherits the grey-surface tokens without
 * needing the class itself. `<Sidebar>` replaces the old top <AppHeader> +
 * per-page <AppNav> bar entirely: this is an icon rail down the left edge,
 * and content starts immediately with no top bar above it.
 *
 * <TooltipProvider> is scoped to this layout, not the root: it exists for
 * the sidebar's hover labels, and nothing on the marketing site uses it.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const { userId } = await auth();
  // /signup, not /sign-in: it is the passwordless front door, and it carries a
  // "Sign in" link for anyone who already has an account. Sending a stranger
  // to a sign-in card first asks them to remember an account they never made.
  if (!userId) redirect("/signup");

  return (
    <TooltipProvider>
      <div className="dashboard-scope" style={{ display: "flex", minHeight: "100vh" }}>
        <Sidebar />
        <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
      </div>
    </TooltipProvider>
  );
}
