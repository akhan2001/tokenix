import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { findWorkspace } from "@/lib/workspace";

/**
 * Resolve the signed-in person's workspace id, or send them somewhere useful.
 *
 * Replaces the old `txk-` cookie read. Clerk authenticates the human;
 * `findWorkspace` turns that into the workspace they own. Someone signed in but
 * not yet provisioned goes to /connect, which mints their workspace and shows
 * the key once.
 *
 * The name is kept so the three data pages read unchanged: what they pass to
 * the analytics client is now a workspace id rather than a key, and the client
 * picks the matching auth path.
 */
export async function requireWorkspaceKey(): Promise<string> {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const workspace = await findWorkspace(userId);
  if (!workspace) redirect("/connect");

  return workspace.workspace_id;
}

/** The Clerk user, for pages that need the email or a display name. */
export async function requireClerkUser() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  return user;
}
