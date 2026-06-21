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
  // 1. Look for timestamped CSVs in the parent dir (local dev with scraper running alongside)
  const parentDir = path.join(process.cwd(), "..");
  try {
    const files = fs
      .readdirSync(parentDir)
      .filter((f) => f.startsWith("token_prices_") && f.endsWith(".csv"))
      .sort()
      .reverse();
    if (files.length) return path.join(parentDir, files[0]);
  } catch {
    // parent dir not accessible (Vercel serverless)
  }

  // 2. Fall back to the bundled snapshot committed alongside the app
  const bundled = path.join(process.cwd(), "data", "prices.csv");
  if (fs.existsSync(bundled)) return bundled;

  return null;
}

export function loadPrices(): PriceRow[] {
  const csvPath = latestCsvPath();
  if (!csvPath) return [];

  const content = fs.readFileSync(csvPath, "utf-8");
  const records = parse(content, { columns: true, skip_empty_lines: true }) as Record<
    string,
    string
  >[];

  return records
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

export function loadAcpi(): AcpiData | null {
  const jsonPath = path.join(process.cwd(), "data", "acpi_latest.json");
  if (!fs.existsSync(jsonPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(jsonPath, "utf-8")) as AcpiData;
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
