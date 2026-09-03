import type { Metadata } from "next";

import { AppNav } from "@/components/app-nav";
import { HeadlineFact, HeadlineFigure } from "@/components/headline-figure";
import { loadAcpi } from "@/lib/data";
import { EmptyState } from "@/components/stat-card";
import { requireWorkspaceKey } from "@/lib/require-key";
import {
  ApiError,
  fetchBenchmark,
  fmtCompact,
  fmtPct,
  fmtUsd,
  shortModel,
} from "@/lib/tokenix-api";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Benchmark · Tokenix",
  description: "What you paid versus the ACPI market rate, model by model.",
};

const DAYS = 30;

/**
 * Over/under-market is a diverging encoding — the hardest case for dichromacy,
 * since red and green are exactly the pair that collapses.
 *
 * Validated against the dark surface #07070a. Method: Vienot 1999 dichromat
 * simulation (sRGB D65), difference reported as CIEDE2000.
 *   --red #f87171 7.27:1   --green #2dd4bf 10.81:1
 *   separation  dE00 63.4 normal / 27.2 deuteranope / 19.8 protanope
 *
 * --green is teal rather than a true green specifically to survive this test:
 * against #4ade80 the pair measured 7.1 deuteranope, worse than the 12.3 of the
 * light-surface pair (#c0392b/#2f8f5b) it replaced. Teal more than doubles the
 * margin over that baseline.
 *
 * Secondary encoding is retained regardless: every place a colour appears, an
 * explicit "Above/Below market" label and a signed number appear with it.
 * Colour is never the only carrier of the verdict.
 */
const ABOVE = "var(--red)";
const BELOW = "var(--green)";
const NEUTRAL = "var(--text3)";

/** Diverging bar: neutral midpoint, magnitude scaled against the worst case. */
function DivergingBar({ pct, max }: { pct: number | null; max: number }) {
  if (pct === null || max <= 0) {
    return <span style={{ color: NEUTRAL, fontFamily: "var(--mono)", fontSize: 11 }}>—</span>;
  }
  const half = Math.min(Math.abs(pct) / max, 1) * 50;
  const above = pct > 0;

  return (
    <div
      style={{
        position: "relative",
        width: 120,
        height: 8,
        background: "var(--s2)",
        marginLeft: "auto",
      }}
      aria-hidden="true"
    >
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: -2,
          width: 1,
          height: 12,
          background: "var(--border2)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          height: 8,
          background: above ? ABOVE : BELOW,
          left: above ? "50%" : `${50 - half}%`,
          width: `${half}%`,
        }}
      />
    </div>
  );
}

export default async function BenchmarkPage() {
  const key = await requireWorkspaceKey();
  // The headline market rate, from the index the gateway prices against.
  const acpiRate = loadAcpi()?.acpi ?? null;

  let data;
  try {
    data = await fetchBenchmark(key, DAYS);
  } catch (error) {
    return (
      <>
        <AppNav page="benchmark" connected />
        <section style={{ maxWidth: 1200, margin: "0 auto", padding: "var(--space-section-md) 48px" }}>
          <EmptyState
            title="Could not load the benchmark"
            body={
              error instanceof ApiError
                ? error.message
                : "The analytics API did not respond. Try again in a moment."
            }
          />
        </section>
      </>
    );
  }

  const worstPct = Math.max(
    ...data.models.map((m) => Math.abs(m.overpay_pct ?? 0)),
    1,
  );
  const overpaying = data.overpay_usd > 0;

  return (
    <>
      <AppNav page="benchmark" connected />

      <section
        className="app-wrap"
        style={{ maxWidth: 1200, margin: "0 auto", width: "100%", padding: "var(--space-section-sm) 48px var(--space-section-xs)" }}
      >
        <h1 className="sr-only">Benchmark</h1>
        <HeadlineFigure
          kicker="ACPI comparison"
          value={fmtUsd(Math.abs(data.overpay_usd))}
          caption={
            overpaying
              ? `Overpaid vs the market rate · last ${DAYS} days`
              : `Saved vs the market rate · last ${DAYS} days`
          }
          aside={
            <>
              <HeadlineFact tone={overpaying ? "up" : "down"}>
                {overpaying ? "↑" : "↓"} {fmtPct(data.overpay_pct)}{" "}
                {overpaying ? "above market" : "below market"}
              </HeadlineFact>
              <HeadlineFact>
                You paid {fmtUsd(data.total_cost_usd)} · market{" "}
                {fmtUsd(data.acpi_benchmark_usd)}
              </HeadlineFact>
              {acpiRate !== null && (
                <HeadlineFact>ACPI ${acpiRate.toFixed(4)} / 1M SCU</HeadlineFact>
              )}
            </>
          }
        />
        <p
          style={{
            fontSize: 12,
            color: "var(--text3)",
            lineHeight: 1.9,
            maxWidth: 660,
            marginTop: 22,
          }}
        >
          Every request you sent, repriced at the market-wide ACPI rate for the same token volume.
          The gap is what your model choices cost you relative to the market.
        </p>
      </section>

      {data.models.length === 0 ? (
        <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 48px 64px" }}>
          <EmptyState
            title="Nothing to benchmark yet"
            body="Once priced traffic flows through the gateway, this page compares it with the market rate model by model."
          />
        </section>
      ) : (
        <>
          {/* Headline ledger line */}
          <section
            className="app-wrap"
            style={{ maxWidth: 1200, margin: "0 auto", width: "100%", padding: "0 48px 40px" }}
          >
            <div
              className="bench-headline"
              style={{
                border: "1px solid var(--border)",
                background: "linear-gradient(180deg, var(--s1), transparent)",
                padding: "26px 30px",
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 30,
              }}
            >
              {[
                { label: "You paid", value: fmtUsd(data.total_cost_usd), color: "var(--text)" },
                {
                  label: "Market rate",
                  value: fmtUsd(data.acpi_benchmark_usd),
                  color: "var(--text)",
                },
                {
                  label: overpaying ? "Overpaid" : "Saved vs market",
                  value: fmtUsd(Math.abs(data.overpay_usd)),
                  color: overpaying ? ABOVE : BELOW,
                },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <div
                    style={{
                      fontSize: 9,
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      color: "var(--text3)",
                      marginBottom: 11,
                    }}
                  >
                    {label}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--serif)",
                      fontSize: 27,
                      fontWeight: 500,
                      color,
                      lineHeight: 1,
                    }}
                  >
                    {value}
                  </div>
                </div>
              ))}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--text3)",
                marginTop: 12,
                fontFamily: "var(--mono)",
              }}
            >
              {overpaying ? "▲ ABOVE MARKET" : "▼ BELOW MARKET"} · {fmtPct(data.overpay_pct)}{" "}
              versus the ACPI
            </div>
          </section>

          {/* Per-model table */}
          <section
            className="app-wrap"
            style={{ maxWidth: 1200, margin: "0 auto", width: "100%", padding: "0 48px 48px" }}
          >
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  borderTop: "1px solid var(--border)",
                }}
              >
                <thead>
                  <tr>
                    {["Model", "Tokens", "Actual", "ACPI rate", "Difference", "", "Status"].map(
                      (h, i) => (
                        <th
                          key={h + i}
                          scope="col"
                          style={{
                            textAlign: i === 0 ? "left" : i === 6 ? "left" : "right",
                            fontWeight: 400,
                            fontSize: 9,
                            letterSpacing: "0.16em",
                            textTransform: "uppercase",
                            color: "var(--text3)",
                            padding: "13px 16px",
                            borderBottom: "1px solid var(--border)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {data.models.map((m) => {
                    const above = m.status === "above_market";
                    const known = m.overpay_pct !== null;
                    return (
                      <tr key={m.model_id} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "14px 16px" }}>
                          <div
                            style={{
                              fontFamily: "var(--serif)",
                              fontSize: 15,
                              color: "var(--text)",
                            }}
                          >
                            {shortModel(m.model_id)}
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
                            {m.provider}
                            {m.acpi_score !== null && ` · P1 ${m.acpi_score.toFixed(1)}`}
                          </div>
                        </td>
                        <td style={numCell("var(--text2)")}>{fmtCompact(m.tokens)}</td>
                        <td style={numCell("var(--text)")}>{fmtUsd(m.cost_usd)}</td>
                        <td style={numCell("var(--text2)")}>{fmtUsd(m.acpi_bench_usd)}</td>
                        <td style={numCell("var(--text)")}>
                          {/* Signed number — readable without colour. */}
                          {m.overpay_usd > 0 ? "+" : ""}
                          {fmtUsd(m.overpay_usd)}
                          <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 3 }}>
                            {fmtPct(m.overpay_pct)}
                          </div>
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <DivergingBar pct={m.overpay_pct} max={worstPct} />
                        </td>
                        <td style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>
                          <span
                            style={{
                              fontFamily: "var(--mono)",
                              fontSize: 10,
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                              color: !known ? NEUTRAL : above ? ABOVE : BELOW,
                            }}
                          >
                            {!known ? "—" : above ? "▲ Above market" : "▼ Below market"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Savings opportunities */}
          {data.opportunities.length > 0 && (
            <section
              className="app-wrap"
              style={{ maxWidth: 1200, margin: "0 auto", width: "100%", padding: "0 48px 64px" }}
            >
              <div className="sec-kicker">Where the money is</div>
              <div
                style={{
                  fontFamily: "var(--serif)",
                  fontSize: 22,
                  fontWeight: 500,
                  color: "var(--text)",
                  marginBottom: 20,
                }}
              >
                Savings opportunities
              </div>
              <div className="app-cards">
                {data.opportunities.slice(0, 3).map((o) => (
                  <div
                    key={o.model_id}
                    style={{
                      border: "1px solid var(--border)",
                      background: "linear-gradient(180deg, var(--s1), transparent)",
                      padding: "20px 22px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: 18,
                      minHeight: 132,
                    }}
                  >
                    <div style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.85 }}>
                      {o.action}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--serif)",
                        fontSize: 24,
                        color: "var(--accent)",
                        whiteSpace: "nowrap",
                        lineHeight: 1,
                      }}
                    >
                      {fmtUsd(o.potential_saving_usd)}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}

function numCell(color: string): React.CSSProperties {
  return {
    padding: "14px 16px",
    textAlign: "right",
    fontFamily: "var(--mono)",
    fontSize: 13,
    color,
    whiteSpace: "nowrap",
  };
}
