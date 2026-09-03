import Link from "next/link";
import { AsciiCurtain, FOOTER_CURTAIN } from "@/components/ascii-curtain";

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
        minHeight: 300,
        padding: "var(--space-section-md) 0",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderTop: "1px solid var(--line)",
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
          background:
            "radial-gradient(ellipse 480px 220px at 50% 50%, rgba(7,7,10,0.7), rgba(7,7,10,0.92) 70%)",
        }}
      />

      <div style={{ position: "relative", zIndex: 2, textAlign: "center", padding: "0 24px" }}>
        <h2
          style={{
            fontFamily: "var(--sans)",
            fontWeight: 200,
            fontSize: "clamp(28px, 3.6vw, 42px)",
            letterSpacing: "-0.005em",
            margin: "0 0 14px",
            color: "var(--ink)",
          }}
        >
          Know the price before you pay it.
        </h2>
        <p style={{ fontSize: 15, color: "var(--ink-dim)", margin: "0 0 26px" }}>
          One line of code. Free to start.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            href="/screener"
            style={{
              fontFamily: "var(--sans)",
              fontSize: 14.5,
              fontWeight: 500,
              padding: "12px 22px",
              borderRadius: 3,
              textDecoration: "none",
              display: "inline-block",
              background: "transparent",
              color: "var(--ink)",
              border: "1px solid var(--line)",
            }}
          >
            See the index
          </Link>
          <Link
            href="/connect"
            style={{
              fontFamily: "var(--sans)",
              fontSize: 14.5,
              fontWeight: 500,
              padding: "12px 22px",
              borderRadius: 3,
              textDecoration: "none",
              display: "inline-block",
              background: "var(--amber)",
              color: "#0a0b0d",
            }}
          >
            Connect your stack
          </Link>
        </div>
      </div>
    </section>
  );
}
