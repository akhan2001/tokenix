"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  createWorkspaceAction,
  linkKeyAction,
  type ConnectState,
} from "@/app/(app)/connect-actions";
import { WorkspaceKey } from "@/components/workspace-key";

/**
 * First-run choice: claim an existing workspace, or start a new one.
 *
 * Shown when a signed-in person owns no workspace. That is two different
 * people — someone brand new, and an existing customer whose workspace predates
 * Clerk and so has no account attached. Auto-provisioning served the first and
 * quietly harmed the second, handing them an empty workspace while their real
 * spend history sat behind an unlinked key. So the page asks instead of
 * guessing.
 *
 * Claiming is offered first: getting it wrong is the expensive mistake, and a
 * new user reads one extra line before clicking the other button.
 */
function LinkButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending} style={{ border: "none" }}>
      {pending ? "Linking…" : "Link this key"} <span>→</span>
    </button>
  );
}

function CreateButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="btn-text"
      disabled={pending}
      style={{ border: "none", background: "none", cursor: "pointer", padding: 0 }}
    >
      {pending ? "Creating…" : "Create a new workspace"} <span className="arr">→</span>
    </button>
  );
}

export function WorkspaceSetup({ mode = "setup" }: { mode?: "setup" | "relink" }) {
  const [linkState, linkAction] = useActionState<ConnectState, FormData>(linkKeyAction, {});
  const [createState, createAction] = useActionState<ConnectState, FormData>(
    () => createWorkspaceAction(),
    {},
  );
  const [showKey, setShowKey] = useState(false);

  // A freshly minted key exists only in this response — show it and stop.
  if (createState.apiKey) {
    return <WorkspaceKey apiKey={createState.apiKey} keyPrefix={createState.apiKey.slice(0, 12)} />;
  }

  return (
    <div style={{ display: "grid", gap: 26 }}>
      <form action={linkAction} style={{ display: "grid", gap: 12 }}>
        <div style={labelStyle}>
          {mode === "relink" ? "Connect a different workspace" : "Already have a key?"}
        </div>
        <p style={helpStyle}>
          {mode === "relink"
            ? "Paste a txk- key to attach the workspace it belongs to. Its history comes with it, and the workspace shown above is released."
            : "If you were set up before accounts existed, paste your txk- key to attach that workspace — all of its history comes with it."}
        </p>
        <input
          name="key"
          type="password"
          autoComplete="off"
          spellCheck={false}
          placeholder="txk-…"
          aria-label="Your existing workspace key"
          aria-invalid={linkState.error ? true : undefined}
          onChange={() => setShowKey(false)}
          style={{
            fontFamily: "var(--mono)",
            fontSize: 13,
            padding: "12px 14px",
            background: "var(--s1)",
            border: `1px solid ${linkState.error ? "var(--red)" : "var(--border2)"}`,
            color: "var(--text)",
            outline: "none",
            width: "100%",
          }}
        />
        {linkState.error && !showKey && (
          <div role="alert" style={{ fontSize: 11, color: "var(--red)", lineHeight: 1.7 }}>
            {linkState.error}
          </div>
        )}
        <div>
          <LinkButton />
        </div>
      </form>

      {mode === "setup" && (
      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 22 }}>
        <div style={labelStyle}>New here?</div>
        <p style={helpStyle}>
          We will issue a workspace and its key. The key is shown once and cannot be recovered
          afterwards.
        </p>
        <form action={createAction}>
          <CreateButton />
        </form>
        {createState.error && (
          <div
            role="alert"
            style={{ fontSize: 11, color: "var(--red)", lineHeight: 1.7, marginTop: 10 }}
          >
            {createState.error}
          </div>
        )}
      </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 9,
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  color: "var(--text3)",
  marginBottom: 8,
};

const helpStyle: React.CSSProperties = {
  fontSize: 11,
  color: "var(--text3)",
  lineHeight: 1.85,
  margin: "0 0 6px",
};
