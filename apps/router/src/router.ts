import { generateText, streamText } from "ai"
import type { TokenixMessage, TaskType } from "@tokenix/types"
import { classifyTask } from "./classifier.js"
import { getLanguageModel } from "./adapters.js"
import { availableProviders, getBaseline, selectModel } from "./registry.js"

export interface RouteResult {
  task_type: TaskType
  model_id: string
  provider: string
  text: string
  input_tokens: number
  output_tokens: number
  cost_usd: number
  cost_baseline_usd: number
  saving_pct: number
}

export interface RouteStreamResult {
  task_type: TaskType
  model_id: string
  provider: string
  stream: ReturnType<typeof streamText>
  input_cost_per_m: number
  output_cost_per_m: number
  baseline_cost_per_m: number
}

function computeCost(inputTokens: number, outputTokens: number, costPerMIn: number, costPerMOut: number) {
  return (inputTokens / 1_000_000) * costPerMIn + (outputTokens / 1_000_000) * costPerMOut
}

export async function route(
  messages: TokenixMessage[],
  options: { max_tokens?: number; temperature?: number } = {}
): Promise<RouteResult> {
  const taskType = classifyTask(messages)
  const providers = availableProviders()
  const model = selectModel(taskType, providers)

  if (!model) {
    throw new Error(`No provider available for task type "${taskType}". Configure at least one API key.`)
  }

  const lm = getLanguageModel(model)
  const baseline = getBaseline()

  const result = await generateText({
    model: lm,
    messages,
    maxTokens: options.max_tokens,
    temperature: options.temperature,
  })

  const inputTokens = result.usage.promptTokens
  const outputTokens = result.usage.completionTokens
  const cost = computeCost(inputTokens, outputTokens, model.input_cost_per_m, model.output_cost_per_m)
  const baselineCost = computeCost(inputTokens, outputTokens, baseline.input_cost_per_m, baseline.output_cost_per_m)
  const savingPct = baselineCost > 0 ? ((baselineCost - cost) / baselineCost) * 100 : 0

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
  }
}

export function routeStream(
  messages: TokenixMessage[],
  options: { max_tokens?: number; temperature?: number } = {}
): RouteStreamResult {
  const taskType = classifyTask(messages)
  const providers = availableProviders()
  const model = selectModel(taskType, providers)

  if (!model) {
    throw new Error(`No provider available for task type "${taskType}". Configure at least one API key.`)
  }

  const baseline = getBaseline()
  const lm = getLanguageModel(model)

  const stream = streamText({
    model: lm,
    messages,
    maxTokens: options.max_tokens,
    temperature: options.temperature,
  })

  return {
    task_type: taskType,
    model_id: model.model_id,
    provider: model.provider,
    stream,
    input_cost_per_m: model.input_cost_per_m,
    output_cost_per_m: model.output_cost_per_m,
    baseline_cost_per_m: baseline.input_cost_per_m,
  }
}
