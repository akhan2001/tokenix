import Link from "next/link";
import { Container, H2, BODY, LINK, LABEL } from "@/components/primitives";

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
          ...LABEL,
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
        <Container
          className="problem-grid"
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "clamp(28px, 5vw, 72px)" }}
        >
          <h2 style={{ ...H2, color: "var(--ink)" }}>
            Compute is the largest new line item on the P&amp;L, and nobody can price it.
          </h2>
          <div>
          <p
            style={{ ...BODY, color: "var(--ink-dim)", marginBottom: 30 }}
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
              ...LINK,
              background: "var(--ink)",
              color: "#0a0b0d",
              padding: "12px 22px",
              borderRadius: 999,
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
