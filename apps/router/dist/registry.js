"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBaseline = getBaseline;
exports.selectModel = selectModel;
exports.patchAcpi = patchAcpi;
exports.availableProviders = availableProviders;
// ACPI scores are placeholders — overwritten at runtime by index-engine data.
// Higher = better value (quality per dollar).
const ALL_MODELS = [
    // ── DeepSeek ──────────────────────────────────────────────────────────────
    {
        model_id: "deepseek/deepseek-chat-v3-5",
        provider: "deepseek",
        native_id: "deepseek-chat",
        task_types: ["chat", "code", "summarization", "extraction", "classification"],
        input_cost_per_m: 0.27,
        output_cost_per_m: 1.10,
        acpi: 84,
        context_length: 64_000,
    },
    {
        model_id: "deepseek/deepseek-r1",
        provider: "deepseek",
        native_id: "deepseek-reasoner",
        task_types: ["reasoning", "code"],
        input_cost_per_m: 0.55,
        output_cost_per_m: 2.19,
        acpi: 80,
        context_length: 64_000,
    },
    // ── Google ────────────────────────────────────────────────────────────────
    {
        model_id: "google/gemini-2.5-flash",
        provider: "google",
        native_id: "gemini-2.5-flash-preview-05-20",
        task_types: ["chat", "code", "summarization", "extraction", "classification"],
        input_cost_per_m: 0.15,
        output_cost_per_m: 0.60,
        acpi: 79,
        context_length: 1_000_000,
    },
    {
        model_id: "google/gemini-2.5-pro",
        provider: "google",
        native_id: "gemini-2.5-pro-preview-05-06",
        task_types: ["chat", "code", "reasoning", "summarization", "extraction"],
        input_cost_per_m: 1.25,
        output_cost_per_m: 10.00,
        acpi: 60,
        context_length: 1_000_000,
    },
    // ── Groq ──────────────────────────────────────────────────────────────────
    {
        model_id: "groq/llama-3.3-70b-versatile",
        provider: "groq",
        native_id: "llama-3.3-70b-versatile",
        task_types: ["chat", "summarization", "classification", "extraction"],
        input_cost_per_m: 0.59,
        output_cost_per_m: 0.79,
        acpi: 76,
        context_length: 128_000,
    },
    // ── Anthropic ─────────────────────────────────────────────────────────────
    {
        model_id: "anthropic/claude-haiku-4-5",
        provider: "anthropic",
        native_id: "claude-haiku-4-5-20251001",
        task_types: ["chat", "summarization", "extraction", "classification"],
        input_cost_per_m: 0.80,
        output_cost_per_m: 4.00,
        acpi: 73,
        context_length: 200_000,
    },
    {
        model_id: "anthropic/claude-sonnet-4-6",
        provider: "anthropic",
        native_id: "claude-sonnet-4-6",
        task_types: ["chat", "code", "reasoning", "summarization", "extraction", "classification"],
        input_cost_per_m: 3.00,
        output_cost_per_m: 15.00,
        acpi: 68,
        context_length: 200_000,
    },
    {
        model_id: "anthropic/claude-opus-4-7",
        provider: "anthropic",
        native_id: "claude-opus-4-7",
        task_types: ["chat", "code", "reasoning", "summarization", "extraction", "classification"],
        input_cost_per_m: 15.00,
        output_cost_per_m: 75.00,
        acpi: 55,
        context_length: 200_000,
    },
    // ── OpenAI ────────────────────────────────────────────────────────────────
    {
        model_id: "openai/gpt-4o-mini",
        provider: "openai",
        native_id: "gpt-4o-mini",
        task_types: ["chat", "summarization", "extraction", "classification"],
        input_cost_per_m: 0.15,
        output_cost_per_m: 0.60,
        acpi: 75,
        context_length: 128_000,
    },
    {
        model_id: "openai/gpt-4o",
        provider: "openai",
        native_id: "gpt-4o",
        task_types: ["chat", "code", "reasoning", "summarization", "extraction", "classification"],
        input_cost_per_m: 2.50,
        output_cost_per_m: 10.00,
        acpi: 62,
        context_length: 128_000,
    },
];
// Providers considered "best quality" for baseline cost comparison
const BASELINE_MODEL_ID = "openai/gpt-4o";
function getBaseline() {
    return ALL_MODELS.find((m) => m.model_id === BASELINE_MODEL_ID);
}
function selectModel(taskType, availableProviders) {
    return (ALL_MODELS
        .filter((m) => m.task_types.includes(taskType) && availableProviders.has(m.provider))
        .sort((a, b) => b.acpi - a.acpi)[0] ?? null);
}
// Called by the index-engine at startup (or on a schedule) to refresh ACPI scores
function patchAcpi(updates) {
    for (const { model_id, acpi } of updates) {
        const entry = ALL_MODELS.find((m) => m.model_id === model_id);
        if (entry)
            entry.acpi = acpi;
    }
}
function availableProviders() {
    const envKeys = {
        anthropic: "ANTHROPIC_API_KEY",
        openai: "OPENAI_API_KEY",
        google: "GOOGLE_GENERATIVE_AI_API_KEY",
        deepseek: "DEEPSEEK_API_KEY",
        groq: "GROQ_API_KEY",
    };
    return new Set(Object.entries(envKeys)
        .filter(([, envVar]) => !!process.env[envVar])
        .map(([provider]) => provider));
}
