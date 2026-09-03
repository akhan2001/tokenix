import type { ReactNode } from "react";
import Link from "next/link";
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
 * 2. The mockup carries its own <nav>. The app has <Header>, so nav is a slot
 *    rather than a second implementation — the page passes its header in and it
 *    renders over the curtain.
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
  nav,
}: {
  acpi: AcpiData | null;
  history: AcpiHistoryPoint[];
  nav?: ReactNode;
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
        {nav}

        <div className="hero-main-row">
          <div style={{ maxWidth: 460 }}>
            <div style={{ width: 64, height: 1, background: "var(--line)", marginBottom: 26 }} />
            <h1
              style={{
                fontFamily: "var(--serif)",
                fontWeight: 300,
                fontSize: "clamp(40px, 5.2vw, 72px)",
                lineHeight: 1.04,
                letterSpacing: "0.002em",
                margin: "0 0 30px",
                color: "var(--ink)",
              }}
            >
              The price of
              <br />
              intelligence.
            </h1>
            <Link
              href="/connect"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                color: "var(--ink-dim)",
                textDecoration: "none",
                fontFamily: "var(--mono)",
                fontSize: 12.5,
                letterSpacing: "0.03em",
                borderTop: "1px solid var(--line)",
                paddingTop: 16,
              }}
            >
              Talk to our team <span aria-hidden>→</span>
            </Link>
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
                fontFamily: "var(--mono)",
                fontSize: 12,
                letterSpacing: "0.06em",
                color: "var(--ink-dim)",
                marginBottom: 6,
              }}
            >
              ACPI · AI COMPUTE PRICE INDEX
            </div>
            <div
              style={{
                fontFamily: "var(--mono)",
                fontSize: 11,
                letterSpacing: "0.04em",
                color: "var(--ink-dim)",
                opacity: 0.7,
                marginBottom: 22,
              }}
            >
              {acpi ? formatUtc(acpi.computed_at) : " "}
            </div>
            <div
              style={{
                fontFamily: "var(--serif)",
                fontWeight: 300,
                fontSize: "clamp(52px, 6.4vw, 88px)",
                lineHeight: 1,
                letterSpacing: "-0.01em",
                marginBottom: 14,
                color: "var(--ink)",
              }}
            >
              {value !== null ? `$${value.toFixed(2)}` : "—"}
            </div>
            <div
              style={{
                fontFamily: "var(--mono)",
                fontSize: 12,
                letterSpacing: "0.06em",
                color: "var(--ink-dim)",
                marginBottom: 10,
              }}
            >
              PER 1M BLENDED TOKENS
            </div>
            <div
              style={{
                fontFamily: "var(--mono)",
                fontSize: 13,
                letterSpacing: "0.02em",
                color: toneColor,
              }}
            >
              {change === null
                ? "— · AWAITING 24H HISTORY"
                : `${tone === "up" ? "▲" : "▼"} ${Math.abs(change).toFixed(2)}% · 24H`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
