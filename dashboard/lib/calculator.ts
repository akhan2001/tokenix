/**
 * Token cost calculation — pure functions, no React, no I/O, no dependencies.
 *
 * Every assumption that turns a workflow description into a token count is a
 * named constant in this file rather than a number buried in a formula, because
 * the calculator's output is only as honest as the assumptions it discloses.
 * The UI surfaces these in its methodology footer.
 */

import type { CalculatorPriceRow } from "./data";

// ── Disclosed assumptions ─────────────────────────────────────────────────────

/**
 * Input/output split of a model call. Matches the ACPI methodology's standard
 * 3:1 input:output usage assumption, so a calculator quote and the index are
 * built on the same premise.
 */
export const INPUT_SHARE = 0.75;
export const OUTPUT_SHARE = 0.25;

/** Standard word→token approximation (~0.75 words per token) for estimating
 * tokensPerStep from a pasted sample message in the Chat assistant scenario. */
export const WORDS_PER_TOKEN = 0.75;

/**
 * Prompt caching. In a repeated workflow most of the input — system prompt,
 * tool definitions, retrieved context — is identical call to call, so it can be
 * served from cache. CACHED_INPUT_SHARE is how much of the input we assume
 * repeats; CACHE_READ_MULTIPLIER is what a cache read costs relative to a fresh
 * input token (0.1 = the 10% cache-read rate published by major providers).
 *
 * These are estimates for modelling, not per-provider billing rules — real
 * cache rates and TTLs vary by provider.
 */
export const CACHED_INPUT_SHARE = 0.8;
export const CACHE_READ_MULTIPLIER = 0.1;

const MONTHS_PER_YEAR = 12;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CalculatorConfig {
  /** Workflow runs per month. */
  workflowsPerMonth: number;
  /** Model calls in one pass of the workflow. */
  stepsPerWorkflow: number;
  /** Agent iterations per step — 1 means a single shot, no agent loop. */
  agentStepsPerStep: number;
  /** Total tokens moved by one model call, input + output. */
  tokensPerStep: number;
  /** Whether repeated input is assumed to hit the prompt cache. */
  promptCaching: boolean;
}

export interface CostResult {
  model: CalculatorPriceRow;
  /** Cost of a single workflow run. */
  perWorkflow: number;
  monthly: number;
  annual: number;
  /** Token volume per month, after the input/output split. */
  inputTokensPerMonth: number;
  outputTokensPerMonth: number;
  callsPerMonth: number;
}

export interface SavingsSummary {
  cheapest: CostResult;
  mostExpensive: CostResult;
  /** How much the cheapest option saves against the dearest, as a percentage. */
  savingsPct: number;
  /** Absolute annual difference between cheapest and dearest. */
  annualDelta: number;
}

// ── Config bounds ─────────────────────────────────────────────────────────────

export const LIMITS = {
  workflowsPerMonth: { min: 100, max: 1_000_000 },
  stepsPerWorkflow: { min: 1, max: 20 },
  agentStepsPerStep: { min: 1, max: 30 },
  tokensPerStep: { min: 500, max: 200_000 },
} as const;

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/**
 * Forces a config into valid ranges. The sliders can't produce out-of-range
 * values, but a config can also arrive from a URL or a preset, so every entry
 * point goes through here before any arithmetic.
 */
export function sanitizeConfig(config: CalculatorConfig): CalculatorConfig {
  return {
    workflowsPerMonth: Math.round(
      clamp(config.workflowsPerMonth, LIMITS.workflowsPerMonth.min, LIMITS.workflowsPerMonth.max)
    ),
    stepsPerWorkflow: Math.round(
      clamp(config.stepsPerWorkflow, LIMITS.stepsPerWorkflow.min, LIMITS.stepsPerWorkflow.max)
    ),
    agentStepsPerStep: Math.round(
      clamp(config.agentStepsPerStep, LIMITS.agentStepsPerStep.min, LIMITS.agentStepsPerStep.max)
    ),
    tokensPerStep: Math.round(
      clamp(config.tokensPerStep, LIMITS.tokensPerStep.min, LIMITS.tokensPerStep.max)
    ),
    promptCaching: Boolean(config.promptCaching),
  };
}

// ── Scenario presets ──────────────────────────────────────────────────────────

export interface Scenario {
  id: string;
  label: string;
  blurb: string;
  config: CalculatorConfig;
}

export const SCENARIOS: Scenario[] = [
  {
    id: "assistant",
    label: "Chat assistant",
    blurb: "High volume, one short call per request. Support bots, in-product Q&A.",
    config: {
      workflowsPerMonth: 50_000,
      stepsPerWorkflow: 1,
      agentStepsPerStep: 1,
      tokensPerStep: 2_000,
      promptCaching: false,
    },
  },
  {
    id: "rag",
    label: "RAG pipeline",
    blurb: "Retrieval stuffs the prompt: fewer runs, far more tokens on each.",
    config: {
      workflowsPerMonth: 10_000,
      stepsPerWorkflow: 3,
      agentStepsPerStep: 1,
      tokensPerStep: 12_000,
      promptCaching: true,
    },
  },
  {
    id: "agent",
    label: "Coding agent",
    blurb: "Long tool-use loops. Every step re-sends context — the expensive shape.",
    config: {
      workflowsPerMonth: 2_000,
      stepsPerWorkflow: 5,
      agentStepsPerStep: 8,
      tokensPerStep: 15_000,
      promptCaching: true,
    },
  },
];

// ── Calculation ───────────────────────────────────────────────────────────────

/**
 * Effective cost per 1M input tokens once prompt caching is applied.
 * Uncached share bills at list price; the cached share bills at the cache-read
 * rate. With caching off this is just the list price.
 */
export function effectiveInputPrice(listPrice: number, promptCaching: boolean): number {
  if (!promptCaching) return listPrice;
  const uncached = 1 - CACHED_INPUT_SHARE;
  return listPrice * (uncached + CACHED_INPUT_SHARE * CACHE_READ_MULTIPLIER);
}

/** Monthly, annual and per-workflow cost of running `config` on `model`. */
export function calculateCost(
  config: CalculatorConfig,
  model: CalculatorPriceRow
): CostResult {
  const c = sanitizeConfig(config);

  const callsPerWorkflow = c.stepsPerWorkflow * c.agentStepsPerStep;
  const callsPerMonth = c.workflowsPerMonth * callsPerWorkflow;

  const inputTokensPerCall = c.tokensPerStep * INPUT_SHARE;
  const outputTokensPerCall = c.tokensPerStep * OUTPUT_SHARE;

  const inputPrice = effectiveInputPrice(model.input_per_million, c.promptCaching);

  const costPerCall =
    (inputTokensPerCall / 1_000_000) * inputPrice +
    (outputTokensPerCall / 1_000_000) * model.output_per_million;

  const perWorkflow = costPerCall * callsPerWorkflow;
  const monthly = costPerCall * callsPerMonth;

  return {
    model,
    perWorkflow,
    monthly,
    annual: monthly * MONTHS_PER_YEAR,
    inputTokensPerMonth: inputTokensPerCall * callsPerMonth,
    outputTokensPerMonth: outputTokensPerCall * callsPerMonth,
    callsPerMonth,
  };
}

/**
 * Costs every model, ranked by ACPI value score (P1 — intelligence per dollar,
 * the same quality-adjusted metric the index's screener uses) rather than raw
 * price, so a cheap-but-weak model doesn't outrank a stronger one for less.
 *
 * Only ~1 in 10 tracked models has published benchmark data behind a P1 score
 * (see CLAUDE.md — models without it are excluded from P1 but kept in ACPI).
 * Scored models sort first, best value first; unscored models follow, cheapest
 * first, since price is the only honest signal available for them.
 */
export function calculateAll(
  config: CalculatorConfig,
  models: CalculatorPriceRow[]
): CostResult[] {
  return models
    .map((m) => calculateCost(config, m))
    .sort((a, b) => {
      const ap = a.model.p1;
      const bp = b.model.p1;
      if (ap !== null && bp !== null) return bp - ap;
      if (ap !== null) return -1;
      if (bp !== null) return 1;
      return a.monthly - b.monthly;
    });
}

/** Spread between the cheapest and dearest option in a result set. */
export function calculateSavings(results: CostResult[]): SavingsSummary | null {
  if (results.length < 2) return null;

  let cheapest = results[0];
  let mostExpensive = results[0];
  for (const r of results) {
    if (r.monthly < cheapest.monthly) cheapest = r;
    if (r.monthly > mostExpensive.monthly) mostExpensive = r;
  }

  if (mostExpensive.monthly <= 0) return null;

  return {
    cheapest,
    mostExpensive,
    savingsPct: ((mostExpensive.monthly - cheapest.monthly) / mostExpensive.monthly) * 100,
    annualDelta: mostExpensive.annual - cheapest.annual,
  };
}

// ── Formatting ────────────────────────────────────────────────────────────────

/**
 * Money, at a precision that suits the magnitude — sub-cent costs are real at
 * per-workflow scale, and rounding them to $0.00 would hide the whole point.
 */
export function formatCurrency(amount: number): string {
  if (!Number.isFinite(amount)) return "—";

  const abs = Math.abs(amount);
  if (abs >= 1_000_000) return `$${(amount / 1_000_000).toFixed(2)}M`;
  if (abs >= 10_000)
    return `$${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (abs >= 1) return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (abs >= 0.01) return `$${amount.toFixed(3)}`;
  if (abs >= 0.00001) return `$${amount.toFixed(5)}`;
  // Below five decimals, rounding would print "$0.00000" — which reads as free.
  // Say it's small instead of saying it's nothing.
  if (abs > 0) return amount > 0 ? "<$0.00001" : ">-$0.00001";
  return "$0.00";
}

/** Token counts in K/M/B, since raw digit strings are unreadable at this scale. */
export function formatTokens(count: number): string {
  if (!Number.isFinite(count)) return "—";

  const abs = Math.abs(count);
  if (abs >= 1_000_000_000) return `${(count / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(Math.round(count));
}

/**
 * Percentages, floored and capped short of the absolutes. The spread between
 * the cheapest and dearest model rounds to 100.0% at `toFixed(1)`, which would
 * claim the cheap option is free; it never is.
 */
export function formatPercent(pct: number): string {
  if (!Number.isFinite(pct)) return "—";
  if (pct >= 99.95) return ">99.9%";
  if (pct > 0 && pct < 0.05) return "<0.1%";
  return `${pct.toFixed(1)}%`;
}

/** Compact integer count — workflow runs, calls, etc. */
export function formatCount(count: number): string {
  if (!Number.isFinite(count)) return "—";
  return Math.round(count).toLocaleString("en-US");
}
