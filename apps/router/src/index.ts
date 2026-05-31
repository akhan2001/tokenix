import { serve } from "@hono/node-server"
import { Hono } from "hono"
import { streamSSE } from "hono/streaming"
import { route, routeStream } from "./router.js"
import type { TokenixMessage } from "@tokenix/types"

const app = new Hono()

// ── Health ────────────────────────────────────────────────────────────────────

app.get("/health", (c) => c.json({ status: "ok", ts: new Date().toISOString() }))

// ── OpenAI-compatible chat completions ────────────────────────────────────────

app.post("/v1/chat/completions", async (c) => {
  const body = await c.req.json<{
    messages: TokenixMessage[]
    model?: string
    max_tokens?: number
    temperature?: number
    stream?: boolean
  }>()

  const messages: TokenixMessage[] = body.messages
  const opts = { max_tokens: body.max_tokens, temperature: body.temperature }

  // ── Streaming ──────────────────────────────────────────────────────────────
  if (body.stream) {
    const { task_type, model_id, provider, stream } = routeStream(messages, opts)

    return streamSSE(c, async (sse) => {
      sse.onAbort(() => stream.textStream.cancel?.())

      for await (const chunk of stream.textStream) {
        await sse.writeSSE({
          data: JSON.stringify({
            object: "chat.completion.chunk",
            choices: [{ delta: { content: chunk }, index: 0, finish_reason: null }],
            // routing metadata on every chunk so clients can log it
            "x-tokenix-model": model_id,
            "x-tokenix-provider": provider,
            "x-tokenix-task": task_type,
          }),
        })
      }

      // terminal chunk
      await sse.writeSSE({ data: "[DONE]" })
    })
  }

  // ── Non-streaming ──────────────────────────────────────────────────────────
  const result = await route(messages, opts)

  const requestId = `chatcmpl-${Date.now()}`

  c.header("x-tokenix-model", result.model_id)
  c.header("x-tokenix-provider", result.provider)
  c.header("x-tokenix-task", result.task_type)
  c.header("x-tokenix-cost-usd", result.cost_usd.toFixed(6))
  c.header("x-tokenix-saving-pct", result.saving_pct.toFixed(1))

  return c.json({
    id: requestId,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: result.model_id,
    choices: [
      {
        index: 0,
        message: { role: "assistant", content: result.text },
        finish_reason: "stop",
      },
    ],
    usage: {
      prompt_tokens: result.input_tokens,
      completion_tokens: result.output_tokens,
      total_tokens: result.input_tokens + result.output_tokens,
    },
    // extended fields (ignored by OpenAI-SDK clients, readable by ours)
    tokenix: {
      task_type: result.task_type,
      provider: result.provider,
      cost_usd: result.cost_usd,
      cost_baseline_usd: result.cost_baseline_usd,
      saving_pct: result.saving_pct,
    },
  })
})

// ── Start ─────────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT ?? "3001", 10)

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`Tokenix router running on http://localhost:${PORT}`)
  console.log(`  POST /v1/chat/completions`)
  console.log(`  GET  /health`)
})
