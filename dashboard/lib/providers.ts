/**
 * The provider id/label list — split out of lib/provider-keys.ts, which
 * carries `import "server-only"`. That directive makes the WHOLE module
 * (including a plain constant array with no server logic in it) unusable
 * from a client component; this is the same class of bug `lib/period.ts`
 * exists to avoid, just in the opposite direction (a server-only module
 * instead of a client-only one). `provider-connections.tsx` imports from
 * here directly; lib/provider-keys.ts re-exports the same names so its own
 * server-side callers don't need to know the values moved.
 */
export type Provider = "openai" | "anthropic" | "google";

export const PROVIDERS: { id: Provider; label: string }[] = [
  { id: "openai", label: "OpenAI" },
  { id: "anthropic", label: "Anthropic" },
  { id: "google", label: "Google" },
];
