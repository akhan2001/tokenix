import type { Metadata } from "next";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { TokenCalculator } from "@/components/token-calculator";

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
            padding: "var(--space-section-sm) 48px 0",
            borderBottom: "1px solid var(--border)",
          }}
          className="calc-wrap"
        >
          <div style={{ maxWidth: 1200, margin: "0 auto", paddingBottom: 34 }}>
            <div className="sec-kicker">Cost calculator</div>
            <h1
              style={{
                margin: 0,
                fontFamily: "var(--sans)",
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

        <TokenCalculator />
      </main>

      <Footer />
    </div>
  );
}
