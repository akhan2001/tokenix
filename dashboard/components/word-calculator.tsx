"use client";

import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/calculator";

// ── Disclosed assumptions ─────────────────────────────────────────────────────
// Standard word→token approximation (OpenAI's published rule of thumb: ~0.75
// words per token). Output volume isn't knowable from input text alone, so it's
// modelled as a fraction of the input — 30% is a conservative single-turn reply.
const WORDS_PER_TOKEN = 0.75;
const OUTPUT_RATIO = 0.3;

// ── Hardcoded reference prices ────────────────────────────────────────────────
// Placeholder for the first cut of this widget — will read from the live
// /api/calculator/prices feed (same one TokenCalculator uses) next sprint.
// acpi_score here is illustrative, not the real computed P1; the live wire-up
// will replace it with the same benchmark-backed score TokenCalculator uses.
interface WordProvider {
  name: string;
  provider: string;
  input: number; // USD / 1M input tokens
  output: number; // USD / 1M output tokens
  acpi_score: number;
}

const PROVIDERS: WordProvider[] = [
  { name: "DeepSeek V3", provider: "DeepSeek", input: 0.27, output: 1.1, acpi_score: 7.2 },
  { name: "Gemini 2.5 Flash", provider: "Google", input: 0.15, output: 0.6, acpi_score: 6.8 },
  { name: "GPT-4.1 nano", provider: "OpenAI", input: 0.1, output: 0.4, acpi_score: 6.1 },
  { name: "Llama 3.3 70B", provider: "Together", input: 0.59, output: 0.79, acpi_score: 5.4 },
  { name: "Claude Haiku 4.5", provider: "Anthropic", input: 1.0, output: 5.0, acpi_score: 4.8 },
  { name: "GPT-4o", provider: "OpenAI", input: 2.5, output: 10.0, acpi_score: 4.1 },
  { name: "Claude Sonnet 4.6", provider: "Anthropic", input: 3.0, output: 15.0, acpi_score: 3.9 },
];

const RANKED = [...PROVIDERS].sort((a, b) => b.acpi_score - a.acpi_score);

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 9,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        color: "var(--text3)",
        marginBottom: 10,
      }}
    >
      {children}
    </div>
  );
}

export function WordCalculator() {
  const [text, setText] = useState("");

  const { words, chars, tokens } = useMemo(() => {
    const trimmed = text.trim();
    const wordCount = trimmed ? trimmed.split(/\s+/).length : 0;
    return {
      words: wordCount,
      chars: text.length,
      tokens: Math.round(wordCount / WORDS_PER_TOKEN),
    };
  }, [text]);

  const results = useMemo(
    () =>
      RANKED.map((p) => {
        const inputTokens = tokens;
        const outputTokens = tokens * OUTPUT_RATIO;
        const inputCost = (inputTokens / 1_000_000) * p.input;
        const outputCost = (outputTokens / 1_000_000) * p.output;
        return { provider: p, inputCost, outputCost, totalCost: inputCost + outputCost };
      }),
    [tokens]
  );

  const cellPad = "10px 14px";
  const th: React.CSSProperties = {
    padding: cellPad,
    color: "var(--text3)",
    fontSize: 9,
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    fontWeight: 400,
    textAlign: "right",
    whiteSpace: "nowrap",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <Kicker>Paste any text</Kicker>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste or type your text here…"
          rows={6}
          style={{
            width: "100%",
            resize: "vertical",
            background: "var(--s1)",
            border: "1px solid var(--border)",
            color: "var(--text)",
            padding: "14px 16px",
            fontSize: 13,
            fontFamily: "var(--mono)",
            lineHeight: 1.6,
            outline: "none",
            transition: "border-color 0.2s",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent-dim)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
        />
        <div style={{ display: "flex", gap: 28, marginTop: 12, flexWrap: "wrap" }}>
          {[
            { label: "Characters", value: chars.toLocaleString("en-US") },
            { label: "Word count", value: `${words.toLocaleString("en-US")} words` },
            { label: "Token count", value: `~${tokens.toLocaleString("en-US")} tokens (estimated)` },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text3)" }}>
                {label}
              </span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 15, color: "var(--text)" }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div style={{ marginBottom: 14 }}>
          <Kicker>Ranked by ACPI value score — balances price and quality</Kicker>
        </div>

        <div style={{ overflowX: "auto", border: "1px solid var(--border)" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "var(--s1)", borderBottom: "1px solid var(--border)" }}>
                <th style={{ ...th, textAlign: "left" }}>Provider</th>
                <th style={{ ...th, width: 90 }}>ACPI Score</th>
                <th style={{ ...th, width: 130 }}>Input Cost</th>
                <th style={{ ...th, width: 130 }}>Output Cost</th>
                <th style={{ ...th, width: 130 }}>Total Cost</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr
                  key={r.provider.name}
                  style={{ borderBottom: "1px solid var(--border)", transition: "background 0.12s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--s1)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                >
                  <td style={{ padding: cellPad }}>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ color: "var(--text)", display: "flex", alignItems: "center", gap: 8 }}>
                        {r.provider.name}
                        {i === 0 && (
                          <span
                            style={{
                              fontSize: 9,
                              letterSpacing: "0.1em",
                              textTransform: "uppercase",
                              color: "var(--green)",
                            }}
                          >
                            best value
                          </span>
                        )}
                      </span>
                      <span style={{ fontFamily: "var(--mono)", color: "var(--text3)", fontSize: 10 }}>
                        {r.provider.provider}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: cellPad, textAlign: "right", fontFamily: "var(--mono)", color: "var(--accent)" }}>
                    {r.provider.acpi_score.toFixed(1)}
                  </td>
                  <td style={{ padding: cellPad, textAlign: "right", fontFamily: "var(--mono)", color: "var(--text3)" }}>
                    {formatCurrency(r.inputCost)}
                  </td>
                  <td style={{ padding: cellPad, textAlign: "right", fontFamily: "var(--mono)", color: "var(--text3)" }}>
                    {formatCurrency(r.outputCost)}
                  </td>
                  <td style={{ padding: cellPad, textAlign: "right", fontFamily: "var(--mono)", color: "var(--text)" }}>
                    {formatCurrency(r.totalCost)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 12, fontSize: 10, color: "var(--text3)", lineHeight: 1.6 }}>
          1 token ≈ {WORDS_PER_TOKEN} words · Output estimated at {OUTPUT_RATIO * 100}% of input length ·
          Reference pricing, not yet wired to the live Tokenix feed · tokenixindex.com
        </div>
      </div>
    </div>
  );
}
