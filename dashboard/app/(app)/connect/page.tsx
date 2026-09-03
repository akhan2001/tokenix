import type { Metadata } from "next";

import { AppNav } from "@/components/app-nav";
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

const PYTHON = `from openai import OpenAI

client = OpenAI(
    api_key="txk-your-tokenix-key",
    base_url="${GATEWAY_URL}/openai/v1",
)`;

const TYPESCRIPT = `import OpenAI from "openai";

const client = new OpenAI({
  apiKey: "txk-your-tokenix-key",
  baseURL: "${GATEWAY_URL}/openai/v1",
});`;

function CodeBlock({ label, code }: { label: string; code: string }) {
  return (
    <div>
      <div
        style={{
          fontSize: 9,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "var(--text3)",
          marginBottom: 10,
        }}
      >
        {label}
      </div>
      <pre
        style={{
          fontFamily: "var(--mono)",
          fontSize: 12,
          lineHeight: 1.85,
          color: "var(--text2)",
          background: "var(--s1)",
          border: "1px solid var(--border)",
          padding: "16px 18px",
          margin: 0,
          overflowX: "auto",
        }}
      >
        {code}
      </pre>
    </div>
  );
}

function Step({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "38px 1fr", gap: 18 }}>
      <div
        style={{
          fontFamily: "var(--sans)",
          fontSize: 13,
          color: "var(--accent)",
          paddingTop: 2,
        }}
      >
        {n}
      </div>
      <div>
        <h3
          style={{
            fontFamily: "var(--sans)",
            fontSize: 17,
            fontWeight: 500,
            color: "var(--text)",
            margin: "0 0 12px",
          }}
        >
          {title}
        </h3>
        {children}
      </div>
    </div>
  );
}

export default async function ConnectPage() {
  const user = await requireClerkUser();
  const email = user.emailAddresses[0]?.emailAddress ?? null;

  // No auto-provisioning. A signed-in person with no workspace is either brand
  // new or an existing customer whose workspace predates Clerk and so has no
  // account attached; minting for both silently handed the second an empty
  // workspace while their real history sat behind an unlinked key. The page
  // asks instead, and provisioning became an explicit action.
  const freshKey: string | undefined = undefined;
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

      <section
        className="app-wrap"
        style={{ maxWidth: 1200, margin: "0 auto", width: "100%", padding: "var(--space-section-sm) 48px var(--space-section-md)" }}
      >
        <div className="sec-kicker">Onboarding</div>
        <h1
          style={{
            fontFamily: "var(--sans)",
            fontSize: 30,
            fontWeight: 500,
            letterSpacing: "-0.01em",
            color: "var(--text)",
            margin: "0 0 10px",
          }}
        >
          Connect your workspace
        </h1>
        <p
          style={{
            fontSize: 12,
            color: "var(--text3)",
            lineHeight: 1.9,
            maxWidth: 620,
            marginBottom: 42,
          }}
        >
          Point your existing OpenAI SDK at the Tokenix gateway. Every request keeps working
          exactly as it does today — and each one gets priced against the ACPI as it passes
          through.
        </p>

        <div
          className="connect-grid"
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 56, alignItems: "start" }}
        >
          {/* Left: the steps */}
          <div style={{ display: "flex", flexDirection: "column", gap: 34 }}>
            <Step n="01" title="Get your workspace key">
              <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.9, margin: 0 }}>
                Your Tokenix key looks like <code style={{ fontFamily: "var(--mono)" }}>txk-…</code>
                . It is issued once when the workspace is created and is not recoverable
                afterwards — if you have lost it, issue a new one and revoke the old.
              </p>
            </Step>

            <Step n="02" title="Add your provider credentials">
              <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.9, margin: 0 }}>
                Store your own OpenAI, Anthropic or Google keys against the workspace. They are
                encrypted at rest, decrypted in memory only for the duration of a single upstream
                call, and never logged. You keep your existing provider accounts and billing.
              </p>
            </Step>

            <Step n="03" title="Change one line">
              <p
                style={{
                  fontSize: 12,
                  color: "var(--text2)",
                  lineHeight: 1.9,
                  margin: "0 0 18px",
                }}
              >
                Swap the base URL. Nothing else about your code changes. Use{" "}
                <code style={{ fontFamily: "var(--mono)" }}>/anthropic/v1</code> or{" "}
                <code style={{ fontFamily: "var(--mono)" }}>/google/v1</code> to reach those
                providers through the same OpenAI SDK.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <CodeBlock label="Python" code={PYTHON} />
                <CodeBlock label="TypeScript" code={TYPESCRIPT} />
              </div>
            </Step>

            <Step n="04" title="Tag your traffic (optional)">
              <p
                style={{
                  fontSize: 12,
                  color: "var(--text2)",
                  lineHeight: 1.9,
                  margin: "0 0 14px",
                }}
              >
                Send these headers to slice spend by product surface and environment on the
                Insights page.
              </p>
              <pre
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 12,
                  lineHeight: 1.85,
                  color: "var(--text2)",
                  background: "var(--s1)",
                  border: "1px solid var(--border)",
                  padding: "16px 18px",
                  margin: 0,
                  overflowX: "auto",
                }}
              >
                {"Tokenix-Feature:  search\nTokenix-Workload: production"}
              </pre>
            </Step>
          </div>

          {/* Right: the session form */}
          <div
            style={{
              border: "1px solid var(--border)",
              background: "linear-gradient(180deg, var(--s1), transparent)",
              padding: "30px 30px 34px",
              position: "sticky",
              top: 96,
            }}
          >
            <div className="sec-kicker" style={{ marginBottom: 6 }}>
              {needsSetup ? "Set up" : "Your workspace"}
            </div>
            <h2
              style={{
                fontFamily: "var(--sans)",
                fontSize: 20,
                fontWeight: 500,
                color: "var(--text)",
                margin: "0 0 8px",
              }}
            >
              {needsSetup ? "Connect a workspace" : "You are connected"}
            </h2>
            <p
              style={{
                fontSize: 11,
                color: "var(--text3)",
                lineHeight: 1.85,
                marginBottom: 24,
              }}
            >
              {problem
                ? "Your workspace could not be prepared. The details are below."
                : needsSetup
                  ? "Connect the workspace your traffic already flows through, or start a new one."
                  : freshKey
                  ? "Your workspace is ready. This key authenticates your traffic through the gateway — it is separate from the account you just signed in with."
                  : "Your workspace is ready. The key below authenticates your traffic through the gateway."}
            </p>

            {problem ? (
              <div
                role="alert"
                style={{
                  fontSize: 12,
                  color: "var(--red)",
                  lineHeight: 1.8,
                  border: "1px solid var(--red)",
                  padding: "13px 16px",
                }}
              >
                {problem}
              </div>
            ) : (
              needsSetup ? (
                <WorkspaceSetup />
              ) : (
                <>
                  <WorkspaceKey apiKey={freshKey} keyPrefix={keyPrefix} />
                  <div style={{ marginTop: 26 }}>
                    <a href="/insights" className="btn-primary">
                      Open insights <span>→</span>
                    </a>
                  </div>
                  {/* Anyone auto-provisioned before the setup choice existed
                      already has a workspace, so they would never see the
                      claim form — which is precisely who needs it. */}
                  <div style={{ marginTop: 34, borderTop: "1px solid var(--border)", paddingTop: 26 }}>
                    <WorkspaceSetup mode="relink" />
                  </div>
                </>
              )
            )}
          </div>
        </div>
      </section>
    </>
  );
}
