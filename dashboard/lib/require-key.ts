import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { findWorkspace, provisionWorkspace } from "@/lib/workspace";

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
  if (!workspace) redirect("/dashboard/connect");

  return workspace.workspace_id;
}

/** The Clerk user, for pages that need the email or a display name. */
export async function requireClerkUser() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  return user;
}

/**
 * Resolve the workspace, minting one when the person is here to be onboarded.
 *
 * `requireWorkspaceKey` sends anyone without a workspace to /connect, because
 * two very different people arrive in that state and the server cannot tell
 * them apart: someone brand new, and an existing customer whose workspace
 * predates Clerk and so carries no account link. Auto-provisioning served the
 * first and quietly harmed the second, handing them an empty workspace while
 * their real spend history sat behind an unlinked key. /connect asks instead.
 *
 * The signup flow can tell them apart, because the person said so by walking
 * through /signup rather than /sign-in. `welcome` carries that declaration.
 * It arrives as a query parameter and is therefore forgeable — which is
 * harmless here: the worst a forged one does is mint an empty workspace, and
 * /connect already offers exactly that behind a button. It buys no access to
 * anyone else's data, so it is intent, not authorization.
 *
 * The returned `freshKey` exists only on the render that minted it. The
 * gateway hands back the plaintext once and the database keeps a SHA-256 hash
 * and a 12-character prefix, so it cannot be read back on any later request.
 * That is the whole reason the reveal has to happen now, in this response.
 */
export async function ensureWorkspace(
  welcome: boolean,
): Promise<{ workspaceId: string; keyPrefix: string | null; freshKey: string | null }> {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const existing = await findWorkspace(user.id);
  if (existing) {
    return {
      workspaceId: existing.workspace_id,
      keyPrefix: existing.key_prefix,
      freshKey: null,
    };
  }

  // Ambiguous: no workspace and no declared intent. /connect asks who they are.
  if (!welcome) redirect("/dashboard/connect");

  const email = user.emailAddresses[0]?.emailAddress ?? null;
  try {
    const created = await provisionWorkspace(
      user.id,
      email,
      email?.split("@")[0] || `workspace-${user.id.slice(-6)}`,
    );
    return {
      workspaceId: created.workspace_id,
      keyPrefix: created.key_prefix,
      freshKey: created.api_key,
    };
  } catch {
    // The gateway or the analytics API is unreachable. /connect is the page
    // built to explain that and to retry, so hand over rather than showing a
    // dashboard-shaped error. `redirect` throws, so it sits outside the try.
  }
  redirect("/dashboard/connect");
}
