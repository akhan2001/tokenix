"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { connectWorkspace, type ConnectState } from "@/app/(app)/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending} style={{ border: "none" }}>
      {pending ? "Verifying…" : "Connect workspace"} <span>→</span>
    </button>
  );
}

export function ConnectForm() {
  const [state, formAction] = useActionState<ConnectState, FormData>(connectWorkspace, {});

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <label
        htmlFor="key"
        style={{
          fontSize: 9,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "var(--text3)",
        }}
      >
        Workspace key
      </label>
      <input
        id="key"
        name="key"
        type="password"
        autoComplete="off"
        spellCheck={false}
        placeholder="txk-…"
        aria-describedby={state.error ? "key-error" : undefined}
        aria-invalid={state.error ? true : undefined}
        style={{
          fontFamily: "var(--mono)",
          fontSize: 13,
          padding: "12px 14px",
          background: "var(--s1)",
          border: `1px solid ${state.error ? "var(--red)" : "var(--border2)"}`,
          color: "var(--text)",
          outline: "none",
          width: "100%",
        }}
      />

      {state.error && (
        <div
          id="key-error"
          role="alert"
          style={{ fontSize: 11, color: "var(--red)", lineHeight: 1.7 }}
        >
          {state.error}
        </div>
      )}

      <div style={{ marginTop: 4 }}>
        <SubmitButton />
      </div>

      <p style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.8, marginTop: 4 }}>
        The key is stored in an httpOnly cookie and only ever read on the server. It is never
        exposed to browser JavaScript.
      </p>
    </form>
  );
}
