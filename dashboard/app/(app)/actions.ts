"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ApiError, KEY_COOKIE, verifyKey } from "@/lib/tokenix-api";

export interface ConnectState {
  error?: string;
}

/**
 * Exchange a workspace key for a session.
 *
 * The key is verified against the analytics API before being stored, so a
 * typo fails here with a clear message rather than as a broken dashboard on
 * the next page.
 */
export async function connectWorkspace(
  _prev: ConnectState,
  formData: FormData,
): Promise<ConnectState> {
  const raw = String(formData.get("key") ?? "").trim();

  if (!raw) return { error: "Enter your workspace key." };
  if (!raw.startsWith("txk-")) {
    return { error: "That does not look like a Tokenix key — they start with `txk-`." };
  }

  try {
    if (!(await verifyKey(raw))) {
      return { error: "Invalid API key — check your key and try again." };
    }
  } catch (error) {
    return {
      error:
        error instanceof ApiError
          ? error.message
          : "Could not verify the key right now. Try again in a moment.",
    };
  }

  const store = await cookies();
  store.set(KEY_COOKIE, raw, {
    httpOnly: true,
    sameSite: "lax",
    // Plain HTTP in local dev would drop a `secure` cookie silently.
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect("/insights");
}

export async function disconnectWorkspace(): Promise<void> {
  const store = await cookies();
  store.delete(KEY_COOKIE);
  redirect("/connect");
}
