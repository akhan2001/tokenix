import type { Metadata } from "next";

import { DashPageHeader } from "@/components/dashboard/dash-page-header";
import { DashCard } from "@/components/dashboard/dash-card";
import { ProviderConnections } from "@/components/dashboard/provider-connections";
import { ConnectionCheck } from "@/components/dashboard/connection-check";
import { FreshSetup } from "@/components/dashboard/fresh-setup";
import { GenerateSnippet } from "@/components/dashboard/generate-snippet";
import { WorkspaceKey } from "@/components/workspace-key";
import { WorkspaceSetup } from "@/components/workspace-setup";
import { requireClerkUser } from "@/lib/require-key";
import { ProvisionError, findWorkspace, provisionWorkspace } from "@/lib/workspace";
import { listConnectedProviders, type Provider } from "@/lib/provider-keys";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Connect · Tokenix",
  description: "Route your AI traffic through Tokenix by changing one line.",
};

/**
 * The sole onboarding surface: key, provider credentials, code snippet, and
 * a live test — end to end, in one place, in the order a brand new user
 * actually needs them.
 *
 * Signup now lands here directly (`?welcome=1`, see signup-panel.tsx and
 * sso-callback/page.tsx) instead of on the Overview dashboard behind a
 * modal. That split existed because /dashboard was built first and the key
 * reveal got bolted onto it; splitting setup across two surfaces (a modal
 * over spend data that doesn't exist yet, plus a separate management page
 * with no memory of what was just shown) is exactly what made this
 * unusable end to end. Overview now assumes a workspace already exists —
 * see its own file — and sends anyone without one back here.
 *
 * Four branches:
 *   1. `problem`    — the gateway/analytics API couldn't be reached.
 *   2. `needsSetup` — signed in, no workspace, and no `?welcome=1`: this is
 *      the ambiguous case (brand new vs. a pre-Clerk customer with an
 *      unlinked workspace) that must not be auto-resolved — see
 *      WorkspaceSetup's own comment for why.
 *   3. `freshKey`   — a workspace was just minted THIS request, so the
 *      plaintext key exists. The full four-step flow renders inline: key,
 *      provider connections, a snippet with the REAL key already in it, and
 *      a button that fires one real request to prove it all works. This is
 *      the only place in the app any of that is possible, because it is the
 *      only place the plaintext key is ever available at all.
 *   4. Steady state — an existing workspace, key already forgotten server-
 *      side (a SHA-256 hash and a 12-character prefix are all that remain).
 *      Provider management stays fully live here; the code snippet and key
 *      display necessarily fall back to a masked prefix and a placeholder,
 *      because there is no real key left to show — not a gap, a consequence
 *      of the key being genuinely unrecoverable by design.
 */
export default async function ConnectPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const user = await requireClerkUser();
  const { welcome } = await searchParams;

  let keyPrefix: string | null = null;
  let freshKey: string | null = null;
  let workspaceId: string | null = null;
  let needsSetup = false;
  let problem: string | null = null;

  try {
    const existing = await findWorkspace(user.id);
    if (existing) {
      keyPrefix = existing.key_prefix;
      workspaceId = existing.workspace_id;
    } else if (welcome === "1") {
      // `?welcome=1` is set only by the signup flow, which has already
      // established this person is genuinely new — see signup-panel.tsx for
      // why a forgeable query parameter is an acceptable carrier for intent
      // here (the worst a forged one does is mint an empty workspace, which
      // the needsSetup branch below already offers behind a button).
      const email = user.emailAddresses[0]?.emailAddress ?? null;
      const created = await provisionWorkspace(
        user.id,
        email,
        email?.split("@")[0] || `workspace-${user.id.slice(-6)}`,
      );
      workspaceId = created.workspace_id;
      keyPrefix = created.key_prefix;
      freshKey = created.api_key;
    } else {
      // Ambiguous: no workspace and no declared intent. Ask who they are.
      needsSetup = true;
    }
  } catch (error) {
    problem =
      error instanceof ProvisionError
        ? error.message
        : "Something went wrong preparing your workspace. Try reloading in a moment.";
  }

  const connectedProviders =
    workspaceId && !problem ? await listConnectedProviders(workspaceId) : null;

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
      ) : freshKey ? (
        <FreshSetup apiKey={freshKey} />
      ) : (
        <SteadyState keyPrefix={keyPrefix} connectedProviders={connectedProviders} />
      )}
    </section>
  );
}

/** Every visit after the one that minted the key — provider management stays live, everything else falls back honestly. */
function SteadyState({
  keyPrefix,
  connectedProviders,
}: {
  keyPrefix: string | null;
  connectedProviders: Provider[] | null;
}) {
  const STEPS = [
    { title: "Take your key" },
    { title: "Add provider credentials" },
    { title: "Change the base URL" },
  ];

  return (
    <>
      <DashCard padding="20px 22px" style={{ marginBottom: 18 }}>
        <WorkspaceKey apiKey={undefined} keyPrefix={keyPrefix} />
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
          <ConnectionCheck />
        </div>
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

      <div style={{ marginBottom: 24 }}>
        <GenerateSnippet />
      </div>

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
  );
}
