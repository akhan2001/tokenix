"use client";

import { useState, useMemo } from "react";
import type { PriceRow } from "@/lib/data";

// Estimate output at 3× input tokens (typical chat completion ratio)
const OUTPUT_MULT = 3;

function approxTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function fmtCost(usd: number): string {
  if (usd === 0) return "—";
  if (usd < 0.0000001) return "<$0.000001";
  if (usd < 0.001) return "$" + usd.toFixed(6);
  if (usd < 0.10)  return "$" + usd.toFixed(4);
  return "$" + usd.toFixed(2);
}

function shortName(row: PriceRow): string {
  return row.model_name.replace(/^[A-Za-z][A-Za-z0-9 ]+:\s*/, "").trim();
}

export function TokenCalculator({ models }: { models: PriceRow[] }) {
  const [text, setText] = useState("");

  const inputTok  = approxTokens(text);
  const outputTok = inputTok * OUTPUT_MULT;

  const ranked = useMemo(() => {
    return [...models]
      .map((m) => {
        const inputCost  = inputTok  * (m.input_per_million_usd  / 1e6);
        const outputCost = outputTok * (m.output_per_million_usd / 1e6);
        return { m, inputCost, outputCost, total: inputCost + outputCost };
      })
      .sort((a, b) => a.total - b.total);
  }, [models, inputTok, outputTok]);

  const baselineRow = ranked.find(
    (r) => r.m.model_id.includes("gpt-4o") && !r.m.model_id.includes("mini")
  );
  const cheapest = ranked[0];
  const savingsPct =
    baselineRow &&
    cheapest &&
    cheapest.m.model_id !== baselineRow.m.model_id &&
    baselineRow.total > 0 &&
    inputTok > 0
      ? Math.round((1 - cheapest.total / baselineRow.total) * 100)
      : null;

  return (
    <section
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        width: "100%",
        padding: "60px 48px",
        borderBottom: "1px solid var(--border)",
      }}
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <div className="sec-kicker">Try it live</div>
        <div
          style={{
            fontFamily: "var(--serif)",
            fontSize: 26,
            fontWeight: 500,
            color: "var(--text)",
            letterSpacing: "-0.01em",
          }}
        >
          Real-time token cost calculator
        </div>
        <p
          style={{
            fontSize: 12,
            color: "var(--text3)",
            marginTop: 10,
            lineHeight: 1.85,
            maxWidth: 520,
          }}
        >
          Paste a prompt and see what it costs across every major model — instantly,
          no API call. Output estimated at 3× input tokens.
        </p>
      </div>

      {/* ── Textarea ───────────────────────────────────────────── */}
      <div
        style={{
          border: "1px solid var(--border)",
          background: "var(--s1)",
          marginBottom: 28,
        }}
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste or type your prompt here…"
          rows={5}
          style={{
            width: "100%",
            background: "transparent",
            border: "none",
            outline: "none",
            resize: "vertical",
            padding: "18px 20px",
            fontFamily: "var(--mono)",
            fontSize: 13,
            color: "var(--text)",
            lineHeight: 1.75,
            boxSizing: "border-box",
          }}
        />
        {/* Token count bar */}
        <div
          style={{
            borderTop: "1px solid var(--border)",
            padding: "9px 20px",
            display: "flex",
            gap: 28,
            fontSize: 10,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--text3)",
          }}
        >
          <span>
            <span
              style={{
                color: "var(--accent)",
                fontFamily: "var(--serif)",
                fontSize: 14,
                letterSpacing: 0,
                textTransform: "none",
              }}
            >
              {inputTok.toLocaleString()}
            </span>{" "}
            input tokens
          </span>
          <span>
            <span
              style={{
                color: "var(--text2)",
                fontFamily: "var(--serif)",
                fontSize: 14,
                letterSpacing: 0,
                textTransform: "none",
              }}
            >
              ~{outputTok.toLocaleString()}
            </span>{" "}
            est. output
          </span>
          <span style={{ marginLeft: "auto" }}>≈ 4 chars / token</span>
        </div>
      </div>

      {/* ── Price table ────────────────────────────────────────── */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          borderTop: "1px solid var(--border)",
        }}
      >
        <thead>
          <tr>
            {["Model", "Provider", "Input cost", "Output cost (est.)"].map((h, i) => (
              <th
                key={h}
                style={{
                  textAlign: i >= 2 ? "right" : "left",
                  fontWeight: 400,
                  fontSize: 9,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "var(--text3)",
                  padding: "13px 14px",
                  borderBottom: "1px solid var(--border)",
                  whiteSpace: "nowrap",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ranked.map(({ m, inputCost, outputCost }, idx) => {
            const isCheapest = idx === 0 && inputTok > 0;
            const isBaseline =
              m.model_id.includes("gpt-4o") && !m.model_id.includes("mini");
            return (
              <tr
                key={m.model_id}
                style={{
                  borderBottom: "1px solid var(--border)",
                  background: isCheapest
                    ? "rgba(76,175,125,0.05)"
                    : "transparent",
                }}
              >
                {/* Model name */}
                <td style={{ padding: "14px 14px", verticalAlign: "middle" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--serif)",
                        fontSize: 15,
                        color: "var(--text)",
                        fontWeight: 500,
                      }}
                    >
                      {shortName(m)}
                    </span>
                    {isCheapest && (
                      <span
                        style={{
                          fontSize: 8,
                          letterSpacing: "0.16em",
                          textTransform: "uppercase",
                          color: "var(--green)",
                          border: "1px solid rgba(76,175,125,0.35)",
                          padding: "2px 6px",
                        }}
                      >
                        cheapest
                      </span>
                    )}
                    {isBaseline && (
                      <span
                        style={{
                          fontSize: 8,
                          letterSpacing: "0.16em",
                          textTransform: "uppercase",
                          color: "var(--text3)",
                          border: "1px solid var(--border)",
                          padding: "2px 6px",
                        }}
                      >
                        baseline
                      </span>
                    )}
                  </div>
                </td>

                {/* Provider */}
                <td
                  style={{
                    padding: "14px",
                    fontSize: 11,
                    color: "var(--text3)",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    verticalAlign: "middle",
                  }}
                >
                  {m.provider}
                </td>

                {/* Input cost */}
                <td
                  style={{
                    padding: "14px",
                    textAlign: "right",
                    fontFamily: "var(--mono)",
                    fontSize: 13,
                    color: isCheapest ? "var(--green)" : "var(--text)",
                    verticalAlign: "middle",
                  }}
                >
                  {inputTok > 0 ? (
                    fmtCost(inputCost)
                  ) : (
                    <span style={{ color: "var(--text3)", fontFamily: "var(--mono)" }}>
                      {fmtCost(m.input_per_million_usd / 1e6)}
                      <span style={{ fontSize: 10, color: "var(--text3)" }}>/tok</span>
                    </span>
                  )}
                </td>

                {/* Output cost */}
                <td
                  style={{
                    padding: "14px",
                    textAlign: "right",
                    fontFamily: "var(--mono)",
                    fontSize: 13,
                    color: "var(--text2)",
                    verticalAlign: "middle",
                  }}
                >
                  {inputTok > 0 ? (
                    fmtCost(outputCost)
                  ) : (
                    <span style={{ color: "var(--text3)", fontFamily: "var(--mono)" }}>
                      {fmtCost(m.output_per_million_usd / 1e6)}
                      <span style={{ fontSize: 10, color: "var(--text3)" }}>/tok</span>
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* ── Savings callout ────────────────────────────────────── */}
      {savingsPct !== null && savingsPct > 0 && (
        <div
          style={{
            marginTop: 20,
            padding: "16px 20px",
            border: "1px solid rgba(76,175,125,0.2)",
            background: "rgba(76,175,125,0.04)",
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <span
            style={{
              fontFamily: "var(--serif)",
              fontSize: 22,
              color: "var(--green)",
              lineHeight: 1,
            }}
          >
            ▼ {savingsPct}%
          </span>
          <span style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.7 }}>
            <strong style={{ color: "var(--text)" }}>{shortName(cheapest.m)}</strong> saves{" "}
            <strong style={{ color: "var(--green)" }}>{savingsPct}%</strong> vs GPT-4o for
            this prompt
          </span>
        </div>
      )}

      {/* ── Footer note ────────────────────────────────────────── */}
      <div
        style={{
          marginTop: inputTok > 0 ? 16 : 20,
          fontSize: 10,
          color: "var(--text3)",
          letterSpacing: "0.04em",
          lineHeight: 1.8,
        }}
      >
        {inputTok === 0
          ? "Showing per-token rates · type a prompt to see costs for your specific input"
          : `${inputTok.toLocaleString()} input · ~${outputTok.toLocaleString()} output · prices from OpenRouter`}
      </div>
    </section>
  );
}
