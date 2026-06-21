"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLanguageModel = getLanguageModel;
const anthropic_1 = require("@ai-sdk/anthropic");
const google_1 = require("@ai-sdk/google");
const openai_1 = require("@ai-sdk/openai");
// OpenAI-compatible clients for providers that clone the API
const deepseekClient = (0, openai_1.createOpenAI)({
    apiKey: process.env.DEEPSEEK_API_KEY ?? "",
    baseURL: "https://api.deepseek.com/v1",
});
const groqClient = (0, openai_1.createOpenAI)({
    apiKey: process.env.GROQ_API_KEY ?? "",
    baseURL: "https://api.groq.com/openai/v1",
});
function getLanguageModel(entry) {
    switch (entry.provider) {
        case "anthropic":
            return (0, anthropic_1.anthropic)(entry.native_id);
        case "openai":
            return (0, openai_1.openai)(entry.native_id);
        case "google":
            return (0, google_1.google)(entry.native_id);
        case "deepseek":
            return deepseekClient(entry.native_id);
        case "groq":
            return groqClient(entry.native_id);
        default:
            throw new Error(`No adapter registered for provider: ${entry.provider}`);
    }
}
