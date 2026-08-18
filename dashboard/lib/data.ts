import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";

export interface PriceRow {
  timestamp: string;
  source: string;
  provider: string;
  model_id: string;
  model_name: string;
  context_length: string;
  input_per_million_usd: number;
  output_per_million_usd: number;
}

function latestCsvPath(): string | null {
  // 1. Look for timestamped CSVs in <repo root>/data/snapshots (local dev with scraper running alongside)
  const snapshotsDir = path.join(process.cwd(), "..", "data", "snapshots");
  try {
    const files = fs
      .readdirSync(snapshotsDir)
      .filter((f) => f.startsWith("token_prices_") && f.endsWith(".csv"))
      .sort()
      .reverse();
    if (files.length) return path.join(snapshotsDir, files[0]);
  } catch {
    // snapshots dir not accessible (Vercel serverless)
  }

  // 2. Fall back to the bundled snapshot committed alongside the app
  const bundled = path.join(process.cwd(), "data", "prices.csv");
  if (fs.existsSync(bundled)) return bundled;

  return null;
}

// Parsing the CSV on every render costs ~250ms. Cache the result keyed on the
// file path + mtime, so repeated requests are free but a fresh scraper snapshot
// (new file, or same file rewritten) still invalidates the cache automatically.
let pricesCache: { key: string; rows: PriceRow[] } | null = null;

export function loadPrices(): PriceRow[] {
  const csvPath = latestCsvPath();
  if (!csvPath) return [];

  const key = `${csvPath}:${fs.statSync(csvPath).mtimeMs}`;
  if (pricesCache && pricesCache.key === key) return pricesCache.rows;

  const content = fs.readFileSync(csvPath, "utf-8");
  const records = parse(content, { columns: true, skip_empty_lines: true }) as Record<
    string,
    string
  >[];

  const rows = records
    .map((r) => ({
      timestamp: r.timestamp,
      source: r.source,
      provider: r.provider,
      model_id: r.model_id,
      model_name: r.model_name || r.model_id,
      context_length: r.context_length,
      input_per_million_usd: parseFloat(r.input_per_million_usd) || 0,
      output_per_million_usd: parseFloat(r.output_per_million_usd) || 0,
    }))
    .filter((r) => r.input_per_million_usd > 0 || r.output_per_million_usd > 0);

  pricesCache = { key, rows };
  return rows;
}

// ── ACPI ─────────────────────────────────────────────────────────────────────

export interface AcpiData {
  acpi: number;
  computed_at: string;
  model_count: number;
  provider_count: number;
  /** "tiered" since the tiered-weighting change; absent on older snapshots. */
  weighting?: string;
  hardware_floor: number;
  p2_score: number;
  components: {
    mean_blended_price: number;
    mean_p3_spread: number;
    mean_quality_adjustment: number;
  };
  /** Intelligence-per-dollar (P1) screener stats; absent on older snapshots. */
  screener?: {
    scored_model_count: number;
    mean_benchmark_score: number | null;
    mean_p1: number | null;
  };
}

export interface AcpiHistoryPoint {
  timestamp: string;
  acpi: number;
  model_count: number;
  provider_count: number;
}

let historyCache: { key: string; rows: AcpiHistoryPoint[] } | null = null;

/**
 * The append-only ACPI history log written by scripts/acpi.py — every hourly
 * run adds one row. Powers the real index-performance chart (no synthetic art).
 */
export function loadAcpiHistory(): AcpiHistoryPoint[] {
  const csvPath = path.join(process.cwd(), "data", "acpi_history.csv");
  if (!fs.existsSync(csvPath)) return [];

  const key = `${csvPath}:${fs.statSync(csvPath).mtimeMs}`;
  if (historyCache && historyCache.key === key) return historyCache.rows;

  const content = fs.readFileSync(csvPath, "utf-8");
  const records = parse(content, { columns: true, skip_empty_lines: true }) as Record<
    string,
    string
  >[];

  const rows = records
    .map((r) => ({
      timestamp: r.timestamp,
      acpi: parseFloat(r.acpi) || 0,
      model_count: parseInt(r.model_count, 10) || 0,
      provider_count: parseInt(r.provider_count, 10) || 0,
    }))
    .filter((r) => r.acpi > 0 && !!r.timestamp)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  historyCache = { key, rows };
  return rows;
}

let acpiCache: { key: string; data: AcpiData } | null = null;

export function loadAcpi(): AcpiData | null {
  const jsonPath = path.join(process.cwd(), "data", "acpi_latest.json");
  if (!fs.existsSync(jsonPath)) return null;
  try {
    const key = `${jsonPath}:${fs.statSync(jsonPath).mtimeMs}`;
    if (acpiCache && acpiCache.key === key) return acpiCache.data;
    const data = JSON.parse(fs.readFileSync(jsonPath, "utf-8")) as AcpiData;
    acpiCache = { key, data };
    return data;
  } catch {
    return null;
  }
}

// ── Calculator prices ────────────────────────────────────────────────────────

/**
 * A row of `dashboard/data/prices_latest.csv`, written by
 * `scripts/export_prices.py`. This is the cleaned cut of the price feed —
 * normalised ids, major providers only, one row per model, blended price
 * precomputed. Distinct from `PriceRow`, which is the full screener catalog.
 */
export interface CalculatorPriceRow {
  model_id: string;
  model_name: string;
  provider: string;
  input_per_million: number;
  output_per_million: number;
  blended_per_million: number;
  context_length: number;
}

let calcPricesCache: { key: string; rows: CalculatorPriceRow[] } | null = null;

/**
 * Loads the calculator price export. Returns null — not an empty array — when
 * the file is absent, so callers can tell "pipeline hasn't run" apart from
 * "everything got filtered out".
 */
export function loadCalculatorPrices(): CalculatorPriceRow[] | null {
  const csvPath = path.join(process.cwd(), "data", "prices_latest.csv");
  if (!fs.existsSync(csvPath)) return null;

  const key = `${csvPath}:${fs.statSync(csvPath).mtimeMs}`;
  if (calcPricesCache && calcPricesCache.key === key) return calcPricesCache.rows;

  const content = fs.readFileSync(csvPath, "utf-8");
  const records = parse(content, { columns: true, skip_empty_lines: true }) as Record<
    string,
    string
  >[];

  const rows = records
    .map((r) => ({
      model_id: r.model_id,
      model_name: r.model_name || r.model_id,
      provider: r.provider,
      input_per_million: parseFloat(r.input_per_million_usd) || 0,
      output_per_million: parseFloat(r.output_per_million_usd) || 0,
      blended_per_million: parseFloat(r.blended_per_million_usd) || 0,
      context_length: parseInt(r.context_length, 10) || 0,
    }))
    .filter((r) => !!r.model_id && r.blended_per_million > 0)
    .sort((a, b) => a.blended_per_million - b.blended_per_million);

  calcPricesCache = { key, rows };
  return rows;
}

let calcUpdatedCache: { key: string; at: string | null } | null = null;

/** The `last_updated` stamp on the export — the run that produced these prices. */
export function calculatorPricesUpdatedAt(): string | null {
  const csvPath = path.join(process.cwd(), "data", "prices_latest.csv");
  if (!fs.existsSync(csvPath)) return null;

  const key = `${csvPath}:${fs.statSync(csvPath).mtimeMs}`;
  if (calcUpdatedCache && calcUpdatedCache.key === key) return calcUpdatedCache.at;

  try {
    const content = fs.readFileSync(csvPath, "utf-8");
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      to: 1, // every row carries the same run timestamp; the first is enough
    }) as Record<string, string>[];
    const at = records[0]?.last_updated?.trim() || null;
    calcUpdatedCache = { key, at };
    return at;
  } catch {
    return null;
  }
}

// Pick interesting models for the ticker — one per well-known provider
const TICKER_MODEL_IDS = [
  "openai/gpt-4o",
  "openai/gpt-4o-mini",
  "openai/o3",
  "openai/o4-mini",
  "anthropic/claude-opus-4.7-fast",
  "anthropic/claude-sonnet-4-5",
  "anthropic/claude-haiku-4-5",
  "google/gemini-2.5-pro",
  "google/gemini-2.5-flash",
  "meta-llama/llama-4-maverick",
  "mistralai/mistral-large-2411",
  "x-ai/grok-3-mini-beta",
  "deepseek/deepseek-r1",
  "deepseek/deepseek-chat-v3-5",
  "qwen/qwen-2.5-72b-instruct",
  "groq/llama3-70b-8192",
];

export function tickerModels(rows: PriceRow[]): PriceRow[] {
  const byId = new Map(rows.map((r) => [r.model_id, r]));

  // Try exact matches first, then prefix matches
  const hits: PriceRow[] = [];
  for (const id of TICKER_MODEL_IDS) {
    if (byId.has(id)) {
      hits.push(byId.get(id)!);
    } else {
      const fuzzy = rows.find(
        (r) =>
          r.source === "openrouter" &&
          (r.model_id.includes(id.split("/")[1]) || r.model_name.toLowerCase().includes(id.split("/")[1]))
      );
      if (fuzzy) hits.push(fuzzy);
    }
  }

  // Pad with the cheapest and most expensive models from openrouter if needed
  if (hits.length < 10) {
    const sorted = rows
      .filter((r) => r.source === "openrouter" && !hits.find((h) => h.model_id === r.model_id))
      .sort((a, b) => b.input_per_million_usd - a.input_per_million_usd);
    hits.push(...sorted.slice(0, 10 - hits.length));
  }

  return hits;
}
