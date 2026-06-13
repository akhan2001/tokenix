"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.route = route;
exports.routeStream = routeStream;
const ai_1 = require("ai");
const classifier_js_1 = require("./classifier.js");
const adapters_js_1 = require("./adapters.js");
const registry_js_1 = require("./registry.js");
function computeCost(inputTokens, outputTokens, costPerMIn, costPerMOut) {
    return (inputTokens / 1_000_000) * costPerMIn + (outputTokens / 1_000_000) * costPerMOut;
}
async function route(messages, options = {}) {
    const taskType = (0, classifier_js_1.classifyTask)(messages);
    const providers = (0, registry_js_1.availableProviders)();
    const model = (0, registry_js_1.selectModel)(taskType, providers);
    if (!model) {
        throw new Error(`No provider available for task type "${taskType}". Configure at least one API key.`);
    }
    const lm = (0, adapters_js_1.getLanguageModel)(model);
    const baseline = (0, registry_js_1.getBaseline)();
    const result = await (0, ai_1.generateText)({
        model: lm,
        messages,
        maxTokens: options.max_tokens,
        temperature: options.temperature,
    });
    const inputTokens = result.usage.promptTokens;
    const outputTokens = result.usage.completionTokens;
    const cost = computeCost(inputTokens, outputTokens, model.input_cost_per_m, model.output_cost_per_m);
    const baselineCost = computeCost(inputTokens, outputTokens, baseline.input_cost_per_m, baseline.output_cost_per_m);
    const savingPct = baselineCost > 0 ? ((baselineCost - cost) / baselineCost) * 100 : 0;
    return {
        task_type: taskType,
        model_id: model.model_id,
        provider: model.provider,
        text: result.text,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cost_usd: cost,
        cost_baseline_usd: baselineCost,
        saving_pct: savingPct,
    };
}
function routeStream(messages, options = {}) {
    const taskType = (0, classifier_js_1.classifyTask)(messages);
    const providers = (0, registry_js_1.availableProviders)();
    const model = (0, registry_js_1.selectModel)(taskType, providers);
    if (!model) {
        throw new Error(`No provider available for task type "${taskType}". Configure at least one API key.`);
    }
    const baseline = (0, registry_js_1.getBaseline)();
    const lm = (0, adapters_js_1.getLanguageModel)(model);
    const stream = (0, ai_1.streamText)({
        model: lm,
        messages,
        maxTokens: options.max_tokens,
        temperature: options.temperature,
    });
    return {
        task_type: taskType,
        model_id: model.model_id,
        provider: model.provider,
        stream,
        input_cost_per_m: model.input_cost_per_m,
        output_cost_per_m: model.output_cost_per_m,
        baseline_cost_per_m: baseline.input_cost_per_m,
    };
}
