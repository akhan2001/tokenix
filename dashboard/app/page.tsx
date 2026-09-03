import { loadPrices, loadAcpi, loadAcpiHistory } from "@/lib/data";
import { Header } from "@/components/header";
import { HeroSection } from "@/components/sections/hero-section";
import { ProblemSection } from "@/components/sections/problem-section";
import { MethodologySection } from "@/components/sections/methodology-section";
import { Footer } from "@/components/footer";
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

/* Tier badge colours — see components/price-table.tsx for the validation
   method and figures. Tokens, so the two call sites cannot drift apart. */
const TIER_COLORS: Record<string, string> = {
  S: "var(--tier-s)",
  A: "var(--tier-a)",
  B: "var(--tier-b)",
  C: "var(--tier-c)",
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
      {/* ── HERO ─────────────────────────────────────────────── */}
      <HeroSection acpi={acpiData} history={acpiHistory} nav={<Header page="index" />} />

      {/* ── PROBLEM ──────────────────────────────────────────── */}
      <ProblemSection
        modelCount={acpiData?.model_count ?? rows.length}
        providerCount={acpiData?.provider_count ?? providerCount}
      />

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
                  fontFamily: "var(--sans)",
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
          padding: "var(--space-section-md) 48px",
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
                fontFamily: "var(--sans)",
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
                        fontFamily: "var(--sans)",
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
                fontFamily: "var(--sans)",
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
      <MethodologySection
        modelCount={acpiData?.model_count ?? rows.length}
        providerCount={acpiData?.provider_count ?? providerCount}
      />

      <Footer />
    </div>
  );
}
