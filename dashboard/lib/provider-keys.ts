import "server-only";

import { PROVIDERS, type Provider } from "@/lib/providers";

/**
 * Provider credential storage — the gateway's per-workspace OpenAI/Anthropic/
 * Google key store.
 *
 * Server-only, matching lib/workspace.ts: TOKENIX_ADMIN_TOKEN authorizes the
 * gateway's whole /admin surface and must never reach the browser, so every
 * call here goes through a server action, never a client-side fetch. The
 * `server-only` directive is exactly why the plain id/label list lives in
 * lib/providers.ts instead of here — see that file's header comment.
 */

const GATEWAY_URL = process.env.TOKENIX_GATEWAY_URL ?? "http://localhost:8080";

export { PROVIDERS, type Provider };

export class ProviderKeyError extends Error {}

function requireAdminToken(): string {
  const token = process.env.TOKENIX_ADMIN_TOKEN;
  if (!token) {
    throw new ProviderKeyError(
      "TOKENIX_ADMIN_TOKEN is not set. The dashboard cannot manage provider credentials without it.",
    );
  }
  return token;
}

/**
 * Store (or overwrite) one provider's credential on a workspace.
 *
 * `workspaceId` must come from the caller resolving the signed-in user's own
 * workspace server-side (see connect-actions.ts) — never from a client-
 * submitted field. Accepting it from the browser would let anyone attach a
 * credential to any workspace by guessing or copying an id.
 */
export async function saveProviderKey(
  workspaceId: string,
  provider: Provider,
  apiKey: string,
): Promise<void> {
  const adminToken = requireAdminToken();

  let response: Response;
  try {
    response = await fetch(`${GATEWAY_URL}/admin/workspaces/${workspaceId}/provider-keys`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-admin-token": adminToken },
      body: JSON.stringify({ provider, api_key: apiKey }),
      cache: "no-store",
    });
  } catch {
    throw new ProviderKeyError(`Could not reach the gateway at ${GATEWAY_URL}.`);
  }

  if (!response.ok) {
    throw new ProviderKeyError(`The gateway rejected that credential (${response.status}).`);
  }
}

/**
 * Which providers already have a credential stored, if the gateway exposes a
 * way to ask.
 *
 * Returns `null` — rather than throwing — when the endpoint doesn't exist or
 * errors, so a missing status route degrades to "assume nothing is
 * connected" instead of breaking the page. This endpoint's shape wasn't
 * confirmed against the gateway the way the POST save was (that one was
 * verified working via a manual admin call); treat a non-null result as a
 * bonus, not a guarantee every gateway deployment supports it.
 */
export async function listConnectedProviders(workspaceId: string): Promise<Provider[] | null> {
  let adminToken: string;
  try {
    adminToken = requireAdminToken();
  } catch {
    return null;
  }

  try {
    const response = await fetch(`${GATEWAY_URL}/admin/workspaces/${workspaceId}/provider-keys`, {
      headers: { "x-admin-token": adminToken },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const body = (await response.json()) as unknown;
    if (!Array.isArray(body)) return null;
    return body
      .map((row) => (row && typeof row === "object" && "provider" in row ? String(row.provider) : null))
      .filter((p): p is Provider => p === "openai" || p === "anthropic" || p === "google");
  } catch {
    return null;
  }
}
