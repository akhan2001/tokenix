"use client";

import { useState } from "react";
import { useSignIn } from "@clerk/nextjs";

import { Button, Container, H2, BODY_SM, LABEL_SM, WORDMARK } from "@/components/primitives";
import { StepTag } from "./step-tag";

/**
 * Screen 1 of onboarding: get a session, with nothing to fill in.
 *
 * Passwordless by construction, and OAuth rather than an emailed code or link
 * because those still route the person through their inbox mid-signup. One
 * click, one redirect, back with a session — the key is already minted by the
 * time they land.
 *
 * `signIn.sso` is the v7 signal API (`useSignIn` returns `{ signIn, errors,
 * fetchStatus }`, not the v6 `{ isLoaded, signIn, setActive }`). It covers both
 * doors: a returning user gets a session straight away, and a new one has no
 * account to sign in to, so FAPI sends them to `redirectCallbackUrl`, where
 * <AuthenticateWithRedirectCallback> transfers the attempt into a sign-up.
 * That is why the callback route carries the sign-up destination too.
 *
 * `?welcome=1` is what tells /dashboard this person is new and may be
 * provisioned without being asked. See `ensureWorkspace` for why a forgeable
 * query parameter is the right carrier for that.
 */
/** Only the two providers enabled on the Clerk instance. */
type Provider = "oauth_github" | "oauth_google";

const PROVIDERS: { strategy: Provider; label: string }[] = [
  { strategy: "oauth_github", label: "Continue with GitHub" },
  { strategy: "oauth_google", label: "Continue with Google" },
];

const AFTER_SIGN_UP = "/dashboard?welcome=1";

export function SignupPanel() {
  const { signIn, errors, fetchStatus } = useSignIn();
  const [pending, setPending] = useState<Provider | null>(null);

  async function start(strategy: Provider) {
    setPending(strategy);
    const { error } = await signIn.sso({
      strategy,
      redirectUrl: AFTER_SIGN_UP,
      redirectCallbackUrl: "/sso-callback",
    });
    // On success the browser has already left for the provider; only a failure
    // returns here, so the button must be released or it stays dead.
    if (error) setPending(null);
  }

  const busy = pending !== null || fetchStatus === "fetching";
  const problem = errors?.global?.[0]?.message ?? null;

  return (
    <main
      style={{
        background: "var(--bg)",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-section-md) var(--pad-x)",
      }}
    >
      <Container width="narrow">
        <div style={{ ...WORDMARK, color: "var(--ink)", marginBottom: 56 }}>TOKENIX</div>

        <StepTag step={1} />

        <h1 style={{ ...H2, color: "var(--ink)", marginBottom: 16 }}>Get your reference rate.</h1>

        <p style={{ ...BODY_SM, color: "var(--ink-dim)", maxWidth: "46ch", marginBottom: 40 }}>
          One click, and your gateway key is waiting on the other side. No password to invent, no
          verification email to go and find.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 340 }}>
          {PROVIDERS.map(({ strategy, label }) => (
            <Button
              key={strategy}
              variant="secondary"
              disabled={busy}
              onClick={() => start(strategy)}
              arrow={false}
              style={{ justifyContent: "center", width: "100%" }}
            >
              {pending === strategy ? "Redirecting…" : label}
            </Button>
          ))}
        </div>

        {problem && (
          <div
            role="alert"
            style={{
              ...BODY_SM,
              color: "var(--red)",
              border: "1px solid var(--red)",
              borderRadius: "var(--radius-control)",
              padding: "12px 15px",
              marginTop: 22,
              maxWidth: 340,
            }}
          >
            {problem}
          </div>
        )}

        <p
          style={{
            ...LABEL_SM,
            color: "var(--ink-faint)",
            marginTop: 48,
            textTransform: "none",
            letterSpacing: "0.04em",
            lineHeight: 1.9,
          }}
        >
          Already have a Tokenix key? <a href="/sign-in" style={{ color: "var(--amber-hot)" }}>Sign in</a> and
          link it.
        </p>
      </Container>
    </main>
  );
}
