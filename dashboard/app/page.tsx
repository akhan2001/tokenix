import { loadPrices, loadAcpi, loadAcpiHistory } from "@/lib/data";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { AcpiHeroCard } from "@/components/acpi-hero-card";
import { AcpiChart } from "@/components/acpi-chart";

export const dynamic = "force-dynamic";

function fmtPrice(n: number): string {
  if (n >= 1000) return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (n >= 1) return "$" + n.toFixed(2);
  if (n >= 0.01) return "$" + n.toFixed(3);
  return "$" + n.toFixed(4);
}

function getTier(inp: number) {
  if (inp >= 10) return "S";
  if (inp >= 1) return "A";
  if (inp >= 0.1) return "B";
  return "C";
}

const TIER_COLORS: Record<string, string> = {
  S: "#c8a96e",
  A: "#6e9fc8",
  B: "#4caf7d",
  C: "#8a96a8",
};

export default function Home() {
  const rows = loadPrices();
  const acpiData = loadAcpi();
  const acpiHistory = loadAcpiHistory();

  // ── Stats from real data ──────────────────────────────────────
  const withInput = rows.filter((r) => r.input_per_million_usd > 0);
  const sortedInp = [...withInput].sort((a, b) => a.input_per_million_usd - b.input_per_million_usd);
  const p99idx = Math.floor(sortedInp.length * 0.99);
  const trimmed = sortedInp.slice(0, p99idx);

  const minInput = withInput.length ? sortedInp[0].input_per_million_usd : 0;
  const maxInput = withInput.length ? sortedInp[sortedInp.length - 1].input_per_million_usd : 0;
  const medianInput = trimmed.length ? trimmed[Math.floor(trimmed.length / 2)].input_per_million_usd : 0;
  const providerCount = new Set(rows.map((r) => r.provider).filter(Boolean)).size;
  const modelCount = rows.length;

  // ── Top constituents: highest-priced models (frontier/flagship) ─
  const constituents = [...withInput]
    .sort((a, b) => b.input_per_million_usd - a.input_per_million_usd)
    .slice(0, 6);

  // ── Stat strip items ──────────────────────────────────────────
  const stats = [
    { label: "Cheapest input",    value: fmtPrice(minInput),    sub: "lowest available model",       cls: "gold" },
    { label: "Median input",      value: fmtPrice(medianInput), sub: `across ${modelCount.toLocaleString()} models`, cls: "" },
    { label: "Most expensive",    value: fmtPrice(maxInput),    sub: "highest listed",               cls: "" },
    { label: "Total models",      value: modelCount.toLocaleString(), sub: "in the live screener",   cls: "gold" },
    { label: "Providers",         value: String(providerCount), sub: "companies tracked",            cls: "" },
  ];

  return (
    <div style={{ background: "var(--bg)", color: "var(--text)", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header page="index" />

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section
        className="home-hero"
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          width: "100%",
          padding: "78px 48px 64px",
          display: "grid",
          gridTemplateColumns: "1.05fr 0.95fr",
          gap: 64,
          alignItems: "center",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10,
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: "var(--accent)",
              marginBottom: 22,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <span style={{ width: 28, height: 1, background: "var(--accent-dim)", display: "inline-block", flexShrink: 0 }} />
            World&apos;s first · AI Compute Price Index
          </div>
          <h1
            style={{
              fontFamily: "var(--serif)",
              fontSize: "clamp(36px, 4.4vw, 60px)",
              fontWeight: 500,
              lineHeight: 1.16,
              letterSpacing: "-0.012em",
              color: "var(--text)",
              marginBottom: 24,
              margin: "0 0 24px",
            }}
          >
            The standard measure
            <br />
            of{" "}
            <em style={{ fontStyle: "italic", color: "var(--accent)" }}>
              AI compute
            </em>{" "}
            value
          </h1>
          <p
            style={{
              fontSize: 13,
              color: "var(--text2)",
              lineHeight: 1.95,
              maxWidth: 440,
              marginBottom: 30,
            }}
          >
            Tokenix tracks what one unit of AI intelligence actually costs —
            quality-adjusted and risk-adjusted — across every major model and
            provider in the market. One number, updated daily.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <a href="/screener" className="btn-primary">
              Explore the screener <span>→</span>
            </a>
            <a href="#methodology" className="btn-text">
              Read methodology <span className="arr">↓</span>
            </a>
          </div>
        </div>

        {/* Hero right: ACPI card — passes real computed value when available */}
        <AcpiHeroCard acpi={acpiData} />
      </section>

      {/* ── CHART ─────────────────────────────────────────────── */}
      <AcpiChart history={acpiHistory} modelCount={acpiData?.model_count} />

      {/* ── STATS STRIP ───────────────────────────────────────── */}
      <section
        className="home-stats"
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          width: "100%",
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        {stats.map((s, i) => (
          <div
            key={s.label}
            className="stat"
            style={{
              padding: "30px 0",
              borderRight: i < stats.length - 1 ? "1px solid var(--border)" : "none",
            }}
          >
            <div style={{ padding: `0 ${i === 0 ? "48px" : "28px"} 0 ${i === 0 ? "48px" : "28px"}` }}>
              <div
                style={{
                  fontSize: 9,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "var(--text3)",
                  marginBottom: 12,
                }}
              >
                {s.label}
              </div>
              <div
                style={{
                  fontFamily: "var(--serif)",
                  fontSize: 24,
                  fontWeight: 500,
                  color: s.cls === "gold" ? "var(--accent)" : "var(--text)",
                  lineHeight: 1,
                  marginBottom: 8,
                }}
              >
                {s.value}
              </div>
              <div style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.5 }}>
                {s.sub}
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* ── CONSTITUENTS ─────────────────────────────────────── */}
      <section
        className="home-const-sec"
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          width: "100%",
          padding: "60px 48px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginBottom: 8,
          }}
        >
          <div>
            <div className="sec-kicker">Inside the basket</div>
            <div
              style={{
                fontFamily: "var(--serif)",
                fontSize: 26,
                fontWeight: 500,
                color: "var(--text)",
                letterSpacing: "-0.01em",
              }}
            >
              Index constituents
            </div>
          </div>
        </div>
        <p
          style={{
            fontSize: 11,
            color: "var(--text3)",
            marginBottom: 26,
            maxWidth: 560,
            lineHeight: 1.8,
          }}
        >
          The master index is a broad-market average of every model we track —
          frontier flagships and the commodity long tail weighted 50/50, so the
          cheaper half of the market counts as much as the frontier. A
          selection of high-weight constituents is shown below —
          the full set of{" "}
          <strong style={{ color: "var(--text2)" }}>
            {modelCount.toLocaleString()} endpoints
          </strong>{" "}
          is available in the live screener.
        </p>

        {/* Constituents table */}
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            borderTop: "1px solid var(--border)",
          }}
        >
          <thead>
            <tr>
              {["Model", "Tier", "Input /1M", "Output /1M"].map((h, i) => (
                <th
                  key={h}
                  style={{
                    textAlign: i >= 2 ? "right" : "left",
                    fontWeight: 400,
                    fontSize: 9,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    color: "var(--text3)",
                    padding: "13px 16px",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {constituents.map((row, idx) => {
              const tier = getTier(row.input_per_million_usd);
              const tierColor = TIER_COLORS[tier];
              return (
                <tr
                  key={`${row.model_id}-${idx}`}
                  className="const-row"
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  <td style={{ padding: "15px 16px", verticalAlign: "middle" }}>
                    <div
                      style={{
                        fontFamily: "var(--serif)",
                        fontSize: 15,
                        color: "var(--text)",
                        fontWeight: 500,
                      }}
                    >
                      {row.model_name.replace(/^[A-Za-z][A-Za-z0-9 ]+:\s*/, "")}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "var(--text3)",
                        marginTop: 2,
                      }}
                    >
                      {row.provider}
                    </div>
                  </td>
                  <td style={{ padding: "15px 16px", verticalAlign: "middle" }}>
                    <span
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: 11,
                        color: tierColor,
                        border: `1px solid ${tierColor}40`,
                        padding: "2px 7px",
                      }}
                    >
                      {tier}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "15px 16px",
                      textAlign: "right",
                      fontFamily: "var(--mono)",
                      color: "var(--text)",
                      fontSize: 13,
                      verticalAlign: "middle",
                    }}
                  >
                    {fmtPrice(row.input_per_million_usd)}
                  </td>
                  <td
                    style={{
                      padding: "15px 16px",
                      textAlign: "right",
                      fontFamily: "var(--mono)",
                      color: "var(--text2)",
                      fontSize: 13,
                      verticalAlign: "middle",
                    }}
                  >
                    {fmtPrice(row.output_per_million_usd)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* CTA to screener */}
        <a
          href="/screener"
          className="const-cta"
          style={{
            marginTop: 32,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            border: "1px solid var(--border)",
            padding: "22px 28px",
            background: "linear-gradient(180deg, var(--s1), transparent)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div
              style={{
                fontFamily: "var(--serif)",
                fontSize: 18,
                color: "var(--text)",
              }}
            >
              Open the live screener
            </div>
            <div style={{ fontSize: 11, color: "var(--text3)", letterSpacing: "0.04em" }}>
              {modelCount.toLocaleString()} models · {providerCount} providers · sortable, filterable
            </div>
          </div>
          <span className="btn-primary" style={{ whiteSpace: "nowrap" }}>
            Enter terminal <span>→</span>
          </span>
        </a>
      </section>

      {/* ── METHODOLOGY ──────────────────────────────────────── */}
      <section
        id="methodology"
        className="home-meth"
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          width: "100%",
          padding: "56px 48px",
          borderBottom: "1px solid var(--border)",
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 48,
        }}
      >
        {[
          {
            num: "01",
            title: "What is ACPI?",
            paras: [
              "The AI Compute Price Index is a quality-adjusted, risk-adjusted measure of what one unit of AI intelligence costs across the market — expressed as a single number in dollars per 1M Standard Compute Units.",
              "Like the Consumer Price Index tracks a basket of goods, ACPI tracks a basket of AI compute. When the number falls, AI is getting cheaper. When it rises, something in the market is tightening.",
            ],
          },
          {
            num: "02",
            title: "How it is calculated",
            paras: [
              "Every model is converted to a common unit — cost per 1M tokens — regardless of modality. Text, voice, image, video and GPU cloud pricing are all normalised to this single scale.",
              "Each model's per-token cost is blended 75% input / 25% output — the standard 3:1 usage assumption — and carries a market-risk factor reflecting the concentration and stability of the provider landscape. The master ACPI is a two-bucket broad-market average: models split into a premium bucket (frontier flagships) and a commodity bucket (the long tail), each averaged on its own, then combined 50/50 so the cheaper half of the market pulls on the index as hard as the frontier — a true market measure rather than a frontier price tag. Tier assignment is a disclosed manual classification, reviewed monthly.",
              "Quality is computed from a HELM-aligned benchmark composite (MMLU, coding, math, reasoning), sourced via standardized leaderboard aggregation and z-score normalised. It powers the intelligence-per-dollar screener (P1). Models without available benchmark data are excluded from that screener but remain in the published ACPI price index.",
            ],
          },
          {
            num: "03",
            title: "Data sources",
            paras: [
              `Benchmarks: HELM-aligned composite (MMLU, coding, math, reasoning) via standardized leaderboard aggregation. Token pricing: provider documentation, verified daily. GPU pricing: Lambda Labs H100 SXM5 market median. Throughput: Hyperstack vLLM benchmark, Llama 3.1 70B.`,
              "Market-health signal from provider ARR estimates, API accessibility and funding stability. Full methodology at tokenixindex.com/methodology.",
            ],
          },
        ].map(({ num, title, paras }) => (
          <div key={num}>
            <div
              style={{
                fontFamily: "var(--serif)",
                fontSize: 13,
                color: "var(--accent)",
                marginBottom: 14,
              }}
            >
              {num}
            </div>
            <h3
              style={{
                fontFamily: "var(--serif)",
                fontSize: 18,
                fontWeight: 500,
                color: "var(--text)",
                marginBottom: 14,
                paddingBottom: 12,
                borderBottom: "1px solid var(--border)",
              }}
            >
              {title}
            </h3>
            {paras.map((p, i) => (
              <p
                key={i}
                style={{
                  fontSize: 12,
                  color: "var(--text2)",
                  lineHeight: 1.95,
                  marginTop: i > 0 ? 12 : 0,
                }}
              >
                {p}
              </p>
            ))}
          </div>
        ))}
      </section>

      <Footer />
    </div>
  );
}
