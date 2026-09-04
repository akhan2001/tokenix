import type { Metadata } from "next";

import { DashPageHeader } from "@/components/dashboard/dash-page-header";
import { DashCard } from "@/components/dashboard/dash-card";
import { ProviderConnections } from "@/components/dashboard/provider-connections";
import { CodeBlock, type Snippet } from "@/components/code-block";
import { WorkspaceKey } from "@/components/workspace-key";
import { WorkspaceSetup } from "@/components/workspace-setup";
import { requireClerkUser } from "@/lib/require-key";
import { ProvisionError, findWorkspace } from "@/lib/workspace";
import { listConnectedProviders, type Provider } from "@/lib/provider-keys";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Connect · Tokenix",
  description: "Route your AI traffic through Tokenix by changing one line.",
};

const GATEWAY_URL =
  process.env.NEXT_PUBLIC_TOKENIX_GATEWAY_URL ?? "https://gateway.tokenixindex.com";

function buildSnippets(key: string): Snippet[] {
  const base = `${GATEWAY_URL}/openai/v1`;
  return [
    {
      id: "python",
      label: "Python",
      lang: "python",
      code: ["from openai import OpenAI", "", "client = OpenAI(", `    api_key="${key}",`, `    base_url="${base}",`, ")"].join("\n"),
    },
    {
      id: "typescript",
      label: "TypeScript",
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
      // Joined rather than written as one template literal: a trailing
      // backslash before a newline is a line continuation in JS, so the
      // shell's own continuations get eaten and the command collapses onto
      // one line.
      code: [
        `curl ${base}/chat/completions \\`,
        `  -H "Authorization: Bearer ${key}" \\`,
        '  -H "Content-Type: application/json" \\',
        `  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"hi"}]}'`,
      ].join("\n"),
    },
  ];
}

const STEPS = [
  { title: "Take your key" },
  { title: "Add provider credentials" },
  { title: "Change the base URL" },
];

/**
 * Onboarding for an existing workspace, on the same Card/Inter system as
 * Overview — DashCard surfaces, one header row, no `.sec-kicker`/`■`
 * mono-caps labels. Two earlier passes at this page restyled individual
 * pieces within the marketing system rather than moving it onto the actual
 * dashboard tokens; this rebuild does the latter.
 *
 * The snippet's key stays a fixed placeholder rather than tracking the key
 * card's Reveal toggle. `provisionWorkspace` returns the plaintext exactly
 * once, at mint time — that moment is KeyRevealModal, which already
 * substitutes the real key into an identical snippet. Once minted, the
 * server holds only a SHA-256 hash and the 12-character prefix returned
 * here as `keyPrefix`, so this page's Reveal toggle can only ever unmask
 * that prefix — there is no full key anywhere for the snippet to adopt.
 */
export default async function ConnectPage() {
  const user = await requireClerkUser();

  // No auto-provisioning. A signed-in person with no workspace is either brand
  // new or an existing customer whose workspace predates Clerk and so has no
  // account attached; minting for both silently handed the second an empty
  // workspace while their real history sat behind an unlinked key. The page
  // asks instead, and provisioning became an explicit action.
  let keyPrefix: string | null = null;
  let connectedProviders: Provider[] | null = null;
  let needsSetup = false;
  let problem: string | null = null;

  try {
    const existing = await findWorkspace(user.id);
    if (existing) {
      keyPrefix = existing.key_prefix;
      connectedProviders = await listConnectedProviders(existing.workspace_id);
    } else {
      needsSetup = true;
    }
  } catch (error) {
    problem =
      error instanceof ProvisionError
        ? error.message
        : "Something went wrong preparing your workspace. Try reloading in a moment.";
  }

  return (
    <section style={{ maxWidth: 1280, margin: "0 auto", width: "100%", padding: "30px 34px 34px" }}>
      <DashPageHeader title="Connect" subtitle="Point your existing SDK at the Tokenix gateway" />

      {problem ? (
        <DashCard>
          <div role="alert" style={{ fontSize: 12.5, color: "var(--red)" }}>
            {problem}
          </div>
        </DashCard>
      ) : needsSetup ? (
        <DashCard padding="28px 30px">
          <div style={{ fontSize: 14.5, fontWeight: 500, color: "var(--text)", marginBottom: 6 }}>
            Connect a workspace
          </div>
          <p style={{ fontSize: 12.5, color: "var(--text2)", lineHeight: 1.7, maxWidth: "60ch", marginBottom: 22 }}>
            Connect the workspace your traffic already flows through, or start a new one.
          </p>
          <div style={{ maxWidth: 460 }}>
            <WorkspaceSetup />
          </div>
        </DashCard>
      ) : (
        <>
          <DashCard padding="20px 22px" style={{ marginBottom: 18 }}>
            <WorkspaceKey apiKey={undefined} keyPrefix={keyPrefix} />
          </DashCard>

          <div style={{ marginBottom: 24 }}>
            <ProviderConnections connected={connectedProviders} />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 14,
              marginBottom: 24,
            }}
          >
            {STEPS.map((step, i) => (
              <DashCard key={step.title} padding="16px 18px">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 12, color: "var(--accent)" }}>{i + 1}</span>
                  <span style={{ fontSize: 13, color: "var(--text)" }}>{step.title}</span>
                </div>
              </DashCard>
            ))}
          </div>

          <DashCard padding="22px 24px" style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 14.5, fontWeight: 500, color: "var(--text)", marginBottom: 16 }}>
              Change the base URL
            </div>
            <CodeBlock snippets={buildSnippets("txk-your-tokenix-key")} label="Snippet language" />
          </DashCard>

          <DashCard padding="22px 24px" style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--text2)", marginBottom: 6 }}>
              Tag your traffic
            </div>
            <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.7, margin: "0 0 14px", maxWidth: "56ch" }}>
              Optional. Send these headers to slice spend by product surface and environment on
              the Insights page.
            </p>
            <pre
              style={{
                fontFamily: "var(--mono)",
                fontSize: 12.5,
                lineHeight: 1.85,
                color: "var(--text3)",
                background: "var(--bg)",
                border: "1px solid var(--border)",
                borderRadius: "var(--dash-radius-control)",
                padding: "14px 16px",
                margin: 0,
                overflowX: "auto",
              }}
            >
              {"Tokenix-Feature:  search\nTokenix-Workload: production"}
            </pre>
          </DashCard>

          <DashCard padding="22px 24px">
            <div style={{ fontSize: 14.5, fontWeight: 500, color: "var(--text)", marginBottom: 6 }}>
              Connect a different workspace, or lost your key?
            </div>
            <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.7, margin: "0 0 18px", maxWidth: "56ch" }}>
              Paste another workspace&rsquo;s key to switch to it, or issue a brand new workspace
              below if the key above is the only one you had and it&rsquo;s gone.
            </p>
            <div style={{ maxWidth: 460 }}>
              <WorkspaceSetup mode="relink" />
            </div>
          </DashCard>
        </>
      )}
    </section>
  );
}
