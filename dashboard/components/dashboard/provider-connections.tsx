"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { saveProviderKeyAction, type ProviderKeyState } from "@/app/(app)/dashboard/connect-actions";
import { DashCard } from "@/components/dashboard/dash-card";
import { PROVIDERS, type Provider } from "@/lib/providers";

/**
 * Per-provider credential cards: OpenAI, Anthropic, Google.
 *
 * A workspace's gateway key alone doesn't route any traffic — the gateway
 * needs the customer's own provider credentials to actually call OpenAI/
 * Anthropic/Google on their behalf, and until this existed the dashboard had
 * no way to give it one. That gap is why this used to render as a disabled
 * "Not available yet" placeholder: the endpoint's existence wasn't
 * confirmed at the time. It now is (verified working via a manual admin
 * call), so this replaces the placeholder with the real save flow.
 *
 * `connected` reflects `listConnectedProviders`, which itself may come back
 * `null` if the gateway doesn't expose a status endpoint (its shape was never
 * confirmed, unlike the POST save) — in that case every card starts
 * "Not connected" regardless of what's actually stored, until the provider
 * is (re)saved in this session. That's a known gap, not a silent guess: see
 * the comment on listConnectedProviders in lib/provider-keys.ts.
 */
export function ProviderConnections({ connected }: { connected: Provider[] | null }) {
  return (
    <div>
      <div style={{ fontSize: 14.5, fontWeight: 500, color: "var(--text)", marginBottom: 4 }}>
        Provider connections
      </div>
      <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.7, margin: "0 0 16px", maxWidth: "56ch" }}>
        Add your own OpenAI, Anthropic or Google API key so the gateway can call that provider on
        your behalf. Keys are encrypted at rest and decrypted only for the length of one upstream
        call.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
        {PROVIDERS.map(({ id, label }) => (
          <ProviderCard key={id} provider={id} label={label} initiallyConnected={connected?.includes(id) ?? false} />
        ))}
      </div>
    </div>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      style={{
        padding: "7px 14px",
        borderRadius: "var(--dash-radius-control)",
        background: "var(--accent)",
        color: "#141416",
        fontSize: 12.5,
        fontWeight: 500,
        border: "none",
        cursor: pending ? "default" : "pointer",
        opacity: pending ? 0.6 : 1,
      }}
    >
      {pending ? "Saving…" : "Save"}
    </button>
  );
}

/** `sk-proj-abc123XYZ` → `sk-proj-` + dots — the first 8 characters, masked past that. */
function mask(value: string): string {
  const visible = value.slice(0, 8);
  const hidden = Math.max(value.length - 8, 4);
  return visible + "•".repeat(hidden);
}

function ProviderCard({
  provider,
  label,
  initiallyConnected,
}: {
  provider: Provider;
  label: string;
  initiallyConnected: boolean;
}) {
  const [state, action] = useActionState<ProviderKeyState, FormData>(saveProviderKeyAction, {});
  // The plaintext never comes back from the server — this holds only what
  // the user just typed, purely so the card can show a masked confirmation
  // of what was submitted. It's cleared the instant the value is captured.
  const [savedValue, setSavedValue] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const connected = (initiallyConnected || state.success) && !editing;

  if (connected) {
    return (
      <DashCard>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--text)" }}>{label}</div>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11.5,
              color: "var(--green)",
            }}
          >
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--green)" }} />
            Connected ✓
          </span>
        </div>
        {savedValue && (
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: 12,
              color: "var(--text2)",
              background: "var(--s2)",
              border: "1px solid var(--border)",
              borderRadius: "var(--dash-radius-control)",
              padding: "8px 10px",
              marginBottom: 10,
              wordBreak: "break-all",
            }}
          >
            {mask(savedValue)}
          </div>
        )}
        <button
          type="button"
          onClick={() => setEditing(true)}
          style={{ border: "none", background: "none", cursor: "pointer", padding: 0, fontSize: 12, color: "var(--accent)" }}
        >
          Replace key
        </button>
      </DashCard>
    );
  }

  return (
    <DashCard>
      <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--text)", marginBottom: 10 }}>{label}</div>
      <form
        action={(formData) => {
          setSavedValue(String(formData.get("api_key") ?? ""));
          setEditing(false);
          return action(formData);
        }}
        style={{ display: "grid", gap: 8 }}
      >
        <input type="hidden" name="provider" value={provider} />
        <input
          name="api_key"
          type="password"
          autoComplete="off"
          spellCheck={false}
          placeholder={`${label} API key`}
          aria-label={`${label} API key`}
          style={{
            fontFamily: "var(--mono)",
            fontSize: 12.5,
            padding: "9px 10px",
            borderRadius: "var(--dash-radius-control)",
            background: "var(--s2)",
            border: `1px solid ${state.error ? "var(--red)" : "var(--border)"}`,
            color: "var(--text)",
            outline: "none",
            width: "100%",
          }}
        />
        {state.error && (
          <div role="alert" style={{ fontSize: 11.5, color: "var(--red)" }}>
            {state.error}
          </div>
        )}
        <div>
          <SaveButton />
        </div>
      </form>
    </DashCard>
  );
}
