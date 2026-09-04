"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { ProvisionError, findWorkspace, linkExistingKey, provisionWorkspace } from "@/lib/workspace";
import { ProviderKeyError, saveProviderKey, type Provider } from "@/lib/provider-keys";

export interface ConnectState {
  error?: string;
  /** Set only by the mint path — shown once, then gone. */
  apiKey?: string;
}

export interface ProviderKeyState {
  error?: string;
  success?: boolean;
}

export interface TestRequestState {
  status?: "ok" | "error";
  message?: string;
}

/**
 * Fire one real, minimal request through the gateway using a workspace key,
 * to prove the setup actually works end to end rather than asking someone to
 * take it on faith.
 *
 * Done server-side rather than as a client-side fetch straight to the
 * gateway: a browser call from tokenixindex.com to the Railway gateway host
 * is cross-origin, and this repo has no visibility into that service's CORS
 * configuration to know whether such a call would even be allowed to land —
 * a blocked preflight would masquerade as "not working" when the key and
 * provider credential might be fine. A server-to-server call sidesteps the
 * question entirely.
 *
 * The key is a form field, not looked up from the session, because the one
 * moment this matters most (right after minting) the plaintext exists only
 * in the browser's own render of this response — the server already forgot
 * it. Passing it back is not a new exposure: it is the same value already
 * displayed on the page in the clear.
 *
 * This is a genuine paid request (a handful of tokens against whichever
 * provider credential is attached) — small on purpose, but not free.
 */
export async function testGatewayRequestAction(
  _prev: TestRequestState,
  formData: FormData,
): Promise<TestRequestState> {
  const apiKey = String(formData.get("api_key") ?? "").trim();
  if (!apiKey) return { status: "error", message: "No key to test with." };

  const gatewayUrl = process.env.TOKENIX_GATEWAY_URL ?? "http://localhost:8080";

  let response: Response;
  try {
    response = await fetch(`${gatewayUrl}/openai/v1/chat/completions`, {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "Reply with just: ok" }],
        max_tokens: 5,
      }),
      cache: "no-store",
    });
  } catch {
    return { status: "error", message: `Could not reach the gateway at ${gatewayUrl}.` };
  }

  if (response.ok) {
    return { status: "ok", message: "Your key and provider connection both work." };
  }

  // The gateway's error shape isn't fixed in this repo, so parse
  // defensively — OpenAI-style {error:{message}}, a bare {message}, or fall
  // back to the raw body — rather than showing a blank failure.
  const raw = await response.text();
  let detail = raw;
  try {
    const parsed = JSON.parse(raw) as { error?: { message?: string } | string; message?: string };
    const errorField = parsed.error;
    detail =
      (typeof errorField === "object" && errorField ? errorField.message : errorField) ??
      parsed.message ??
      raw;
  } catch {
    // Not JSON — the raw text is the best available detail.
  }
  return { status: "error", message: detail || `The gateway returned ${response.status}.` };
}

/**
 * Store a provider credential on the signed-in user's own workspace.
 *
 * The workspace id is resolved here from the authenticated session via
 * `findWorkspace(userId)` — never accepted as a form field — so a request
 * can only ever write to the workspace the caller actually owns.
 */
export async function saveProviderKeyAction(
  _prev: ProviderKeyState,
  formData: FormData,
): Promise<ProviderKeyState> {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const provider = String(formData.get("provider") ?? "");
  if (provider !== "openai" && provider !== "anthropic" && provider !== "google") {
    return { error: "Unknown provider." };
  }

  const apiKey = String(formData.get("api_key") ?? "").trim();
  if (!apiKey) return { error: "Enter an API key." };

  const workspace = await findWorkspace(userId);
  if (!workspace) return { error: "No workspace found for your account." };

  try {
    await saveProviderKey(workspace.workspace_id, provider as Provider, apiKey);
  } catch (error) {
    return {
      error:
        error instanceof ProviderKeyError
          ? error.message
          : "Could not save that credential right now. Try again in a moment.",
    };
  }
  return { success: true };
}

/** Claim an existing workspace with its `txk-` key. */
export async function linkKeyAction(
  _prev: ConnectState,
  formData: FormData,
): Promise<ConnectState> {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const key = String(formData.get("key") ?? "").trim();
  if (!key) return { error: "Enter your workspace key." };

  try {
    await linkExistingKey(userId, key);
  } catch (error) {
    return {
      error:
        error instanceof ProvisionError
          ? error.message
          : "Could not link that key right now. Try again in a moment.",
    };
  }
  redirect("/dashboard/insights");
}

/**
 * Mint a new workspace.
 *
 * Explicit rather than automatic on page load: auto-provisioning meant an
 * existing customer signing in silently got a new empty workspace, with their
 * real history left behind an unlinked key.
 */
export async function createWorkspaceAction(): Promise<ConnectState> {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  const email = user.emailAddresses[0]?.emailAddress ?? null;

  try {
    const created = await provisionWorkspace(
      user.id,
      email,
      email?.split("@")[0] || `workspace-${user.id.slice(-6)}`,
    );
    // The plaintext exists only here; hand it straight to the page.
    return { apiKey: created.api_key };
  } catch (error) {
    return {
      error:
        error instanceof ProvisionError
          ? error.message
          : "Could not create your workspace. Try again in a moment.",
    };
  }
}
