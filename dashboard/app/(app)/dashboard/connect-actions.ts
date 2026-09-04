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
