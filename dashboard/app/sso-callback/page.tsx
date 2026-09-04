"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

import { LABEL_SM } from "@/components/primitives";

/**
 * Where the OAuth provider drops the browser when a session could not be
 * created outright.
 *
 * For a returning user FAPI mints the session and goes straight to the
 * destination, so this page is never seen. It exists for the new user: their
 * sign-in attempt has no account behind it, and this component transfers that
 * attempt into a sign-up before continuing. Hence two destinations — the
 * sign-up one carries `?welcome=1` to /dashboard/connect, because only that
 * path has established the person is genuinely new and may be provisioned
 * unasked, and Connect is where the one-time key, provider setup, and code
 * snippet all live. A returning user has no key to be shown and nothing left
 * to set up, so they go straight to /dashboard, the overview home.
 *
 * Deliberately almost empty. It is a waypoint measured in milliseconds, and
 * anything laid out here would flash.
 */
export default function SsoCallbackPage() {
  return (
    <main
      style={{
        background: "var(--bg)",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <AuthenticateWithRedirectCallback
        signUpForceRedirectUrl="/dashboard/connect?welcome=1"
        signInForceRedirectUrl="/dashboard"
      />
      <div style={{ ...LABEL_SM, color: "var(--ink-faint)" }}>Completing sign-in…</div>
    </main>
  );
}
