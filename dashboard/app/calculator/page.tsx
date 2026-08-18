import type { Metadata } from "next";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { TokenCalculator } from "@/components/token-calculator";
import { WordCalculator } from "@/components/word-calculator";

export const metadata: Metadata = {
  title: "Token Cost Calculator · Tokenix",
  description:
    "Estimate what your AI workload costs across every major model and provider, priced from the live Tokenix feed.",
};

export default function CalculatorPage() {
  return (
    <div
      style={{
        background: "var(--bg)",
        color: "var(--text)",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Header page="calculator" />

      <main style={{ flex: 1 }}>
        {/* Page masthead — the calculator itself loads its own data client-side */}
        <section
          style={{
            padding: "44px 48px 0",
            borderBottom: "1px solid var(--border)",
          }}
          className="calc-wrap"
        >
          <div style={{ maxWidth: 1200, margin: "0 auto", paddingBottom: 34 }}>
            <div className="sec-kicker">Cost calculator</div>
            <h1
              style={{
                margin: 0,
                fontFamily: "var(--serif)",
                fontSize: 34,
                fontWeight: 500,
                letterSpacing: "-0.015em",
                color: "var(--text)",
                lineHeight: 1.2,
              }}
            >
              What your workload actually costs
            </h1>
            <p
              style={{
                margin: "14px 0 0",
                maxWidth: 620,
                fontSize: 13,
                lineHeight: 1.75,
                color: "var(--text2)",
              }}
            >
              Describe the workflow you run. Every major model is priced against it from the same
              live feed that computes the index — so the comparison moves when the market does.
            </p>
          </div>
        </section>

        {/* ── Word calculator — simple, no config, top of the page ────────── */}
        <section className="calc-wrap" style={{ padding: "36px 48px 0" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div className="sec-kicker">Quick estimate</div>
            <h2
              style={{
                margin: "0 0 20px",
                fontFamily: "var(--serif)",
                fontSize: 24,
                fontWeight: 500,
                letterSpacing: "-0.012em",
                color: "var(--text)",
              }}
            >
              Paste text, see what it costs
            </h2>
            <WordCalculator />
          </div>
        </section>

        {/* ── Divider ───────────────────────────────────────────────────── */}
        <div className="calc-wrap" style={{ padding: "40px 48px 0" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", borderTop: "1px solid var(--border)" }} />
        </div>

        {/* ── Workflow calculator — advanced, configurable ─────────────────── */}
        <section className="calc-wrap" style={{ padding: "36px 48px 0" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div className="sec-kicker">Full workflow</div>
            <h2
              style={{
                margin: 0,
                fontFamily: "var(--serif)",
                fontSize: 24,
                fontWeight: 500,
                letterSpacing: "-0.012em",
                color: "var(--text)",
              }}
            >
              Model a real workload
            </h2>
          </div>
        </section>

        <TokenCalculator />
      </main>

      <Footer />
    </div>
  );
}
