"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  createWorkspaceAction,
  linkKeyAction,
  type ConnectState,
} from "@/app/(app)/dashboard/connect-actions";
import { WorkspaceKey, primaryButton } from "@/components/workspace-key";

/**
 * Two jobs, both always offered: claim an existing workspace by its key, or
 * issue a brand new one.
 *
 * `mode="setup"` (no workspace on the account at all) frames the create
 * option as "New here?". `mode="relink"` (Connect page, already-provisioned
 * user) frames the identical action as "Lost your key?" — it used to be
 * hidden entirely in this mode, which meant someone who lost their only key
 * had no visible way to recover: the paste-a-key form assumes you have
 * ANOTHER key, and there is no key-rotation endpoint on the gateway to
 * reissue the same workspace's key (a known gap — see skills.md's Known
 * Issues). Minting a new workspace is the only self-serve recovery that
 * exists today, so it has to be reachable from both entry points.
 */
function LinkButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} style={{ ...primaryButton, opacity: pending ? 0.6 : 1 }}>
      {pending ? "Linking…" : "Link this key →"}
    </button>
  );
}

function CreateButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      style={{
        border: "none",
        background: "none",
        cursor: "pointer",
        padding: 0,
        fontSize: 13,
        color: "var(--accent)",
        opacity: pending ? 0.6 : 1,
      }}
    >
      {pending ? "Creating…" : "Create a new workspace →"}
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
            borderRadius: "var(--dash-radius-control)",
            background: "var(--s2)",
            border: `1px solid ${linkState.error ? "var(--red)" : "var(--border)"}`,
            color: "var(--text)",
            outline: "none",
            width: "100%",
          }}
        />
        {linkState.error && !showKey && (
          <div role="alert" style={{ fontSize: 12, color: "var(--red)", lineHeight: 1.7 }}>
            {linkState.error}
          </div>
        )}
        <div>
          <LinkButton />
        </div>
      </form>

      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 22 }}>
        <div style={labelStyle}>{mode === "relink" ? "Lost your key?" : "New here?"}</div>
        <p style={helpStyle}>
          {mode === "relink"
            ? "Issue a brand new workspace and key — it starts empty, separate from the one above. There is no way to recover or reissue the same key, so this is the only way back in if you no longer have it."
            : "We will issue a workspace and its key. The key is shown once and cannot be recovered afterwards."}
        </p>
        <form action={createAction}>
          <CreateButton />
        </form>
        {createState.error && (
          <div role="alert" style={{ fontSize: 12, color: "var(--red)", lineHeight: 1.7, marginTop: 10 }}>
            {createState.error}
          </div>
        )}
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: "var(--text)",
  marginBottom: 8,
};

const helpStyle: React.CSSProperties = {
  fontSize: 12,
  color: "var(--text2)",
  lineHeight: 1.75,
  margin: "0 0 6px",
};
