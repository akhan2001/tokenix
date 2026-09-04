"use client";

import { useState } from "react";

/**
 * The steady-state equivalent of TestRequestButton, for a workspace whose
 * plaintext key is gone (every visit after the one that minted it).
 *
 * It cannot fire an authenticated request itself — there is no key left on
 * the server or the browser to sign one with, by design. What it CAN
 * honestly report is whether any real traffic has landed at all, via the
 * same total_requests check the onboarding flow already polls automatically.
 * Manual here rather than auto-polling: on a page someone may leave open,
 * repeatedly hitting the analytics API in the background for a check nobody
 * asked for isn't worth it the way it is during the one-time setup moment.
 */
export function ConnectionCheck() {
  const [status, setStatus] = useState<"idle" | "checking" | "connected" | "none" | "error">("idle");

  async function check() {
    setStatus("checking");
    try {
      const response = await fetch("/api/onboarding/status", { cache: "no-store" });
      if (!response.ok) {
        setStatus("error");
        return;
      }
      const body = (await response.json()) as { connected?: boolean };
      setStatus(body.connected ? "connected" : "none");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <button
        type="button"
        onClick={check}
        disabled={status === "checking"}
        style={{
          padding: "8px 14px",
          borderRadius: "var(--dash-radius-control)",
          background: "var(--s2)",
          border: "1px solid var(--border)",
          color: "var(--text)",
          fontSize: 12.5,
          cursor: status === "checking" ? "default" : "pointer",
        }}
      >
        {status === "checking" ? "Checking…" : "Check for traffic"}
      </button>
      {status === "connected" && (
        <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: "var(--green)" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)" }} />
          Requests received
        </span>
      )}
      {status === "none" && <span style={{ fontSize: 12.5, color: "var(--text3)" }}>No requests yet</span>}
      {status === "error" && <span style={{ fontSize: 12.5, color: "var(--red)" }}>Could not check right now</span>}
    </div>
  );
}
