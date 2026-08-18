"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { CalculatorPriceRow } from "@/lib/data";
import {
  CACHED_INPUT_SHARE,
  CACHE_READ_MULTIPLIER,
  INPUT_SHARE,
  LIMITS,
  OUTPUT_SHARE,
  SCENARIOS,
  WORDS_PER_TOKEN,
  calculateAll,
  calculateSavings,
  formatCount,
  formatCurrency,
  formatPercent,
  formatTokens,
  type CalculatorConfig,
  type CostResult,
} from "@/lib/calculator";

interface AcpiSummary {
  value: number;
  computed_at: string;
  model_count: number;
  provider_count: number;
}

interface PricesResponse {
  acpi: AcpiSummary | null;
  models: CalculatorPriceRow[];
  last_updated: string | null;
}

/** How many models the bar chart shows. 260-odd bars is a texture, not a chart. */
const CHART_ROWS = 10;

// ── Provider filter ──────────────────────────────────────────────────────────
// Buyers think in model brands ("can I afford Claude?"), while the price feed
// is keyed by catalog slug. These groups map one to the other, and let a single
// chip cover a lab that ships under more than one slug — Meta lists as both
// `meta-llama` and `meta`.
//
// Editorial order: the labs most people are choosing between come first. Any
// provider in the data that isn't listed here still gets its own chip, appended
// by model count, so changing the allowlist in export_prices.py can't quietly
// drop a provider out of the filter.

interface ProviderGroup {
  id: string;
  label: string;
  providers: string[];
}

const PROVIDER_GROUPS: ProviderGroup[] = [
  { id: "openai",     label: "OpenAI · GPT",      providers: ["openai"] },
  { id: "anthropic",  label: "Anthropic · Claude", providers: ["anthropic"] },
  { id: "google",     label: "Google · Gemini",   providers: ["google"] },
  { id: "meta",       label: "Meta · Llama",      providers: ["meta-llama", "meta"] },
  { id: "x-ai",       label: "xAI · Grok",        providers: ["x-ai"] },
  { id: "deepseek",   label: "DeepSeek",          providers: ["deepseek"] },
  { id: "qwen",       label: "Alibaba · Qwen",    providers: ["qwen"] },
  { id: "mistralai",  label: "Mistral",           providers: ["mistralai"] },
  { id: "moonshotai", label: "Moonshot · Kimi",   providers: ["moonshotai"] },
  { id: "z-ai",       label: "Z.ai · GLM",        providers: ["z-ai"] },
  { id: "minimax",    label: "MiniMax",           providers: ["minimax"] },
  { id: "amazon",     label: "Amazon · Nova",     providers: ["amazon"] },
  { id: "microsoft",  label: "Microsoft · Phi",   providers: ["microsoft"] },
  { id: "cohere",     label: "Cohere",            providers: ["cohere"] },
  { id: "nvidia",     label: "NVIDIA",            providers: ["nvidia"] },
  { id: "perplexity", label: "Perplexity",        providers: ["perplexity"] },
  { id: "ai21",       label: "AI21",              providers: ["ai21"] },
];

interface AvailableGroup extends ProviderGroup {
  count: number;
}

/** The groups actually represented in the loaded price data, with model counts. */
function availableGroups(models: CalculatorPriceRow[]): AvailableGroup[] {
  const counts = new Map<string, number>();
  for (const m of models) counts.set(m.provider, (counts.get(m.provider) ?? 0) + 1);

  const claimed = new Set<string>();
  const groups: AvailableGroup[] = [];

  for (const g of PROVIDER_GROUPS) {
    let count = 0;
    for (const p of g.providers) {
      count += counts.get(p) ?? 0;
      claimed.add(p);
    }
    if (count > 0) groups.push({ ...g, count });
  }

  // Anything the editorial list doesn't cover, by descending model count.
  const leftovers = [...counts.entries()]
    .filter(([p]) => !claimed.has(p))
    .sort((a, b) => b[1] - a[1])
    .map(([p, count]) => ({ id: p, label: p, providers: [p], count }));

  return [...groups, ...leftovers];
}

// ── Log-scaled slider mapping ────────────────────────────────────────────────
// Workflow volume and tokens-per-step both span four orders of magnitude. On a
// linear track the entire useful low end collapses into the first few pixels,
// so those two sliders move through log space.

const TRACK = 1000;

function toTrack(value: number, min: number, max: number): number {
  const t = (Math.log(value) - Math.log(min)) / (Math.log(max) - Math.log(min));
  return Math.round(t * TRACK);
}

function fromTrack(pos: number, min: number, max: number): number {
  return Math.exp(Math.log(min) + (pos / TRACK) * (Math.log(max) - Math.log(min)));
}

// ── Small shared bits ────────────────────────────────────────────────────────

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

function Panel({
  title,
  children,
  style,
}: {
  title?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        border: "1px solid var(--border)",
        background: "var(--s1)",
        padding: "22px 24px",
        ...style,
      }}
    >
      {title && <Kicker>{title}</Kicker>}
      {children}
    </div>
  );
}

function Chip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        height: 28,
        padding: "0 11px",
        border: active ? "1px solid var(--accent-dim)" : "1px solid var(--border)",
        background: active ? "var(--s1)" : "transparent",
        color: active ? "var(--accent)" : "var(--text2)",
        fontSize: 11,
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "all 0.15s",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.borderColor = "var(--border2)";
          e.currentTarget.style.color = "var(--text)";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.borderColor = "var(--border)";
          e.currentTarget.style.color = "var(--text2)";
        }
      }}
    >
      {label}
      {count !== undefined && (
        <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--text3)" }}>
          {count}
        </span>
      )}
    </button>
  );
}

function Slider({
  label,
  hint,
  display,
  trackValue,
  trackMax,
  onTrackChange,
}: {
  label: string;
  hint: string;
  display: string;
  trackValue: number;
  trackMax: number;
  onTrackChange: (v: number) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <span style={{ fontSize: 12, color: "var(--text2)" }}>{label}</span>
        <span
          style={{
            fontFamily: "var(--mono)",
            fontSize: 14,
            color: "var(--accent)",
            whiteSpace: "nowrap",
          }}
        >
          {display}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={trackMax}
        value={trackValue}
        onChange={(e) => onTrackChange(Number(e.target.value))}
        aria-label={label}
        style={{ width: "100%", accentColor: "var(--accent)", cursor: "pointer" }}
      />
      <span style={{ fontSize: 10, color: "var(--text3)", letterSpacing: "0.02em" }}>{hint}</span>
    </div>
  );
}

// ── Bar chart ────────────────────────────────────────────────────────────────
// One measure (monthly cost) across named models: horizontal bars, sorted, one
// hue. A single series needs no legend — every bar is directly labeled with its
// model and its value. The cheapest bar is additionally marked in the "good"
// status color *and* carries a text label, so it never reads by color alone.

function CostBars({ results, total }: { results: CostResult[]; total: number }) {
  const [hovered, setHovered] = useState<number | null>(null);

  const shown = results.slice(0, CHART_ROWS);
  const max = shown.length ? Math.max(...shown.map((r) => r.monthly)) : 0;

  if (!shown.length || max <= 0) return null;

  const topIsScored = shown[0]?.model.p1 !== null;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
        <Kicker>
          Top {shown.length} of {formatCount(total)} models · monthly
        </Kicker>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {shown.map((r, i) => {
          const pct = (r.monthly / max) * 100;
          const isBestValue = i === 0 && topIsScored;
          const isHovered = hovered === i;

          return (
            <div
              key={r.model.model_id}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{ position: "relative", cursor: "default" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  marginBottom: 3,
                  gap: 12,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    color: isHovered ? "var(--text)" : "var(--text2)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {r.model.model_name.replace(/^[A-Za-z][A-Za-z0-9 ]+:\s*/, "")}
                  {isBestValue && (
                    <span
                      style={{
                        marginLeft: 8,
                        fontSize: 9,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        color: "var(--green)",
                      }}
                    >
                      best value
                    </span>
                  )}
                </span>
                <span
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 11,
                    color: "var(--text)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {formatCurrency(r.monthly)}
                </span>
              </div>

              {/* Track + bar. Square ends, matching the ledger aesthetic. */}
              <div style={{ height: 10, background: "var(--s2)", width: "100%" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${Math.max(pct, 0.4)}%`,
                    background: isBestValue ? "var(--green)" : "var(--accent)",
                    opacity: isHovered ? 1 : 0.85,
                    transition: "width 0.25s ease, opacity 0.15s",
                  }}
                />
              </div>

              {isHovered && (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: -6,
                    transform: "translateY(-100%)",
                    background: "var(--s2)",
                    border: "1px solid var(--border2)",
                    padding: "7px 10px",
                    fontSize: 10,
                    zIndex: 5,
                    whiteSpace: "nowrap",
                    pointerEvents: "none",
                  }}
                >
                  <div style={{ fontFamily: "var(--mono)", color: "var(--text3)", marginBottom: 3 }}>
                    {r.model.model_id}
                  </div>
                  <div style={{ color: "var(--text2)" }}>
                    {formatCurrency(r.annual)} / yr · {formatCurrency(r.perWorkflow)} per workflow
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Results table ────────────────────────────────────────────────────────────

function ResultsTable({ results }: { results: CostResult[] }) {
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
    <div style={{ overflowX: "auto", maxHeight: 560, overflowY: "auto", border: "1px solid var(--border)" }}>
      <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12 }}>
        <thead>
          <tr style={{ background: "var(--s1)", borderBottom: "1px solid var(--border)", position: "sticky", top: 0, zIndex: 2 }}>
            <th style={{ ...th, textAlign: "left", width: 40 }}>#</th>
            <th style={{ ...th, textAlign: "left" }}>Model</th>
            <th style={{ ...th, width: 90 }}>ACPI Score</th>
            <th style={{ ...th, width: 120 }}>Blended /1M</th>
            <th style={{ ...th, width: 120 }}>Per workflow</th>
            <th style={{ ...th, width: 130 }}>Monthly</th>
            <th style={{ ...th, width: 130 }}>Annual</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r, i) => {
            const scored = r.model.p1 !== null;
            const isBestValue = i === 0 && scored;
            return (
            <tr
              key={r.model.model_id}
              style={{ borderBottom: "1px solid var(--border)", transition: "background 0.12s" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--s1)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "")}
            >
              <td style={{ padding: cellPad, fontFamily: "var(--mono)", fontSize: 10, color: "var(--text3)" }}>
                {i + 1}
              </td>
              <td style={{ padding: cellPad }}>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ color: "var(--text)", display: "flex", alignItems: "center", gap: 8 }}>
                    {r.model.model_name.replace(/^[A-Za-z][A-Za-z0-9 ]+:\s*/, "")}
                    {isBestValue && (
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
                    {r.model.model_id}
                  </span>
                </div>
              </td>
              <td style={{ padding: cellPad, textAlign: "right", fontFamily: "var(--mono)", color: scored ? "var(--accent)" : "var(--text3)" }}>
                {scored ? r.model.p1!.toFixed(1) : "—"}
              </td>
              <td style={{ padding: cellPad, textAlign: "right", fontFamily: "var(--mono)", color: "var(--text3)" }}>
                {formatCurrency(r.model.blended_per_million)}
              </td>
              <td style={{ padding: cellPad, textAlign: "right", fontFamily: "var(--mono)", color: "var(--text2)" }}>
                {formatCurrency(r.perWorkflow)}
              </td>
              <td style={{ padding: cellPad, textAlign: "right", fontFamily: "var(--mono)", color: "var(--accent)" }}>
                {formatCurrency(r.monthly)}
              </td>
              <td style={{ padding: cellPad, textAlign: "right", fontFamily: "var(--mono)", color: "var(--text2)" }}>
                {formatCurrency(r.annual)}
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export function TokenCalculator() {
  const [data, setData] = useState<PricesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [scenarioId, setScenarioId] = useState<string>(SCENARIOS[0].id);
  const [config, setConfig] = useState<CalculatorConfig>(SCENARIOS[0].config);

  // Chat assistant's config comes from a pasted sample message rather than a
  // token-count slider — this is only read/shown when scenarioId === "assistant".
  const [pastedText, setPastedText] = useState("");
  const isAssistantScenario = scenarioId === "assistant";

  /** Selected provider-group ids. Empty means "all" — never means "none". */
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);

  // Prices are fetched once. Every slider move recalculates from what's already
  // in memory — no request per keystroke.
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/calculator/prices");
        const body = await res.json();
        if (cancelled) return;

        if (!res.ok) {
          setError(body?.error ?? "Unable to load pricing data.");
        } else {
          setData(body as PricesResponse);
        }
      } catch {
        if (!cancelled) setError("Unable to reach the pricing service.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const groups = useMemo(() => (data ? availableGroups(data.models) : []), [data]);

  const filteredModels = useMemo(() => {
    if (!data) return [];
    if (!selectedGroups.length) return data.models;

    const slugs = new Set(
      groups.filter((g) => selectedGroups.includes(g.id)).flatMap((g) => g.providers)
    );
    return data.models.filter((m) => slugs.has(m.provider));
  }, [data, groups, selectedGroups]);

  const results = useMemo(
    () => calculateAll(config, filteredModels),
    [config, filteredModels]
  );
  const savings = useMemo(() => calculateSavings(results), [results]);

  function toggleGroup(id: string) {
    setSelectedGroups((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  }

  function update(patch: Partial<CalculatorConfig>) {
    setConfig((c) => ({ ...c, ...patch }));
    setScenarioId(""); // a manual edit means we're no longer on a preset
  }

  function applyScenario(id: string) {
    const s = SCENARIOS.find((s) => s.id === id);
    if (!s) return;
    setScenarioId(id);
    setConfig(s.config);
    setPastedText("");
  }

  const pastedWordCount = useMemo(() => {
    const trimmed = pastedText.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }, [pastedText]);

  /**
   * Derives tokensPerStep from the pasted message. The message is the input
   * side of the call, so tokensPerStep is backed into inputTokens / INPUT_SHARE
   * — the same 75/25 blend the rest of the calculator (and the ACPI index)
   * uses — rather than inventing a second output-ratio assumption just for
   * this scenario.
   */
  function updatePastedText(text: string) {
    setPastedText(text);
    const trimmed = text.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    if (words === 0) return; // keep the last real estimate until there's text again

    const inputTokens = words / WORDS_PER_TOKEN;
    const rawTokensPerStep = Math.round(inputTokens / INPUT_SHARE);
    const tokensPerStep = Math.min(
      LIMITS.tokensPerStep.max,
      Math.max(LIMITS.tokensPerStep.min, rawTokensPerStep)
    );
    // Chat assistant is a single short call, no agent loop — stepsPerWorkflow
    // and agentStepsPerStep stay fixed at 1; only the token count moves.
    setConfig((c) => ({ ...c, tokensPerStep, stepsPerWorkflow: 1, agentStepsPerStep: 1 }));
  }

  const callsPerMonth =
    config.workflowsPerMonth * config.stepsPerWorkflow * config.agentStepsPerStep;
  const tokensPerMonth = callsPerMonth * config.tokensPerStep;

  // ── States ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: "80px 48px", textAlign: "center", color: "var(--text3)", fontSize: 12, letterSpacing: "0.06em" }}>
        Loading live prices…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "80px 48px", textAlign: "center" }}>
        <div style={{ fontFamily: "var(--serif)", fontSize: 20, color: "var(--text)", marginBottom: 8 }}>
          Prices unavailable
        </div>
        <div style={{ color: "var(--text3)", fontSize: 12 }}>{error}</div>
      </div>
    );
  }

  return (
    <div className="calc-wrap" style={{ padding: "44px 48px 64px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", flexDirection: "column", gap: 34 }}>
        {/* ── Scenario presets ───────────────────────────────────────────── */}
        <section>
          <Kicker>Start from a workload</Kicker>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 14,
            }}
          >
            {SCENARIOS.map((s) => {
              const active = scenarioId === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => applyScenario(s.id)}
                  style={{
                    textAlign: "left",
                    padding: "18px 20px",
                    border: active ? "1px solid var(--accent-dim)" : "1px solid var(--border)",
                    background: active ? "var(--s1)" : "transparent",
                    cursor: "pointer",
                    transition: "border-color 0.15s, background 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    if (!active) e.currentTarget.style.borderColor = "var(--border2)";
                  }}
                  onMouseLeave={(e) => {
                    if (!active) e.currentTarget.style.borderColor = "var(--border)";
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--serif)",
                      fontSize: 17,
                      color: active ? "var(--accent)" : "var(--text)",
                      marginBottom: 6,
                    }}
                  >
                    {s.label}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.5 }}>{s.blurb}</div>
                </button>
              );
            })}
          </div>
        </section>

        {/* ── Provider filter ────────────────────────────────────────────── */}
        <section>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <Kicker>Providers to compare</Kicker>
            <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--text3)", marginBottom: 10 }}>
              {formatCount(filteredModels.length)} of {formatCount(data.models.length)} models
            </span>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            <Chip
              label="All providers"
              active={selectedGroups.length === 0}
              onClick={() => setSelectedGroups([])}
            />
            {groups.map((g) => (
              <Chip
                key={g.id}
                label={g.label}
                count={g.count}
                active={selectedGroups.includes(g.id)}
                onClick={() => toggleGroup(g.id)}
              />
            ))}
          </div>
        </section>

        {/* ── Configuration ──────────────────────────────────────────────── */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(300px, 1fr) minmax(300px, 1.25fr)",
            gap: 20,
            alignItems: "start",
          }}
          className="calc-config-grid"
        >
          <Panel title="Your workload">
            <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
              <Slider
                label={isAssistantScenario ? "Messages / month" : "Workflow runs / month"}
                hint={isAssistantScenario ? "How often you send a message like this." : "One end-to-end pass of your task."}
                display={formatCount(config.workflowsPerMonth)}
                trackValue={toTrack(
                  config.workflowsPerMonth,
                  LIMITS.workflowsPerMonth.min,
                  LIMITS.workflowsPerMonth.max
                )}
                trackMax={TRACK}
                onTrackChange={(v) => {
                  const workflowsPerMonth = fromTrack(
                    v,
                    LIMITS.workflowsPerMonth.min,
                    LIMITS.workflowsPerMonth.max
                  );
                  // On the Chat assistant tab, adjusting volume refines the
                  // preset rather than leaving it — the paste box should stay
                  // visible. Every other scenario keeps the old behavior:
                  // any manual slider edit drops out of the preset.
                  if (isAssistantScenario) {
                    setConfig((c) => ({ ...c, workflowsPerMonth }));
                  } else {
                    update({ workflowsPerMonth });
                  }
                }}
              />

              {isAssistantScenario ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <span style={{ fontSize: 12, color: "var(--text2)" }}>Paste a sample message</span>
                  <textarea
                    value={pastedText}
                    onChange={(e) => updatePastedText(e.target.value)}
                    placeholder="Paste or type a typical message here…"
                    rows={5}
                    style={{
                      width: "100%",
                      resize: "vertical",
                      background: "var(--bg)",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                      padding: "10px 12px",
                      fontSize: 12,
                      fontFamily: "var(--mono)",
                      lineHeight: 1.6,
                      outline: "none",
                      transition: "border-color 0.2s",
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent-dim)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                  />
                  <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                    {[
                      { label: "Words", value: formatCount(pastedWordCount) },
                      { label: "Tokens / call", value: formatTokens(config.tokensPerStep) },
                    ].map(({ label, value }) => (
                      <span key={label} style={{ fontSize: 10, color: "var(--text3)" }}>
                        {label}: <span style={{ fontFamily: "var(--mono)", color: "var(--text2)" }}>{value}</span>
                      </span>
                    ))}
                  </div>
                  <span style={{ fontSize: 10, color: "var(--text3)", letterSpacing: "0.02em" }}>
                    1 token ≈ {WORDS_PER_TOKEN} words · output modelled at the same{" "}
                    {INPUT_SHARE * 100}/{OUTPUT_SHARE * 100} blend as the rest of this calculator.
                  </span>
                </div>
              ) : (
                <>
                  <Slider
                    label="Steps / workflow"
                    hint="Model calls in a single pass."
                    display={String(config.stepsPerWorkflow)}
                    trackValue={config.stepsPerWorkflow}
                    trackMax={LIMITS.stepsPerWorkflow.max}
                    onTrackChange={(v) =>
                      update({ stepsPerWorkflow: Math.max(LIMITS.stepsPerWorkflow.min, v) })
                    }
                  />
                  <Slider
                    label="Agent iterations / step"
                    hint="Tool-use loops per step. 1 = no agent loop."
                    display={String(config.agentStepsPerStep)}
                    trackValue={config.agentStepsPerStep}
                    trackMax={LIMITS.agentStepsPerStep.max}
                    onTrackChange={(v) =>
                      update({ agentStepsPerStep: Math.max(LIMITS.agentStepsPerStep.min, v) })
                    }
                  />
                  <Slider
                    label="Tokens / step"
                    hint={`Input + output per call, split ${INPUT_SHARE * 100}/${OUTPUT_SHARE * 100}.`}
                    display={formatTokens(config.tokensPerStep)}
                    trackValue={toTrack(
                      config.tokensPerStep,
                      LIMITS.tokensPerStep.min,
                      LIMITS.tokensPerStep.max
                    )}
                    trackMax={TRACK}
                    onTrackChange={(v) =>
                      update({
                        tokensPerStep: fromTrack(v, LIMITS.tokensPerStep.min, LIMITS.tokensPerStep.max),
                      })
                    }
                  />
                </>
              )}

              {/* Prompt caching toggle */}
              <label
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  cursor: "pointer",
                  borderTop: "1px solid var(--border)",
                  paddingTop: 18,
                }}
              >
                <input
                  type="checkbox"
                  checked={config.promptCaching}
                  onChange={(e) => {
                    const promptCaching = e.target.checked;
                    if (isAssistantScenario) {
                      setConfig((c) => ({ ...c, promptCaching }));
                    } else {
                      update({ promptCaching });
                    }
                  }}
                  style={{ accentColor: "var(--accent)", marginTop: 2, cursor: "pointer" }}
                />
                <span>
                  <span style={{ fontSize: 12, color: "var(--text2)", display: "block" }}>
                    Prompt caching
                  </span>
                  <span style={{ fontSize: 10, color: "var(--text3)", lineHeight: 1.5 }}>
                    Assumes {CACHED_INPUT_SHARE * 100}% of input repeats and bills at{" "}
                    {CACHE_READ_MULTIPLIER * 100}% of list.
                  </span>
                </span>
              </label>
            </div>
          </Panel>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Headline */}
            <Panel title={results[0]?.model.p1 !== null ? "Best value" : "Cheapest option"}>
              {results.length > 0 ? (
                <div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "var(--serif)", fontSize: 38, color: "var(--text)", lineHeight: 1.1 }}>
                      {formatCurrency(results[0].monthly)}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--text3)", letterSpacing: "0.06em" }}>
                      / month · {formatCurrency(results[0].annual)} / yr
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                    {results[0].model.model_name.replace(/^[A-Za-z][A-Za-z0-9 ]+:\s*/, "")}
                    {results[0].model.p1 !== null && (
                      <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--accent)" }}>
                        ACPI {results[0].model.p1.toFixed(1)}
                      </span>
                    )}
                  </div>

                  {/* The spread needs two models to mean anything — filtering
                      down to a single model shows its price, not a comparison. */}
                  {savings && (
                    <div
                      style={{
                        marginTop: 16,
                        paddingTop: 14,
                        borderTop: "1px solid var(--border)",
                        fontSize: 11,
                        color: "var(--text3)",
                        lineHeight: 1.7,
                      }}
                    >
                      <div>
                        Dearest in selection:{" "}
                        <span style={{ fontFamily: "var(--mono)", color: "var(--text2)" }}>
                          {formatCurrency(savings.mostExpensive.monthly)}
                        </span>{" "}
                        / month
                      </div>
                      <div>
                        Spread:{" "}
                        <span style={{ fontFamily: "var(--mono)", color: "var(--green)" }}>
                          {formatPercent(savings.savingsPct)}
                        </span>{" "}
                        — {formatCurrency(savings.annualDelta)} a year between the two ends.
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ color: "var(--text3)", fontSize: 12 }}>
                  No models match the selected providers.
                </div>
              )}
            </Panel>

            {/* Volume readout */}
            <Panel title="Monthly volume">
              <div style={{ display: "flex", gap: 30, flexWrap: "wrap" }}>
                {[
                  { label: "Model calls", value: formatCount(callsPerMonth) },
                  { label: "Total tokens", value: formatTokens(tokensPerMonth) },
                  { label: "Input tokens", value: formatTokens(tokensPerMonth * INPUT_SHARE) },
                  { label: "Output tokens", value: formatTokens(tokensPerMonth * OUTPUT_SHARE) },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <span
                      style={{
                        fontSize: 9,
                        letterSpacing: "0.16em",
                        textTransform: "uppercase",
                        color: "var(--text3)",
                      }}
                    >
                      {label}
                    </span>
                    <span style={{ fontFamily: "var(--serif)", fontSize: 18, color: "var(--text)" }}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </section>

        {/* ── Bar chart ──────────────────────────────────────────────────── */}
        <Panel>
          <CostBars results={results} total={results.length} />
        </Panel>

        {/* ── Results table ──────────────────────────────────────────────── */}
        <section>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
            <div>
              <Kicker>Ranked by ACPI value score — price and quality combined</Kicker>
              <div
                style={{
                  fontFamily: "var(--serif)",
                  fontSize: 22,
                  color: "var(--text)",
                  letterSpacing: "-0.012em",
                }}
              >
                {selectedGroups.length ? "Selected models" : "Every tracked model"}
              </div>
            </div>
            <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--text3)" }}>
              {formatCount(results.length)} models
            </span>
          </div>
          <ResultsTable results={results} />
        </section>

        {/* ── ACPI reference footer ──────────────────────────────────────── */}
        <section
          style={{
            borderTop: "1px solid var(--border)",
            paddingTop: 24,
            display: "flex",
            gap: 40,
            flexWrap: "wrap",
            alignItems: "flex-start",
          }}
        >
          {data.acpi && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 200 }}>
              <Kicker>ACPI reference</Kicker>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontFamily: "var(--serif)", fontSize: 26, color: "var(--accent)" }}>
                  ${data.acpi.value.toFixed(4)}
                </span>
                <span style={{ fontSize: 10, color: "var(--text3)" }}>/ 1M SCU</span>
              </div>
              <div style={{ fontSize: 10, color: "var(--text3)", lineHeight: 1.6 }}>
                Broad-market index across {formatCount(data.acpi.model_count)} models,{" "}
                {data.acpi.provider_count} providers.
              </div>
              <Link href="/" style={{ fontSize: 10, color: "var(--accent)", textDecoration: "none" }}>
                See the index →
              </Link>
            </div>
          )}

          <div style={{ flex: 1, minWidth: 320 }}>
            <Kicker>What this estimate assumes</Kicker>
            <ul
              style={{
                margin: 0,
                paddingLeft: 16,
                fontSize: 11,
                color: "var(--text3)",
                lineHeight: 1.85,
              }}
            >
              <li>
                Each call splits {INPUT_SHARE * 100}% input / {OUTPUT_SHARE * 100}% output — the same
                3:1 blend the ACPI index uses.
              </li>
              <li>
                Prompt caching, when on, assumes {CACHED_INPUT_SHARE * 100}% of input repeats and
                bills cache reads at {CACHE_READ_MULTIPLIER * 100}% of list price. Real cache rates
                and TTLs vary by provider.
              </li>
              <li>
                List prices only — no committed-use discounts, batch rates, or negotiated pricing.
              </li>
              <li>
                Prices from the OpenRouter catalog, deduplicated to base models across major
                providers.
              </li>
              <li>
                Ranked by ACPI Score (P1, intelligence-per-dollar) where a model has published
                benchmark data — currently a minority of the catalog. Models without a score sort
                below the scored ones, cheapest first, since price is the only signal available
                for them.
              </li>
            </ul>
            {data.last_updated && (
              <div style={{ marginTop: 12, fontFamily: "var(--mono)", fontSize: 10, color: "var(--text3)" }}>
                Prices updated {data.last_updated}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
