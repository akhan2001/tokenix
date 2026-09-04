
/**
 * Client for the Tokenix analytics API (apps/analytics-api in the ai-gateway
 * repo).
 *
 * Server-only. Callers pass either a `txk-` key or a workspace UUID; the UUID
 * path uses INTERNAL_API_TOKEN, which must never reach the browser. Humans are
 * authenticated by Clerk and never hold a key.
 */

const API_BASE = process.env.TOKENIX_ANALYTICS_URL ?? "http://localhost:8001";

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

export type Budget =
  | { configured: false }
  | {
      configured: true;
      monthly_limit_usd: number;
      alert_pct: number;
      alert_email: string;
      current_spend_usd: number;
      pct_used: number;
      projected_eom_usd: number;
      will_exceed: boolean;
      days_remaining: number;
    };

export interface BudgetInput {
  monthly_limit_usd: number;
  alert_pct: number;
  alert_email: string;
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

/**
 * Build the auth headers for one analytics call.
 *
 * A `txk-` value is sent as a bearer key. Anything else is a workspace UUID,
 * which goes over the server-to-server path with the internal token — that is
 * how a Clerk-authenticated human reads their own spend without ever holding a
 * key. Both are server-side only; neither secret reaches the browser.
 */
function authHeaders(keyOrWorkspaceId: string): Record<string, string> {
  if (keyOrWorkspaceId.startsWith("txk-")) {
    return { authorization: `Bearer ${keyOrWorkspaceId}` };
  }
  const internal = process.env.INTERNAL_API_TOKEN;
  if (!internal) {
    throw new ApiError("INTERNAL_API_TOKEN is not set on the dashboard.", 503);
  }
  return { "x-internal-token": internal, "x-workspace-id": keyOrWorkspaceId };
}

async function get<T>(path: string, key: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: authHeaders(key),
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

async function post<T>(path: string, key: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { ...authHeaders(key), "content-type": "application/json" },
      body: JSON.stringify(body),
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
    // The API returns Pydantic's {"detail": ...} on validation errors — surface
    // that instead of a bare status code where it's available.
    let detail = `Analytics API returned ${response.status}.`;
    try {
      const body = (await response.json()) as { detail?: unknown };
      if (body.detail) detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
    } catch {
      // Not JSON — the generic status message stands.
    }
    throw new ApiError(detail, response.status);
  }
  return (await response.json()) as T;
}

export const fetchBudget = (key: string) => get<Budget>("/api/v1/budget", key);

export const saveBudget = (key: string, body: BudgetInput) =>
  post<{ success: true }>("/api/v1/budget", key, body);

/**
 * Fetch one export file, returning the raw upstream `Response`.
 *
 * Deliberately not `get<T>`: the body is a CSV/XLSX/PDF stream, not JSON, and
 * it is passed straight through to the browser rather than parsed. The caller
 * is the /api/export route handler, which exists because these headers carry
 * INTERNAL_API_TOKEN and so can never be sent from the browser itself.
 */
export async function fetchExport(key: string, path: string): Promise<Response> {
  try {
    return await fetch(`${API_BASE}${path}`, {
      headers: authHeaders(key),
      cache: "no-store",
    });
  } catch {
    throw new ApiError(
      `Could not reach the Tokenix analytics API at ${API_BASE}. Is it running?`,
      503,
    );
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
