import Link from "next/link";
import { AsciiCurtain, PANEL_CURTAIN } from "@/components/ascii-curtain";
import { Eyebrow } from "@/components/primitives";

/**
 * The problem statement plus the three-era timeline.
 *
 * Ported from data/tokenix-problem.html. Notes on the departures:
 *
 * - The mockup's rack panel lights units with Math.random(), which would
 *   produce a server/client hydration mismatch. Replaced with a fixed pattern
 *   that preserves the intended density (roughly 40% lit) and is stable.
 * - The stat bar's "332 models and 56 providers" was hardcoded; both now come
 *   from the live ACPI snapshot.
 * - The mockup carries a nav and CTA pill; nav belongs to <Header>, so only
 *   the section itself is ported.
 */

const LEDGER_ROWS = ["SERVER-COLO", "LICENSING", "BANDWIDTH", "STORAGE", "SUPPORT"];

/** Fixed lit-unit pattern, 4 columns x 6 units. Was Math.random() > 0.6. */
const RACK: readonly (readonly boolean[])[] = [
  [false, true, false, false, true, false],
  [true, false, false, true, false, true],
  [false, false, true, false, true, false],
  [true, false, true, false, false, true],
];

function TimelineColumn({
  era,
  title,
  now = false,
  ratio,
  children,
}: {
  era: string;
  title: string;
  now?: boolean;
  ratio: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="tl-col"
      style={{
        borderRight: "1px solid var(--line)",
        padding: "22px var(--pad-x) 0",
      }}
    >
      <div
        style={{
          fontFamily: "var(--mono)",
          fontSize: 11,
          letterSpacing: "0.06em",
          color: now ? "var(--amber-hot)" : "var(--ink-faint)",
          fontWeight: now ? 500 : 400,
          marginBottom: 10,
        }}
      >
        {era}
      </div>
      <div style={{ fontSize: 19, fontWeight: 500, marginBottom: 20, color: "var(--ink)" }}>
        {title}
      </div>
      <div
        style={{
          borderTop: "1px solid var(--line)",
          aspectRatio: ratio,
          position: "relative",
          overflow: "hidden",
          background: "#0a0a0c",
        }}
      >
        {children}
      </div>
    </div>
  );
}

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
        <span style={{ color: "var(--amber-hot)" }}>ACPI</span>
        &nbsp;recalculates hourly across {modelCount} models and {providerCount} providers — the
        reference rate nobody had before.
      </div>

      <section
        className="problem-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "220px 1fr",
          padding: "var(--space-section-md) var(--pad-x) var(--space-section-sm)",
        }}
      >
        <Eyebrow>PROBLEM</Eyebrow>
        <div>
          <h2
            style={{
              fontFamily: "var(--serif)",
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
      </section>

      <div className="timeline-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.6fr" }}>
        <TimelineColumn era="1990S – 2000S" title="IT Budgets" ratio="1 / 0.82">
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: 9,
              padding: "0 22px",
              opacity: 0.5,
            }}
          >
            {LEDGER_ROWS.map((r) => (
              <div
                key={r}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontFamily: "var(--mono)",
                  fontSize: 10.5,
                  color: "var(--ink-faint)",
                  borderBottom: "1px dashed rgba(255,255,255,0.05)",
                  paddingBottom: 8,
                }}
              >
                <span>{r}</span>
                <span>—</span>
              </div>
            ))}
          </div>
        </TimelineColumn>

        <TimelineColumn era="2010S – 2020S" title="Cloud Compute" ratio="1 / 0.82">
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 14,
              opacity: 0.55,
            }}
          >
            {RACK.map((col, ci) => (
              <div key={ci} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {col.map((on, ui) => (
                  <div
                    key={ui}
                    style={{
                      width: 30,
                      height: 6,
                      borderRadius: 1,
                      border: `1px solid ${on ? "var(--amber)" : "var(--ink-faint)"}`,
                      background: on ? "rgba(255,122,26,0.14)" : "transparent",
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </TimelineColumn>

        <TimelineColumn era="2025 ONWARDS" title="AI Inference" now ratio="1 / 1.05">
          <div style={{ position: "absolute", inset: 0 }}>
            <AsciiCurtain preset={PANEL_CURTAIN} />
          </div>
        </TimelineColumn>
      </div>
    </>
  );
}
