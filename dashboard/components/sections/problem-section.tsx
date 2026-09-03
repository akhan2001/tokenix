import Link from "next/link";
import { Container, Eyebrow } from "@/components/primitives";

/**
 * The problem statement.
 *
 * The mockup's three-era timeline (IT Budgets / Cloud Compute / AI Inference)
 * was ported here and has since been cut as redundant. The eyebrow, headline,
 * body copy and CTA are what remain.
 *
 * Ported from data/tokenix-problem.html. Notes on the departures:
 *

 * - The stat bar's "332 models and 56 providers" was hardcoded; both now come
 *   from the live ACPI snapshot.
 * - The mockup carries a nav and CTA pill; nav belongs to <Header>, so only
 *   the section itself is ported.
 */

export function ProblemSection({
  modelCount,
  providerCount,
}: {
  modelCount: number;
  providerCount: number;
}) {
  return (
    <>
      <div
        style={{
          padding: "10px var(--pad-x)",
          borderBottom: "1px solid var(--line)",
          fontFamily: "var(--mono)",
          fontSize: 11.5,
          letterSpacing: "0.03em",
          color: "var(--ink-dim)",
        }}
      >
        <Container>
          <span style={{ color: "var(--amber-hot)" }}>ACPI</span>
          &nbsp;recalculates hourly across {modelCount} models and {providerCount} providers — the
          reference rate nobody had before.
        </Container>
      </div>

      <section style={{ padding: "var(--space-section-lg) var(--pad-x)" }}>
        <Container className="problem-grid" style={{ display: "grid", gridTemplateColumns: "220px 1fr" }}>
        <Eyebrow>PROBLEM</Eyebrow>
        <div>
          <h2
            style={{
              fontFamily: "var(--sans)",
              fontWeight: 300,
              fontSize: "clamp(28px, 3.1vw, 42px)",
              lineHeight: 1.28,
              letterSpacing: "-0.005em",
              margin: "0 0 26px",
              maxWidth: "22ch",
              color: "var(--ink)",
            }}
          >
            Compute is the largest new line item on the P&amp;L, and nobody can price it.
          </h2>
          <p
            style={{
              fontSize: 16,
              lineHeight: 1.65,
              color: "var(--ink-dim)",
              maxWidth: "58ch",
              margin: "0 0 30px",
            }}
          >
            AI inference spend is rising faster than any team can track. There&apos;s no benchmark
            to check an invoice against, no reference rate to negotiate a contract from, and no way
            to forecast next quarter&apos;s bill.{" "}
            <strong style={{ color: "var(--ink)", fontWeight: 500 }}>
              Engineers can&apos;t tell you if the model is worth the price. Finance can&apos;t tell
              you if the price is fair.
            </strong>
          </p>
          <Link
            href="/#methodology"
            style={{
              display: "inline-block",
              background: "var(--ink)",
              color: "#0a0b0d",
              fontSize: 14.5,
              fontWeight: 500,
              padding: "12px 22px",
              borderRadius: 999,
              textDecoration: "none",
            }}
          >
            See how ACPI works
          </Link>
        </div>
        </Container>
      </section>

    </>
  );
}
