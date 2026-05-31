export type TaskType =
  | "chat"
  | "code"
  | "reasoning"
  | "summarization"
  | "extraction"
  | "classification"

export interface TokenixMessage {
  role: "system" | "user" | "assistant"
  content: string
}

export interface ModelEntry {
  model_id: string
  provider: string
  native_id: string           // ID passed to the provider SDK
  task_types: TaskType[]
  input_cost_per_m: number    // USD per million input tokens
  output_cost_per_m: number   // USD per million output tokens
  acpi: number                // 0–100, higher = better value; overwritten by index-engine
  context_length: number
}

export interface TokenixRequest {
  messages: TokenixMessage[]
  model?: string
  max_tokens?: number
  temperature?: number
  stream: boolean
  task_type?: TaskType
  metadata: {
    api_key: string
    request_id: string
    timestamp: string
  }
}

export interface TokenixUsage {
  input_tokens: number
  output_tokens: number
  cost_usd: number
  cost_baseline_usd: number   // what they'd have paid hitting the top model directly
  saving_pct: number
}

export interface TokenixResponse {
  id: string
  model_used: string
  provider: string
  choices: Array<{
    message: { role: "assistant"; content: string }
    finish_reason: string
    index: number
  }>
  usage: TokenixUsage
}
