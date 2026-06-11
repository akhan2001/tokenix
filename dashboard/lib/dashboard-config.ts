/**
 * Sample data provider for the Tokenix Dashboard
 * Converts the HTML data into TypeScript types with dynamic properties
 */

import type { Model, TickerItem, StatItem, DashboardConfig } from "@/lib/types";

// Sample models data from the HTML file
export const SAMPLE_MODELS: Model[] = [
  { name: "GPT-4o", provider: "openai", tier: "A", context: "128K", input: 2.5, output: 10.0, chg: -1.2 },
  { name: "GPT-4o Mini", provider: "openai", tier: "B", context: "128K", input: 0.15, output: 0.6, chg: -0.8 },
  { name: "o3", provider: "openai", tier: "S", context: "200K", input: 2.0, output: 8.0, chg: 0.0 },
  { name: "o4 Mini", provider: "openai", tier: "A", context: "128K", input: 1.1, output: 4.4, chg: -2.1 },
  { name: "Claude Opus 4.7", provider: "anthropic", tier: "S", context: "200K", input: 30.0, output: 150.0, chg: 0.0 },
  { name: "Claude Sonnet 4", provider: "anthropic", tier: "A", context: "200K", input: 3.0, output: 15.0, chg: 0.0 },
  { name: "Claude Haiku", provider: "anthropic", tier: "B", context: "200K", input: 0.8, output: 4.0, chg: -1.5 },
  { name: "Gemini 2.5 Pro", provider: "google", tier: "A", context: "1M", input: 1.25, output: 10.0, chg: -2.2 },
  { name: "Gemini 2.5 Flash", provider: "google", tier: "B", context: "1M", input: 0.3, output: 2.5, chg: -3.1 },
  { name: "Gemini 2.0 Flash", provider: "google", tier: "B", context: "1M", input: 0.1, output: 0.4, chg: -4.4 },
  { name: "Llama 4 Maverick", provider: "meta-llama", tier: "A", context: "128K", input: 0.15, output: 0.6, chg: -0.6 },
  { name: "Llama 4 Scout", provider: "meta-llama", tier: "B", context: "128K", input: 0.08, output: 0.3, chg: -0.9 },
  { name: "Llama 3.1 8B", provider: "meta-llama", tier: "C", context: "16K", input: 0.02, output: 0.05, chg: -1.1 },
  { name: "Mistral Large 2411", provider: "mistralai", tier: "A", context: "131K", input: 2.0, output: 6.0, chg: 0.3 },
  { name: "Mistral Nemo", provider: "mistralai", tier: "C", context: "131K", input: 0.02, output: 0.03, chg: -1.8 },
  { name: "DeepSeek R1", provider: "deepseek", tier: "A", context: "64K", input: 0.55, output: 2.19, chg: -1.9 },
  { name: "DeepSeek V3", provider: "deepseek", tier: "A", context: "64K", input: 0.27, output: 1.1, chg: -2.5 },
  { name: "Grok 3 Mini", provider: "x-ai", tier: "B", context: "131K", input: 0.3, output: 0.5, chg: 0.0 },
  { name: "Grok 3", provider: "x-ai", tier: "A", context: "131K", input: 3.0, output: 15.0, chg: 0.0 },
  { name: "Qwen2.5 72B", provider: "qwen", tier: "A", context: "128K", input: 0.36, output: 0.4, chg: -0.5 },
  { name: "Qwen3 235B", provider: "qwen", tier: "S", context: "32K", input: 0.9, output: 3.6, chg: -1.2 },
  { name: "Perplexity Sonar", provider: "perplexity", tier: "B", context: "12K", input: 1.0, output: 1.0, chg: 0.0 },
  { name: "Command R+", provider: "cohere", tier: "A", context: "128K", input: 2.5, output: 10.0, chg: 0.7 },
  { name: "Mistral Small", provider: "mistralai", tier: "C", context: "32K", input: 0.1, output: 0.3, chg: -1.8 },
  { name: "Llama 3.3 70B", provider: "meta-llama", tier: "B", context: "128K", input: 0.05, output: 0.1, chg: -0.8 },
];

export const SAMPLE_TICKER_ITEMS: TickerItem[] = [
  { name: "GPT-4o", price: "$2.50", chg: "-1.2%", dir: "dn" },
  { name: "Claude Sonnet", price: "$3.00", chg: "0.0%", dir: "fl" },
  { name: "Gemini Flash", price: "$0.30", chg: "-3.1%", dir: "dn" },
  { name: "DeepSeek V3", price: "$0.27", chg: "-2.5%", dir: "dn" },
  { name: "Llama 4 Scout", price: "$0.08", chg: "-0.9%", dir: "dn" },
  { name: "o3", price: "$2.00", chg: "0.0%", dir: "fl" },
  { name: "Grok 3", price: "$3.00", chg: "0.0%", dir: "fl" },
  { name: "Mistral Large", price: "$2.00", chg: "+0.3%", dir: "up" },
];

/**
 * Generate dashboard configuration with dynamic properties
 */
export const generateDashboardConfig = (
  overrides?: Partial<DashboardConfig>
): DashboardConfig => {
  const models = overrides?.models || SAMPLE_MODELS;

  // Calculate stats dynamically
  const withInput = models.filter((m) => m.input > 0);
  const sortedByInput = [...withInput].sort((a, b) => a.input - b.input);
  const minInput = sortedByInput[0]?.input || 0;
  const maxInput = sortedByInput[sortedByInput.length - 1]?.input || 0;
  const medianIdx = Math.floor(sortedByInput.length / 2);
  const medianInput = sortedByInput[medianIdx]?.input || 0;

  const stats: StatItem[] = [
    {
      label: "Index today",
      value: `$${5.84.toFixed(2)}`,
      sub: "Jun 10, 2026",
      cls: "gold",
    },
    {
      label: "6-month change",
      value: "↓ 50.7%",
      sub: "6-month index deflation",
      cls: "green",
    },
    {
      label: "Cheapest model",
      value: `$${minInput.toFixed(4)}`,
      sub: "lowest input price tracked",
    },
    {
      label: "Models tracked",
      value: models.length.toLocaleString(),
      sub: `across ${new Set(models.map((m) => m.provider)).size} providers`,
      cls: "blue",
    },
    {
      label: "Hardware floor",
      value: "$0.298",
      sub: "derived GPU compute floor",
    },
  ];

  return {
    title: "Tokenix · AI Compute Price Index",
    description: "The price of AI intelligence — tracked, daily.",
    indexValue: 5.84,
    indexDate: "Jun 10, 2026",
    deflation: 50.7,
    deflationPeriod: "6 months",
    cheapestModel: minInput,
    modelsTracked: models.length,
    providers: new Set(models.map((m) => m.provider)).size,
    hardwareFloor: 0.298,
    stats,
    models,
    tickerItems: overrides?.tickerItems || SAMPLE_TICKER_ITEMS,
    ...overrides,
  };
};
