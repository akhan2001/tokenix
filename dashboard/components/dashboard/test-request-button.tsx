"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { testGatewayRequestAction, type TestRequestState } from "@/app/(app)/dashboard/connect-actions";

/**
 * The "removes all doubt" button. Fires one real, tiny request through the
 * gateway using the workspace key just shown above it, and reports back
 * "✓ Working" or the gateway's actual error — not a simulated check.
 *
 * Only usable in the moment the plaintext key exists (right after minting):
 * that's the only place this key can legally be handed to a form field at
 * all, since it is never stored or retrievable afterwards. There is no
 * steady-state equivalent of this exact button — see ConnectionCheck for
 * the passive alternative available once the key is gone.
 */
function SendButton() {
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
      {pending ? "Sending…" : "Send a test request"}
    </button>
  );
}

export function TestRequestButton({ apiKey }: { apiKey: string }) {
  const [state, action] = useActionState<TestRequestState, FormData>(testGatewayRequestAction, {});

  return (
    <form action={action} style={{ display: "grid", gap: 12 }}>
      <input type="hidden" name="api_key" value={apiKey} />
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <SendButton />
        {state.status === "ok" && (
          <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "var(--green)" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)" }} />
            ✓ Working
          </span>
        )}
      </div>
      {state.status === "ok" && (
        <p style={{ fontSize: 12, color: "var(--text2)", margin: 0 }}>{state.message}</p>
      )}
      {state.status === "error" && (
        <div role="alert" style={{ fontSize: 12.5, color: "var(--red)", lineHeight: 1.6 }}>
          {state.message}
        </div>
      )}
    </form>
  );
}
