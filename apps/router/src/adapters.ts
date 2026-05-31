import { anthropic } from "@ai-sdk/anthropic"
import { google } from "@ai-sdk/google"
import { createOpenAI, openai } from "@ai-sdk/openai"
import type { LanguageModelV1 } from "ai"
import type { ModelEntry } from "@tokenix/types"

// OpenAI-compatible clients for providers that clone the API
const deepseekClient = createOpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY ?? "",
  baseURL: "https://api.deepseek.com/v1",
})

const groqClient = createOpenAI({
  apiKey: process.env.GROQ_API_KEY ?? "",
  baseURL: "https://api.groq.com/openai/v1",
})

export function getLanguageModel(entry: ModelEntry): LanguageModelV1 {
  switch (entry.provider) {
    case "anthropic":
      return anthropic(entry.native_id)
    case "openai":
      return openai(entry.native_id)
    case "google":
      return google(entry.native_id)
    case "deepseek":
      return deepseekClient(entry.native_id)
    case "groq":
      return groqClient(entry.native_id)
    default:
      throw new Error(`No adapter registered for provider: ${entry.provider}`)
  }
}
