import { Button, Container, DISPLAY, FIGURE, LABEL } from "@/components/primitives";
import { AsciiCurtain, HERO_CURTAIN } from "@/components/ascii-curtain";
import type { AcpiData, AcpiHistoryPoint } from "@/lib/data";

/**
 * Full-bleed hero: the ACPI quote read against the ASCII curtain.
 *
 * Ported from data/tokenix-hero.html. Two deliberate departures from that file:
 *
 * 1. The mockup renders the 24h delta as a green triangle. ACPI is a *cost*
 *    index, and headline-figure.tsx already establishes up = --red / down =
 *    --green across the app. Rising compute prices are not good news, so the
 *    shipped convention wins over the mockup's colouring.
 * 2. The mockup carries its own <nav>. The app has a sticky <Header>, which
 *    stays at page level: nesting it here double-padded it (its own --pad-x
 *    inside this section's) and confined position:sticky to a 100vh block, so
 *    the nav scrolled away. Persistent nav beats the overlay effect.
 *
 * Values are real: $4.99 and "1.42%" in the mockup were placeholders.
 */

function formatUtc(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const day = d.getUTCDate().toString().padStart(2, "0");
  const mon = d.toLocaleString("en-US", { month: "short", timeZone: "UTC" }).toUpperCase();
  const hh = d.getUTCHours() % 12 || 12;
  const mm = d.getUTCMinutes().toString().padStart(2, "0");
  const ap = d.getUTCHours() >= 12 ? "PM" : "AM";
  return `< ${day} ${mon}, ${hh.toString().padStart(2, "0")}:${mm} ${ap} UTC >`;
}

/** 24h change from the append-only history log, or null when history is too short. */
function delta24h(history: AcpiHistoryPoint[], current: number): number | null {
  if (!history.length) return null;
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const prior = [...history]
    .reverse()
    .find((p) => new Date(p.timestamp).getTime() <= cutoff);
  const base = prior?.acpi ?? history[0]?.acpi;
  if (!base || base === current) return null;
  return ((current - base) / base) * 100;
}

export function HeroSection({
  acpi,
  history,
}: {
  acpi: AcpiData | null;
  history: AcpiHistoryPoint[];
}) {
  const value = acpi?.acpi ?? null;
  const change = value !== null ? delta24h(history, value) : null;
  const tone = change === null ? "flat" : change > 0 ? "up" : "down";
  const toneColor =
    tone === "up" ? "var(--red)" : tone === "down" ? "var(--green)" : "var(--text2)";

  return (
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
        overflow: "hidden",
        background: "var(--bg)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ position: "absolute", inset: 0 }}>
        <AsciiCurtain preset={HERO_CURTAIN} />
      </div>

      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "linear-gradient(180deg, rgba(7,7,10,0.35) 0%, rgba(7,7,10,0) 18%, rgba(7,7,10,0) 78%, rgba(7,7,10,0.5) 100%)",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 3,
          display: "flex",
          flexDirection: "column",
          gap: "clamp(28px, 6vh, 56px)",
          padding: "var(--space-section-sm) var(--pad-x)",
          flex: 1,
        }}
      >
        <Container style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <div className="hero-main-row">
          <div style={{ maxWidth: 460 }}>
            <div style={{ width: 64, height: 1, background: "var(--line)", marginBottom: 26 }} />
            <h1
              style={{ ...DISPLAY, marginBottom: 30, color: "var(--ink)" }}
            >
              The price of
              <br />
              intelligence.
            </h1>
            <Button
              href="/connect"
              variant="text"
              style={{ borderTop: "1px solid var(--line)", paddingTop: 16, color: "var(--ink-dim)" }}
            >
              Talk to our team
            </Button>
          </div>

          <div className="hero-quote" style={{ textAlign: "right", flexShrink: 0 }}>
            <div
              style={{
                width: 64,
                height: 1,
                background: "var(--line)",
                marginLeft: "auto",
                marginBottom: 20,
              }}
            />
            <div
              style={{
                ...LABEL,
                color: "var(--ink-dim)",
                marginBottom: 6,
              }}
            >
              ACPI · AI COMPUTE PRICE INDEX
            </div>
            <div
              style={{
                ...LABEL,
                color: "var(--ink-dim)",
                opacity: 0.7,
                marginBottom: 22,
              }}
            >
              {acpi ? formatUtc(acpi.computed_at) : " "}
            </div>
            <div
              style={{
                ...FIGURE,
                marginBottom: 14,
                color: "var(--ink)",
              }}
            >
              {value !== null ? `$${value.toFixed(2)}` : "—"}
            </div>
            <div
              style={{
                ...LABEL,
                color: "var(--ink-dim)",
                marginBottom: 10,
              }}
            >
              PER 1M BLENDED TOKENS
            </div>
            <div
              style={{
                ...LABEL,
                color: toneColor,
              }}
            >
              {change === null
                ? "— · AWAITING 24H HISTORY"
                : `${tone === "up" ? "▲" : "▼"} ${Math.abs(change).toFixed(2)}% · 24H`}
            </div>
          </div>
        </div>
        </Container>
      </div>
    </div>
  );
}
