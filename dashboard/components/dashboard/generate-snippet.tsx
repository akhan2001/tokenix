"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { createWorkspaceAction, type ConnectState } from "@/app/(app)/dashboard/connect-actions";
import { DashCard } from "@/components/dashboard/dash-card";
import { FreshSetup } from "@/components/dashboard/fresh-setup";

/**
 * "Copy, paste, run" on demand, for a workspace whose real key is already
 * gone.
 *
 * The stored `key_prefix` is 12 characters of a ~47-character key — the
 * first ~8 characters of the actual secret, nothing more. Substituting it
 * into a snippet would produce something that LOOKS complete but silently
 * fails against the gateway (401): worse than an honest placeholder, since
 * it reads as ready-to-run right up until it isn't. There is no way to
 * recover the rest — it was never stored, encrypted or otherwise, only
 * hashed — so the only way to hand back a snippet that actually runs is to
 * mint a genuinely new key and show it in the clear, exactly like signup
 * does.
 *
 * Reuses `createWorkspaceAction` verbatim — the same action already backing
 * "Lost your key?" elsewhere on this page — so this introduces no new
 * backend behavior, just a second, better-labelled entry point to it: one
 * for "I lost access", one for "give me something that works right now".
 * Both mint a new workspace and leave the old one exactly where it was.
 *
 * Deliberately does not call router.refresh() after success. A previous
 * version of this page did that in a sibling flow and it caused a real
 * regression (unmounting the component holding the freshly-shown key before
 * anyone could copy it) — see workspace-setup.tsx's comment. The one
 * consequence here is that the WorkspaceKey/ConnectionCheck card above this
 * one keeps showing the OLD workspace's prefix until the page is reloaded;
 * a stale prefix is a far smaller cost than risking that regression again.
 */
function GenerateButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      style={{
        padding: "9px 16px",
        borderRadius: "var(--dash-radius-control)",
        background: "var(--accent)",
        color: "#141416",
        fontSize: 13,
        fontWeight: 500,
        border: "none",
        cursor: pending ? "default" : "pointer",
        opacity: pending ? 0.6 : 1,
      }}
    >
      {pending ? "Generating…" : "Generate a working snippet"}
    </button>
  );
}

export function GenerateSnippet() {
  const [state, action] = useActionState<ConnectState, FormData>(() => createWorkspaceAction(), {});

  if (state.apiKey) {
    return <FreshSetup apiKey={state.apiKey} />;
  }

  return (
    <DashCard padding="22px 24px">
      <div style={{ fontSize: 14.5, fontWeight: 500, color: "var(--text)", marginBottom: 6 }}>
        Get a working snippet
      </div>
      <p style={{ fontSize: 12.5, color: "var(--text2)", lineHeight: 1.7, margin: "0 0 16px", maxWidth: "60ch" }}>
        The key above can only ever be shown once, at the moment it was created — there is no way
        to recover it afterwards, by design. Generating one here issues a brand new workspace and
        key, ready to copy, paste and run immediately. The workspace above is left exactly as it
        is; this one starts separate and empty.
      </p>
      <form action={action}>
        <GenerateButton />
      </form>
      {state.error && (
        <div role="alert" style={{ fontSize: 12.5, color: "var(--red)", marginTop: 10 }}>
          {state.error}
        </div>
      )}
    </DashCard>
  );
}
