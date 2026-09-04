"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { CodeBlock, type Snippet } from "@/components/code-block";
import { Button, H2, BODY_SM, LABEL, DATA } from "@/components/primitives";
import { StepTag } from "./step-tag";

/**
 * Screens 2 and 3, collapsed into one overlay on the dashboard.
 *
 * They were specified as two routes. They are one panel because the key and
 * the snippet that uses it have to be readable in a single glance — the whole
 * point of substituting the real key into the sample is that nobody should
 * have to copy, navigate, and find-replace. Splitting the confirmation onto a
 * third route would then have parked the person on a page whose only content
 * was a status line, when the dashboard it is covering already says that and
 * more.
 *
 * The key is shown here and nowhere else, ever. `provisionWorkspace` receives
 * the plaintext once from the gateway; the database keeps a SHA-256 hash and a
 * 12-character prefix. There is no endpoint that can return it again, which is
 * why the copy affordance and the warning are load-bearing rather than
 * decorative.
 */

/**
 * The three snippets, with the real key already substituted into each.
 *
 * Assembled by join rather than as multi-line template literals: a trailing
 * backslash before a newline is a line continuation in JS, so writing the cURL
 * command the natural way silently eats both the newlines and the shell's own
 * continuations, collapsing it to one line.
 */
function buildSnippets(key: string, gateway: string): Snippet[] {
  const base = `${gateway}/openai/v1`;
  return [
    {
      id: "python",
      label: "Python",
      lang: "python",
      code: [
        "from openai import OpenAI",
        "",
        "client = OpenAI(",
        `    api_key="${key}",`,
        `    base_url="${base}",`,
        ")",
      ].join("\n"),
    },
    {
      id: "node",
      label: "Node",
      lang: "typescript",
      code: [
        'import OpenAI from "openai";',
        "",
        "const client = new OpenAI({",
        `  apiKey: "${key}",`,
        `  baseURL: "${base}",`,
        "});",
      ].join("\n"),
    },
    {
      id: "curl",
      label: "cURL",
      lang: "bash",
      code: [
        `curl ${base}/chat/completions \\`,
        `  -H "Authorization: Bearer ${key}" \\`,
        '  -H "Content-Type: application/json" \\',
        `  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"hi"}]}'`,
      ].join("\n"),
    },
  ];
}

const POLL_MS = 4000;

export function KeyRevealModal({ apiKey, gatewayUrl }: { apiKey: string; gatewayUrl: string }) {
  const router = useRouter();
  const [connected, setConnected] = useState(false);
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const copyKey = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  }, [apiKey]);

  const dismiss = useCallback(() => {
    setOpen(false);
    // Drop ?welcome=1 so a reload cannot ask for another mint. It would not get
    // one — the workspace exists now — but leaving the flag in the URL implies
    // it might.
    router.replace("/dashboard");
  }, [router]);

  // Poll until the first request lands. Stops on success, so a workspace that
  // is already live costs one request and nothing after it.
  useEffect(() => {
    if (!open || connected) return;
    let cancelled = false;

    async function check() {
      try {
        const response = await fetch("/api/onboarding/status", { cache: "no-store" });
        if (!response.ok) return;
        const body = (await response.json()) as { connected?: boolean };
        if (!cancelled && body.connected) setConnected(true);
      } catch {
        // Offline, or a blip upstream. Keep waiting rather than declaring
        // failure over a key the person is still copying.
      }
    }

    void check();
    const timer = setInterval(check, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [open, connected]);

  useEffect(() => {
    panelRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") dismiss();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dismiss]);

  if (!open) return null;

  const snippets = buildSnippets(apiKey, gatewayUrl);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(7,7,10,0.82)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        overflowY: "auto",
        padding: "clamp(20px, 6vh, 72px) var(--pad-x)",
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="key-reveal-title"
        tabIndex={-1}
        style={{
          width: "100%",
          maxWidth: 640,
          border: "1px solid var(--line-strong)",
          borderRadius: "var(--radius-panel)",
          background: "var(--panel)",
          padding: "clamp(24px, 4vw, 38px)",
          outline: "none",
        }}
      >
        <StepTag step={2} />

        <h2 id="key-reveal-title" style={{ ...H2, color: "var(--ink)", marginBottom: 14 }}>
          Your gateway key.
        </h2>
        <p style={{ ...BODY_SM, color: "var(--ink)", marginBottom: 26, maxWidth: "52ch" }}>
          This is the only time it can be shown. We keep a one-way hash of it, so nobody can read
          it back afterwards — including us.
        </p>

        {/* The key itself, in the panel treatment the ACPI formula strip uses. */}
        <div
          style={{
            border: "1px solid var(--line-strong)",
            borderRadius: "var(--radius-panel)",
            background: "var(--bg)",
            padding: "16px 18px",
            display: "flex",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <code
            style={{
              ...DATA,
              fontSize: 13.5,
              color: "var(--amber-hot)",
              wordBreak: "break-all",
              flex: "1 1 260px",
              minWidth: 0,
            }}
          >
            {apiKey}
          </code>
          <Button
            variant="secondary"
            onClick={copyKey}
            arrow={false}
            style={{ fontSize: 12, padding: "8px 14px" }}
          >
            {copied ? "Copied ✓" : "Copy key"}
          </Button>
        </div>

        <div style={{ marginTop: 38 }}>
          <StepTag step={3} />
          <h3 style={{ ...H2, fontSize: 22, color: "var(--ink)", marginBottom: 12 }}>
            Change one line.
          </h3>
          <p style={{ ...BODY_SM, color: "var(--ink)", marginBottom: 20, maxWidth: "52ch" }}>
            Your key is already in the snippet — nothing to paste in. Point your existing SDK at
            the gateway and every request gets priced against ACPI as it passes through.
          </p>

          <CodeBlock snippets={snippets} label="Snippet language" />
        </div>

        {/* The loop closes itself — there is no "I'm done" to press. */}
        <div
          style={{
            marginTop: 32,
            paddingTop: 22,
            borderTop: "1px solid var(--line)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 18,
            flexWrap: "wrap",
          }}
        >
          <div
            aria-live="polite"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              ...LABEL,
              color: "var(--ink-dim)",
            }}
          >
            {connected ? (
              <>
                <span
                  aria-hidden
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "var(--green)",
                    boxShadow: "0 0 7px var(--green)",
                    flexShrink: 0,
                  }}
                />
                <span style={{ color: "var(--green)" }}>Connected ✓</span>
              </>
            ) : (
              <>
                <span className="pulse-dot" aria-hidden />
                <span>Waiting for first request…</span>
              </>
            )}
          </div>

          <Button variant={connected ? "primary" : "secondary"} onClick={dismiss} arrow={false}>
            {connected ? "Open overview" : "I saved my key"}
          </Button>
        </div>
      </div>
    </div>
  );
}
