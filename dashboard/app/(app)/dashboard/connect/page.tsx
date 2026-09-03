import type { Metadata } from "next";

import { AppNav } from "@/components/app-nav";
import { StepTag } from "@/components/onboarding/step-tag";
import { CodeBlock, type Snippet } from "@/components/code-block";
import { Container, H2, H3, BODY_SM, DATA } from "@/components/primitives";
import { WorkspaceKey } from "@/components/workspace-key";
import { WorkspaceSetup } from "@/components/workspace-setup";
import { requireClerkUser } from "@/lib/require-key";
import { ProvisionError, findWorkspace } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Connect · Tokenix",
  description: "Route your AI traffic through Tokenix by changing one line.",
};

const GATEWAY_URL =
  process.env.NEXT_PUBLIC_TOKENIX_GATEWAY_URL ?? "https://gateway.tokenixindex.com";

const SNIPPETS: Snippet[] = [
  {
    id: "python",
    label: "Python",
    lang: "python",
    code: `from openai import OpenAI

client = OpenAI(
    api_key="txk-your-tokenix-key",
    base_url="${GATEWAY_URL}/openai/v1",
)`,
  },
  {
    id: "typescript",
    label: "TypeScript",
    lang: "typescript",
    code: `import OpenAI from "openai";

const client = new OpenAI({
  apiKey: "txk-your-tokenix-key",
  baseURL: "${GATEWAY_URL}/openai/v1",
});`,
  },
  {
    id: "curl",
    label: "cURL",
    lang: "bash",
    // Joined rather than written as one template literal: a trailing backslash
    // before a newline is a line continuation in JS, so the shell's own
    // continuations get eaten and the command collapses onto a single line.
    code: [
      `curl ${GATEWAY_URL}/openai/v1/chat/completions \\`,
      `  -H "Authorization: Bearer txk-your-tokenix-key" \\`,
      `  -H "Content-Type: application/json" \\`,
      `  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"hi"}]}'`,
    ].join("\n"),
  },
];

/**
 * Steps, tightened to one claim each.
 *
 * They were three-paragraph prose blocks in a 38px-gutter list. Nobody reads
 * three paragraphs to find out that they change a base URL, and at four steps
 * of that length the left column ran roughly twice the height of the panel
 * beside it — which is what made the page look unbalanced and left the sticky
 * card stranded in dead space near the bottom.
 *
 * Three steps in an equal grid instead, with the detail that actually needs
 * space — the code — promoted out into its own full-width panel below.
 */
const STEPS = [
  {
    title: "Take your key",
    body: (
      <>
        It looks like <code style={{ fontFamily: "var(--mono)" }}>txk-…</code> and is issued once.
        It is not recoverable afterwards — lose it and you issue a new one.
      </>
    ),
  },
  {
    title: "Add your provider credentials",
    body: (
      <>
        Your own OpenAI, Anthropic or Google keys, encrypted at rest and decrypted only for the
        length of one upstream call. You keep your existing accounts and billing.
      </>
    ),
  },
  {
    title: "Change the base URL",
    body: (
      <>
        Nothing else about your code moves. Use <code style={{ fontFamily: "var(--mono)" }}>/anthropic/v1</code>{" "}
        or <code style={{ fontFamily: "var(--mono)" }}>/google/v1</code> to reach those providers
        through the same SDK.
      </>
    ),
  },
];

export default async function ConnectPage() {
  const user = await requireClerkUser();

  // No auto-provisioning. A signed-in person with no workspace is either brand
  // new or an existing customer whose workspace predates Clerk and so has no
  // account attached; minting for both silently handed the second an empty
  // workspace while their real history sat behind an unlinked key. The page
  // asks instead, and provisioning became an explicit action.
  let keyPrefix: string | null = null;
  let needsSetup = false;
  let problem: string | null = null;

  try {
    const existing = await findWorkspace(user.id);
    if (existing) {
      keyPrefix = existing.key_prefix;
    } else {
      needsSetup = true;
    }
  } catch (error) {
    problem =
      error instanceof ProvisionError
        ? error.message
        : "Something went wrong preparing your workspace. Try reloading in a moment.";
  }

  const connected = problem === null;

  return (
    <>
      <AppNav page="connect" connected={connected} />

      {/* 1080, matching AppNav. It was 1200 against the nav's 1080, so the tab
          bar and the page content did not share a left edge. */}
      <Container
        style={{ padding: "var(--space-section-sm) var(--pad-x) var(--space-section-md)" }}
      >
        <div className="sec-kicker">Onboarding</div>
        <h1 style={{ ...H2, color: "var(--ink)", marginBottom: 16 }}>Connect your workspace.</h1>
        <p style={{ ...BODY_SM, color: "var(--ink)", maxWidth: "56ch", marginBottom: 44 }}>
          Point your existing OpenAI SDK at the Tokenix gateway. Every request keeps working exactly
          as it does today — and each one gets priced against the ACPI on its way through.
        </p>

        {/* ── The workspace itself. Full width and first, because it is the
            thing people come back to this page for. It used to sit in a
            sticky right-hand column that ran out of content long before the
            steps beside it did. ─────────────────────────────────────────── */}
        <div
          style={{
            border: "1px solid var(--line-strong)",
            borderRadius: "var(--radius-panel)",
            background: "var(--panel)",
            padding: "clamp(24px, 3vw, 34px)",
            marginBottom: 64,
          }}
        >
          <div className="sec-kicker">{needsSetup ? "Set up" : "Your workspace"}</div>
          <h2 style={{ ...H3, color: "var(--ink)", margin: "0 0 10px" }}>
            {needsSetup ? "Connect a workspace" : "You are connected"}
          </h2>
          <p style={{ ...BODY_SM, color: "var(--ink)", maxWidth: "60ch", marginBottom: 26 }}>
            {problem
              ? "Your workspace could not be prepared. The details are below."
              : needsSetup
                ? "Connect the workspace your traffic already flows through, or start a new one."
                : "The key below authenticates your traffic through the gateway. It is separate from the account you signed in with."}
          </p>

          {problem ? (
            <div
              role="alert"
              style={{
                ...BODY_SM,
                color: "var(--red)",
                border: "1px solid var(--red)",
                borderRadius: "var(--radius-control)",
                padding: "13px 16px",
              }}
            >
              {problem}
            </div>
          ) : needsSetup ? (
            <div style={{ maxWidth: 460 }}>
              <WorkspaceSetup />
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "clamp(28px, 4vw, 52px)",
                alignItems: "start",
              }}
            >
              <div>
                <WorkspaceKey apiKey={undefined} keyPrefix={keyPrefix} />
                <div style={{ marginTop: 26 }}>
                  <a href="/dashboard" className="btn-primary">
                    Open overview <span>→</span>
                  </a>
                </div>
              </div>
              {/* Anyone auto-provisioned before the setup choice existed already
                  has a workspace, so they would never see the claim form —
                  which is precisely who needs it. */}
              <div>
                <WorkspaceSetup mode="relink" />
              </div>
            </div>
          )}
        </div>

        {/* ── 2. How to connect. Equal columns, so nothing runs long. ───── */}
        <div className="sec-kicker">Integration</div>
        <h2 style={{ ...H2, fontSize: "clamp(24px, 2.4vw, 32px)", color: "var(--ink)", marginBottom: 36 }}>
          Three changes, then you are done.
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "clamp(24px, 3vw, 40px)",
            marginBottom: 44,
          }}
        >
          {STEPS.map((step, i) => (
            <div key={step.title}>
              <StepTag step={i + 1} total={STEPS.length} />
              <h3 style={{ ...H3, color: "var(--ink)", margin: "0 0 10px" }}>{step.title}</h3>
              <p style={{ ...BODY_SM, color: "var(--ink)", margin: 0 }}>{step.body}</p>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 56 }}>
          <CodeBlock snippets={SNIPPETS} label="Snippet language" />
        </div>

        {/* ── 3. Optional, and it should read that way. ─────────────────── */}
        <div style={{ borderTop: "1px solid var(--line)", paddingTop: 30 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "clamp(24px, 4vw, 48px)",
              alignItems: "start",
            }}
          >
            <div>
              <h3 style={{ ...H3, color: "var(--ink-dim)", margin: "0 0 10px" }}>
                Tag your traffic
              </h3>
              <p style={{ ...BODY_SM, color: "var(--ink-faint)", margin: 0, maxWidth: "42ch" }}>
                Optional. Send these headers to slice spend by product surface and environment on
                the Insights page.
              </p>
            </div>
            <pre
              style={{
                ...DATA,
                fontSize: 12.5,
                lineHeight: 1.85,
                color: "var(--ink-faint)",
                background: "var(--bg)",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius-panel)",
                padding: "16px 18px",
                margin: 0,
                overflowX: "auto",
              }}
            >
              {"Tokenix-Feature:  search\nTokenix-Workload: production"}
            </pre>
          </div>
        </div>
      </Container>
    </>
  );
}
