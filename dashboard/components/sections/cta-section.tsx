import { AsciiCurtain, FOOTER_CURTAIN } from "@/components/ascii-curtain";
import { Button, H2, BODY } from "@/components/primitives";

/**
 * Closing CTA, backed by the quietest of the three curtains.
 *
 * Ported from data/tokenix-cta-footer.html. The mockup pins the band to a
 * fixed 300px, which was the one section with no relationship to any other
 * section's rhythm. It now runs on the shared scale with a min-height floor,
 * so it breathes with the rest of the page instead of standing still while
 * everything around it scales.
 *
 * Buttons use a 3px radius here, from the mockup. This is the one place the
 * shipped square-cornered system is departed from, because the CTA pair reads
 * as a unit and the mockup's shape is load-bearing for that.
 */
export function CtaSection() {
  return (
    <section
      style={{
        position: "relative",
        minHeight: 400,
        padding: "var(--space-section-lg) var(--pad-x)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        // borderTop: "1px solid var(--line)",
        borderBottom: "1px solid var(--line)",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", inset: 0 }}>
        <AsciiCurtain preset={FOOTER_CURTAIN} />
      </div>
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: "radial-gradient(ellipse 480px 220px at 50% 50%, rgba(7,7,10,0.3), rgba(7,7,10,0.5) 50%)",
        }}
      />

      <div style={{ position: "relative", zIndex: 2, textAlign: "center", padding: "0 24px" }}>
        <h2
          style={{ ...H2, marginBottom: 14, color: "var(--ink)" }}
        >
          Know the price before you pay it.
        </h2>
        <p style={{ ...BODY, color: "var(--ink-dim)", marginBottom: 26 }}>
          One line of code. Free to start.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Button href="/screener" variant="secondary">See the index</Button>
          <Button href="/dashboard/connect" variant="primary">Connect your stack</Button>
        </div>
      </div>
    </section>
  );
}
