"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { ProvisionError, linkExistingKey, provisionWorkspace } from "@/lib/workspace";

export interface ConnectState {
  error?: string;
  /** Set only by the mint path — shown once, then gone. */
  apiKey?: string;
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
  redirect("/insights");
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
