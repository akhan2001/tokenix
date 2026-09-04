import { DashCard } from "@/components/dashboard/dash-card";
import { ProviderConnections } from "@/components/dashboard/provider-connections";
import { TestRequestButton } from "@/components/dashboard/test-request-button";
import { CodeBlock, type Snippet } from "@/components/code-block";
import { WorkspaceKey } from "@/components/workspace-key";

const GATEWAY_URL =
  process.env.NEXT_PUBLIC_TOKENIX_GATEWAY_URL ?? "https://gateway.tokenixindex.com";

export function buildSnippets(key: string): Snippet[] {
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

/**
 * Screens 1–4, all at once, all real — the moment a plaintext key exists.
 *
 * Extracted out of connect/page.tsx (a server component) so it can also be
 * rendered by GenerateSnippet (a client component, mounted for someone
 * requesting a fresh working example on a return visit). Nothing in here
 * has a server-only dependency — WorkspaceKey, ProviderConnections,
 * CodeBlock and TestRequestButton are all already client components or
 * plain functions — so this file itself needs no "use client" of its own;
 * it's simply portable to either context.
 */
export function FreshSetup({ apiKey }: { apiKey: string }) {
  return (
    <div style={{ display: "grid", gap: 18 }}>
      <StepCard n={1} title="Your key">
        <WorkspaceKey apiKey={apiKey} keyPrefix={null} />
      </StepCard>

      <StepCard n={2} title="Connect a provider">
        <ProviderConnections connected={[]} />
      </StepCard>

      <StepCard n={3} title="Change the base URL">
        <p style={{ fontSize: 12.5, color: "var(--text2)", lineHeight: 1.7, margin: "0 0 16px", maxWidth: "60ch" }}>
          Your key is already in the snippet below — nothing to find-and-replace. Point your
          existing SDK at the gateway and every request gets priced against ACPI as it passes
          through.
        </p>
        <CodeBlock snippets={buildSnippets(apiKey)} label="Snippet language" />
      </StepCard>

      <StepCard n={4} title="Send a test request">
        <p style={{ fontSize: 12.5, color: "var(--text2)", lineHeight: 1.7, margin: "0 0 16px", maxWidth: "60ch" }}>
          A real, tiny request through your new key — a few tokens against whichever provider
          you just connected. If it works, everything above is wired up correctly.
        </p>
        <TestRequestButton apiKey={apiKey} />
      </StepCard>
    </div>
  );
}

export function StepCard({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <DashCard padding="24px 26px">
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 22,
            height: 22,
            borderRadius: "50%",
            background: "var(--s2)",
            border: "1px solid var(--border)",
            color: "var(--accent)",
            fontSize: 11.5,
            flexShrink: 0,
          }}
        >
          {n}
        </span>
        <div style={{ fontSize: 14.5, fontWeight: 500, color: "var(--text)" }}>{title}</div>
      </div>
      {children}
    </DashCard>
  );
}
