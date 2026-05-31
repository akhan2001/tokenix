import type { TaskType, TokenixMessage } from "@tokenix/types"

const PATTERNS: Array<{ type: TaskType; tests: RegExp[] }> = [
  {
    type: "code",
    tests: [
      /```/,
      /\b(function|class|const|let|var|def|import|export|return|async|await)\b/,
      /\b(bug|debug|error|exception|fix|refactor|implement|write.*code|code.*review)\b/i,
      /\b(typescript|javascript|python|rust|golang|sql|bash|shell)\b/i,
    ],
  },
  {
    type: "reasoning",
    tests: [
      /step.?by.?step/i,
      /\b(prove|proof|derive|infer|deduce)\b/i,
      /\b(solve|calculate|compute|equation|formula|math|logic)\b/i,
      /\b(why|reason|explain.*how|how.*work|because)\b/i,
      /[∑∫√≠≤≥×÷]/,
    ],
  },
  {
    type: "summarization",
    tests: [
      /\b(summarize|summarise|summary|tldr|tl;dr)\b/i,
      /\b(key.*points?|main.*ideas?|condense|shorten|brief|overview)\b/i,
    ],
  },
  {
    type: "extraction",
    tests: [
      /\b(extract|parse|pull out|find all|list all)\b/i,
      /\b(json|xml|csv|structured|format as|output as)\b/i,
      /\b(table|schema|fields?|properties|attributes)\b/i,
    ],
  },
  {
    type: "classification",
    tests: [
      /\b(classify|categorize|categorise|label|tag)\b/i,
      /\b(which (category|type|class)|what (type|kind) of)\b/i,
      /\b(sentiment|tone|intent|positive|negative|neutral)\b/i,
    ],
  },
]

export function classifyTask(messages: TokenixMessage[]): TaskType {
  const text = messages
    .filter((m) => m.role !== "assistant")
    .map((m) => m.content)
    .join("\n")

  for (const { type, tests } of PATTERNS) {
    if (tests.some((re) => re.test(text))) return type
  }
  return "chat"
}
