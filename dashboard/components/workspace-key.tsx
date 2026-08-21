"use client";

import { useState } from "react";

/**
 * The workspace key panel.
 *
 * Two states, and the difference is not cosmetic:
 *
 * - `apiKey` present — this request just minted it. The database keeps only a
 *   SHA-256 hash and a 12-character prefix, so this is the one and only time
 *   the value can be displayed. The copy affordance and the warning both exist
 *   because there is no second chance.
 * - `apiKey` absent — the key already exists, so only its prefix can be shown.
 *   Not a degraded view: it is what "we cannot read your key either" looks
 *   like.
 */
export function WorkspaceKey({
  apiKey,
  keyPrefix,
}: {
  apiKey?: string;
  keyPrefix: string | null;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!apiKey) return;
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  }

  if (!apiKey) {
    return (
      <div>
        <div style={labelStyle}>Your workspace key</div>
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 13,
            color: "var(--text2)",
            background: "var(--s1)",
            border: "1px solid var(--border2)",
            padding: "12px 14px",
            wordBreak: "break-all",
          }}
        >
          {keyPrefix ? `${keyPrefix}${"…".repeat(1)}` : "No key on this workspace yet."}
        </div>
        <p style={noteStyle}>
          Only the first characters are stored — the rest is kept as a one-way hash, so nobody
          can read your key back, including us. If you have lost it, you will need a new one
          issued.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div style={labelStyle}>Your workspace key</div>
      <div
        style={{
          fontFamily: "var(--mono)",
          fontSize: 13,
          color: "var(--text)",
          background: "var(--s1)",
          border: "1px solid var(--accent)",
          padding: "12px 14px",
          wordBreak: "break-all",
          lineHeight: 1.6,
        }}
      >
        {apiKey}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 12 }}>
        <button type="button" onClick={copy} className="btn-primary" style={{ border: "none" }}>
          {copied ? "Copied" : "Copy key"} <span>{copied ? "✓" : "→"}</span>
        </button>
      </div>
      <p style={{ ...noteStyle, color: "var(--red)" }}>
        Copy this now — it is shown once and cannot be retrieved afterwards.
      </p>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 9,
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  color: "var(--text3)",
  marginBottom: 10,
};

const noteStyle: React.CSSProperties = {
  fontSize: 11,
  color: "var(--text3)",
  lineHeight: 1.8,
  marginTop: 12,
};
