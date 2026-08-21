import "server-only";

/**
 * Workspace provisioning for a signed-in Clerk user.
 *
 * Server-only, and every call here is server-to-server. Two secrets are used
 * and neither may ever reach the browser:
 *
 *   INTERNAL_API_TOKEN  — analytics API, for the Clerk-user → workspace lookup
 *   TOKENIX_ADMIN_TOKEN — gateway `/admin`, which mints workspaces and keys
 *
 * The Clerk user id is always taken from a verified session by the caller and
 * passed in — never read from a request header or query parameter. The
 * analytics endpoint is gated by the internal token precisely because it takes
 * the user id as a parameter; accepting that from a browser would let anyone
 * read any workspace by naming its owner.
 */

const ANALYTICS_URL = process.env.TOKENIX_ANALYTICS_URL ?? "http://localhost:8001";
const GATEWAY_URL = process.env.TOKENIX_GATEWAY_URL ?? "http://localhost:8080";

export interface Workspace {
  workspace_id: string;
  name: string;
  email: string | null;
  /** First 12 characters. The full key is shown once at mint time and never stored. */
  key_prefix: string | null;
}

export class ProvisionError extends Error {}

function requireSecret(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new ProvisionError(
      `${name} is not set. The dashboard cannot provision workspaces without it.`,
    );
  }
  return value;
}

/** Look up the workspace a Clerk user owns, or null if they have none yet. */
export async function findWorkspace(clerkUserId: string): Promise<Workspace | null> {
  const token = requireSecret("INTERNAL_API_TOKEN");
  const url = `${ANALYTICS_URL}/api/v1/internal/workspaces/me?clerk_user_id=${encodeURIComponent(
    clerkUserId,
  )}`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { "x-internal-token": token },
      cache: "no-store",
    });
  } catch {
    throw new ProvisionError(`Could not reach the analytics API at ${ANALYTICS_URL}.`);
  }

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new ProvisionError(`Workspace lookup failed (${response.status}).`);
  }
  return (await response.json()) as Workspace;
}

export interface NewWorkspace extends Workspace {
  /**
   * The plaintext key. Present ONLY in the response that minted it — the
   * database keeps a SHA-256 hash and a display prefix, so this value cannot be
   * recovered afterwards and must be shown to the user now.
   */
  api_key: string;
}

/**
 * Create a workspace for a Clerk user and return its key once.
 *
 * The gateway's admin endpoint does the minting: it already generates the key,
 * hashes it, and hands back the plaintext exactly once. Reimplementing that
 * here would mean a second copy of the key-generation and hashing rules, which
 * is precisely the kind of thing that drifts.
 */
export async function provisionWorkspace(
  clerkUserId: string,
  email: string | null,
  displayName: string,
): Promise<NewWorkspace> {
  const adminToken = requireSecret("TOKENIX_ADMIN_TOKEN");
  const internalToken = requireSecret("INTERNAL_API_TOKEN");

  let created: Response;
  try {
    created = await fetch(`${GATEWAY_URL}/admin/workspaces`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-admin-token": adminToken },
      body: JSON.stringify({ name: displayName }),
      cache: "no-store",
    });
  } catch {
    throw new ProvisionError(`Could not reach the gateway at ${GATEWAY_URL}.`);
  }
  if (!created.ok) {
    throw new ProvisionError(`Gateway refused to create a workspace (${created.status}).`);
  }
  const workspace = (await created.json()) as { workspace_id: string; api_key: string };

  // Link second. If this fails the workspace exists but is unowned, which the
  // next visit retries into a *new* workspace rather than silently adopting a
  // stray one — a duplicate empty workspace is a cheaper failure than handing
  // someone another tenant's data.
  const linked = await fetch(`${ANALYTICS_URL}/api/v1/internal/workspaces/link`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-internal-token": internalToken },
    body: JSON.stringify({
      clerk_user_id: clerkUserId,
      workspace_id: workspace.workspace_id,
      email,
    }),
    cache: "no-store",
  });
  if (!linked.ok) {
    throw new ProvisionError(
      `Workspace was created but could not be linked to your account (${linked.status}).`,
    );
  }

  return {
    workspace_id: workspace.workspace_id,
    name: displayName,
    email,
    key_prefix: workspace.api_key.slice(0, 12),
    api_key: workspace.api_key,
  };
}


/**
 * Claim an existing workspace by presenting its `txk-` key.
 *
 * For customers provisioned before Clerk: their workspace has no Clerk user,
 * so signing in would otherwise strand their spend history behind a new empty
 * one. The server moves the link transactionally, releasing any workspace this
 * user was auto-provisioned into.
 */
export async function linkExistingKey(
  clerkUserId: string,
  txkKey: string,
): Promise<Workspace> {
  const token = requireSecret("INTERNAL_API_TOKEN");

  let response: Response;
  try {
    response = await fetch(`${ANALYTICS_URL}/api/v1/internal/workspaces/link-key`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-internal-token": token },
      body: JSON.stringify({ clerk_user_id: clerkUserId, txk_key: txkKey }),
      cache: "no-store",
    });
  } catch {
    throw new ProvisionError(`Could not reach the analytics API at ${ANALYTICS_URL}.`);
  }

  if (response.status === 404) {
    throw new ProvisionError("That key was not recognised. Check it and try again.");
  }
  if (response.status === 409) {
    throw new ProvisionError("That workspace is already linked to a different account.");
  }
  if (response.status === 400) {
    throw new ProvisionError("That does not look like a Tokenix key — they start with `txk-`.");
  }
  if (!response.ok) {
    throw new ProvisionError(`Could not link that key (${response.status}).`);
  }

  const linked = (await response.json()) as {
    workspace_id: string;
    name: string;
    key_prefix: string;
  };
  return { ...linked, email: null };
}
