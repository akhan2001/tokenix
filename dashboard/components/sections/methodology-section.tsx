import Link from "next/link";
import { Container, H2, H3, BODY, BODY_SM, LINK, LABEL, DATA } from "@/components/primitives";

/**
 * How ACPI is priced — the three inputs and the formula.
 *
 * Ported from data/tokenix-methodology.html, with one correction that matters.
 *
 * The mockup prints the formula as
 *     ACPI(t) = Σ [ P_i(t) × Q_i × W_i ] / Σ W_i
 * which describes a single quality-weighted mean over all models. That is not
 * what scripts/acpi.py computes. The real index is a two-bucket average:
 * models split into premium (tier S/A) and commodity (tier B/C), each bucket
 * equal-weighted internally, then combined 50/50 so the cheap long tail pulls
 * on the index as hard as the frontier.
 *
 * Checked against the live snapshot rather than taken on trust:
 *   0.5 x 4.5392 + 0.5 x 4.9801 = 4.7597  vs published acpi 4.7596.
 * The published formula would not reproduce that number. Printing it on the
 * page that explains the methodology would have been a real inaccuracy, so the
 * accurate form is used here.
 *
 * The three icon slots are still placeholders in the source mockup. They are
 * ported as placeholders rather than filled with invented art.
 */

const STEPS = [
  {
    n: "01",
    slot: "pricing inputs",
    title: "1. Pricing Inputs",
    desc: (providers: number) =>
      `Live rates pulled hourly from ${providers} providers, public and metered.`,
  },
  {
    n: "02",
    slot: "quality adjustment",
    title: "2. Quality Adjustment",
    desc: () => "Each price is weighted against benchmark performance, not averaged flat.",
  },
  {
    n: "03",
    slot: "blending",
    title: "3. Blending",
    desc: (_p: number, models: number) =>
      `${models} models collapse into one reference number — the market rate.`,
  },
];

export function MethodologySection({
  modelCount,
  providerCount,
}: {
  modelCount: number;
  providerCount: number;
}) {
  return (
    <section
      id="methodology"
      style={{
        padding: "var(--space-section-lg) var(--pad-x)",
        borderTop: "1px solid var(--line)",
      }}
    >
      <Container>
        <div style={{ marginBottom: 48 }}>
          <div
            style={{
              display: "inline-flex",
              ...LABEL,
              color: "var(--ink-dim)",
              border: "1px solid var(--line-strong)",
              borderRadius: 4,
              padding: "5px 10px",
              marginBottom: 22,
            }}
          >
            METHODOLOGY
          </div>
          <h2
            style={{ ...H2, marginBottom: 18, color: "var(--ink)" }}
          >
            How ACPI is priced.
          </h2>
          <p
            style={{
              fontSize: 15,
              lineHeight: 1.65,
              color: "var(--ink-dim)",
              margin: 0,
              maxWidth: "54ch",
            }}
          >
            ACPI blends live pricing across every tracked model, weighted by benchmark-derived
            quality and split between frontier and commodity tiers — not a flat average of list
            prices.
          </p>
        </div>

        <div className="meth-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 22, marginBottom: 56 }}>
          {STEPS.map((s) => (
            <div key={s.n} style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  position: "relative",
                  aspectRatio: "1 / 1",
                  border: "1px dashed var(--line-strong)",
                  borderRadius: 10,
                  background: "var(--panel)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  marginBottom: 18,
                }}
              >
                <span
                  style={{
                    ...LABEL,
                    color: "var(--ink-faint)",
                    textAlign: "center",
                    lineHeight: 1.6,
                    padding: "0 16px",
                  }}
                >
                  <b style={{ color: "var(--ink-dim)", display: "block", fontSize: 12, marginBottom: 4 }}>
                    ICON {s.n}
                  </b>
                  {s.slot}
                </span>
              </div>
              <div style={{ ...H3, marginBottom: 8, color: "var(--ink)" }}>
                {s.title}
              </div>
              <p style={{ ...BODY_SM, color: "var(--ink-dim)" }}>
                {s.desc(providerCount, modelCount)}
              </p>
            </div>
          ))}
        </div>

        <div
          className="formula-strip"
          style={{
            border: "1px solid var(--line-strong)",
            borderRadius: 8,
            background: "#08080b",
            padding: "20px 26px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 24,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              ...DATA,
              fontSize: 13.5,
              color: "var(--ink)",
              whiteSpace: "nowrap",
              overflowX: "auto",
            }}
          >
            <span style={{ color: "var(--amber-hot)" }}>ACPI(t)</span>{" "}
            <span style={{ color: "var(--ink-faint)" }}>=</span> ½·⟨P⟩
            <span style={{ color: "var(--ink-faint)" }}>premium</span>{" "}
            <span style={{ color: "var(--ink-faint)" }}>+</span> ½·⟨P⟩
            <span style={{ color: "var(--ink-faint)" }}>commodity</span>
          </div>
          <Link
            href="/methodology"
            style={{
              ...LINK,
              color: "var(--amber-hot)",
              flexShrink: 0,
            }}
          >
            Read the full methodology <span aria-hidden>→</span>
          </Link>
        </div>
      </Container>
    </section>
  );
}
