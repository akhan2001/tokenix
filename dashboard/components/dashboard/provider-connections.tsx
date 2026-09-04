import { DashCard } from "@/components/dashboard/dash-card";

/**
 * Per-provider credential cards (OpenAI, Anthropic, Google) with a
 * reveal/copy/disconnect flow — specified, but not built as an interactive
 * form.
 *
 * Nothing in this repo can back it. `CLAUDE.md` documents a `provider_keys`
 * table in the database (workspace_id, provider, Fernet-encrypted key), but
 * there is no dashboard-side API client for it (grep of lib/tokenix-api.ts
 * and lib/workspace.ts turns up nothing), no route under app/api/ that could
 * proxy to one, and the gateway service that would own the actual
 * store/retrieve/disconnect endpoints isn't checked out in this workspace at
 * all — every fetch the dashboard makes today goes to one of four existing
 * endpoints (workspace create/lookup/link/link-key), none of them this.
 *
 * An expandable "add credential" input with a Save button that has nowhere
 * to POST would silently fail or lie about doing something — the same
 * failure mode gateway-section.tsx's header comment documents rejecting for
 * the "down 47%" claim it removed. This card says what's true instead: the
 * capability exists in the data model, not in any endpoint this app can
 * call yet.
 */
const PROVIDERS = ["OpenAI", "Anthropic", "Google"];

export function ProviderConnections() {
  return (
    <div>
      <div style={{ fontSize: 14.5, fontWeight: 500, color: "var(--text)", marginBottom: 4 }}>
        Provider connections
      </div>
      <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.7, margin: "0 0 16px", maxWidth: "56ch" }}>
        Storing your own provider keys against this workspace isn&rsquo;t wired up on the dashboard
        yet — for now, pass your provider credentials to the gateway per request. This section
        will let you save and manage them here once that endpoint exists.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
        {PROVIDERS.map((name) => (
          <DashCard key={name} style={{ opacity: 0.55 }}>
            <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--text)", marginBottom: 6 }}>
              {name}
            </div>
            <div style={{ fontSize: 11.5, color: "var(--text3)" }}>Not available yet</div>
          </DashCard>
        ))}
      </div>
    </div>
  );
}
