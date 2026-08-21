import { cookies } from "next/headers";

import { KEY_COOKIE } from "./cookie-name";

/**
 * Client for the Tokenix analytics API (apps/analytics-api in the ai-gateway
 * repo).
 *
 * Server-only: it imports `next/headers`, which throws if a Client Component
 * ever pulls it in. The workspace API key lives in an httpOnly cookie and is
 * only ever read here — it is never serialised into a payload sent to the
 * browser.
 */

const API_BASE = process.env.TOKENIX_ANALYTICS_URL ?? "http://localhost:8001";

// Re-exported so existing importers keep working; the literal lives in
// lib/cookie-name.ts because proxy.ts needs it without next/headers.
export { KEY_COOKIE };

export interface Summary {
  this_month_spend_usd: number;
  last_month_spend_usd: number;
  mom_change_pct: number | null;
  acpi_benchmark_usd: number;
  vs_acpi_pct: number | null;
  top_model: { model_id: string; cost_usd: number } | null;
  total_requests: number;
}

export interface UsagePoint {
  day: string;
  requests: number;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  acpi_bench_usd: number;
  overpay_usd: number;
}

export interface UsageSeries {
  days: number;
  group_by: string;
  series: UsagePoint[];
}

export interface ModelRow {
  model_id: string;
  provider: string;
  requests: number;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  acpi_bench_usd: number;
  overpay_usd: number;
  acpi_score: number | null;
}

export interface ModelsResponse {
  days: number;
  models: ModelRow[];
}

export interface BenchmarkModel extends ModelRow {
  tokens: number;
  overpay_pct: number | null;
  status: "above_market" | "below_market" | "unknown";
}

export interface Benchmark {
  days: number;
  total_cost_usd: number;
  acpi_benchmark_usd: number;
  overpay_usd: number;
  overpay_pct: number | null;
  models: BenchmarkModel[];
  opportunities: { model_id: string; action: string; potential_saving_usd: number }[];
}

export interface Forecast {
  method: string;
  current_month_to_date_usd: number;
  projected_this_month_usd: number;
  last_month_usd: number;
  mom_growth_pct: number;
  projected_rest_of_year_usd: number;
  projected_with_optimization_usd: number;
  potential_saving_usd: number;
  months_of_history: number;
  low_confidence: boolean;
}

/** Read the workspace key from the request cookies. */
export async function getWorkspaceKey(): Promise<string | null> {
  const store = await cookies();
  return store.get(KEY_COOKIE)?.value ?? null;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function get<T>(path: string, key: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: { authorization: `Bearer ${key}` },
      // Spend data is live; never serve it from a cache.
      cache: "no-store",
    });
  } catch {
    throw new ApiError(
      `Could not reach the Tokenix analytics API at ${API_BASE}. Is it running?`,
      503,
    );
  }

  if (response.status === 401) {
    throw new ApiError("That workspace key was rejected.", 401);
  }
  if (!response.ok) {
    throw new ApiError(`Analytics API returned ${response.status}.`, response.status);
  }
  return (await response.json()) as T;
}

export const fetchSummary = (key: string) => get<Summary>("/api/v1/summary", key);

export const fetchUsageSeries = (key: string, days: number) =>
  get<UsageSeries>(`/api/v1/usage?days=${days}&group_by=day`, key);

export const fetchModels = (key: string, days: number) =>
  get<ModelsResponse>(`/api/v1/models?days=${days}`, key);

export const fetchBenchmark = (key: string, days: number) =>
  get<Benchmark>(`/api/v1/benchmark?days=${days}`, key);

export const fetchForecast = (key: string) => get<Forecast>("/api/v1/forecast", key);

/** Validate a key by calling an endpoint that requires auth. */
export async function verifyKey(key: string): Promise<boolean> {
  try {
    await fetchSummary(key);
    return true;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return false;
    throw error;
  }
}

// ── formatting helpers, shared by every page ────────────────────────────────

export function fmtUsd(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1000) return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (abs >= 1) return "$" + n.toFixed(2);
  if (abs >= 0.01) return "$" + n.toFixed(3);
  if (abs === 0) return "$0.00";
  // Sub-cent: 6 places. Per-request costs are genuinely this small, and
  // rounding them to "$0.00" would read as free rather than cheap.
  return "$" + n.toFixed(6);
}

export function fmtPct(n: number | null, withSign = true): string {
  if (n === null || !Number.isFinite(n)) return "—";
  const sign = withSign && n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

export function fmtCompact(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString("en-US");
}

/** Strip the vendor prefix so tables show `gpt-4o`, not `openai/gpt-4o`. */
export function shortModel(modelId: string): string {
  const slash = modelId.lastIndexOf("/");
  return slash === -1 ? modelId : modelId.slice(slash + 1);
}
