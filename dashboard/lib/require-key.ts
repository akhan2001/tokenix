import { redirect } from "next/navigation";

import { getWorkspaceKey } from "@/lib/tokenix-api";

/**
 * Return the workspace key, or send the visitor to `/connect`.
 *
 * Called at the top of every data page rather than in the group layout, so
 * `/connect` itself stays reachable while signed out.
 */
export async function requireWorkspaceKey(): Promise<string> {
  const key = await getWorkspaceKey();
  if (!key) redirect("/connect");
  return key;
}
