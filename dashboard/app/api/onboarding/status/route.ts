import { auth } from "@clerk/nextjs/server";

import { fetchSummary } from "@/lib/tokenix-api";
import { findWorkspace } from "@/lib/workspace";

/**
 * GET /api/onboarding/status
 *
 * Answers one question for the key modal: has anything actually come through
 * this workspace's key yet? That is what turns "waiting" into "connected"
 * without asking the person to tell us they are done.
 *
 * A route handler rather than a direct call from the modal because both the
 * workspace lookup and the summary read are authenticated with
 * INTERNAL_API_TOKEN, which must never reach the browser. The Clerk session
 * identifies the caller here, and the workspace is resolved from it — never
 * read from the request — so this cannot be pointed at someone else's data.
 *
 * Errors answer `connected: false` rather than a status code. This is polled
 * every few seconds while the modal is open; a transient analytics blip should
 * leave the dot pulsing, not paint a failure over the key the person is still
 * copying.
 */
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Not signed in." }, { status: 401, headers: NO_STORE });
  }

  try {
    const workspace = await findWorkspace(userId);
    if (!workspace) {
      return Response.json({ connected: false, requests: 0 }, { headers: NO_STORE });
    }

    const summary = await fetchSummary(workspace.workspace_id);
    return Response.json(
      { connected: summary.total_requests > 0, requests: summary.total_requests },
      { headers: NO_STORE },
    );
  } catch {
    return Response.json({ connected: false, requests: 0 }, { headers: NO_STORE });
  }
}
