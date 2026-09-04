"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon, EyeIcon, EyeOffIcon } from "lucide-react";

/**
 * The workspace key panel.
 *
 * Two states, and the difference is not cosmetic:
 *
 * - `apiKey` present — this request just minted it. The database keeps only a
 *   SHA-256 hash and a 12-character prefix, so this is the one and only time
 *   the value can be displayed. There's nothing to mask: the whole point is
 *   showing it, so this renders in the clear with a Copy button and the
 *   "shown once" warning.
 * - `apiKey` absent — an existing key. Only the 12-character prefix is ever
 *   known server-side (the rest is a one-way hash), so "Reveal" toggles
 *   between a masked prefix and the same prefix unmasked — it was never
 *   possible to reveal the full key, and this doesn't pretend otherwise.
 *
 * The key value itself stays monospace — it's a real credential, the one
 * place on this page mono is the right choice, everything else is Inter via
 * the DashCard/dashboard-scope system.
 */
export function WorkspaceKey({
  apiKey,
  keyPrefix,
}: {
  apiKey?: string;
  keyPrefix: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(false);

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  }

  if (!apiKey) {
    const display = keyPrefix ? (revealed ? `${keyPrefix}…` : mask(keyPrefix)) : null;
    return (
      <div>
        <div style={labelStyle}>Your workspace key</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ ...keyBox, flex: 1, minWidth: 0 }}>
            {display ?? "No key on this workspace yet."}
          </div>
          {keyPrefix && (
            <>
              <IconButton
                label={revealed ? "Hide key" : "Reveal key"}
                onClick={() => setRevealed((r) => !r)}
              >
                {revealed ? <EyeOffIcon size={14} /> : <EyeIcon size={14} />}
              </IconButton>
              <IconButton label="Copy key" onClick={() => copy(keyPrefix)}>
                {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
              </IconButton>
            </>
          )}
        </div>
        <p style={noteStyle}>
          Only the first characters are ever stored — the rest is kept as a one-way hash, so
          nobody can read your full key back, including us. If you have lost it, you will need a
          new one issued.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div style={labelStyle}>Your workspace key</div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ ...keyBox, flex: 1, minWidth: 0, borderColor: "var(--accent)", color: "var(--text)" }}>
          {apiKey}
        </div>
        <IconButton label="Copy key" onClick={() => copy(apiKey)} accent>
          {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
        </IconButton>
      </div>
      <p style={{ ...noteStyle, color: "var(--red)" }}>
        Copy this now — it is shown once and cannot be retrieved afterwards.
      </p>
    </div>
  );
}

/** `txk-abc123def456` → `txk-••••••••••••` — same length, so masking never leaks the key's length as extra information. */
function mask(prefix: string): string {
  const dash = prefix.indexOf("-");
  if (dash === -1) return "•".repeat(prefix.length);
  return prefix.slice(0, dash + 1) + "•".repeat(prefix.length - dash - 1);
}

function IconButton({
  label,
  onClick,
  children,
  accent = false,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      style={{
        flexShrink: 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 34,
        height: 34,
        borderRadius: "var(--dash-radius-control)",
        border: "1px solid var(--border)",
        background: accent ? "var(--accent)" : "var(--s2)",
        color: accent ? "#141416" : "var(--text2)",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

export const primaryButton: React.CSSProperties = {
  padding: "9px 16px",
  borderRadius: "var(--dash-radius-control)",
  background: "var(--accent)",
  color: "#141416",
  fontSize: 13,
  fontWeight: 500,
  border: "none",
  cursor: "pointer",
};

const keyBox: React.CSSProperties = {
  fontFamily: "var(--mono)",
  fontSize: 13,
  color: "var(--text2)",
  background: "var(--s2)",
  border: "1px solid var(--border)",
  borderRadius: "var(--dash-radius-control)",
  padding: "10px 12px",
  wordBreak: "break-all",
  lineHeight: 1.6,
};

const labelStyle: React.CSSProperties = {
  fontSize: 11.5,
  color: "var(--text2)",
  marginBottom: 10,
};

const noteStyle: React.CSSProperties = {
  fontSize: 11.5,
  color: "var(--text3)",
  lineHeight: 1.8,
  marginTop: 12,
};
