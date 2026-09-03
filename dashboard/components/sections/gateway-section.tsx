"use client";

import { useMemo, useState } from "react";
import { Button, Container, H2, BODY, LABEL, LABEL_SM, FIGURE_SM, DATA } from "@/components/primitives";

/**
 * Landing-page teaser for the gateway: what a month costs at the ACPI market
 * rate, against what the same workload costs on named frontier models.
 *
 * Ported from data/tokenix-gateway.html. Like the index teaser, it does not
 * recreate the real thing — components/token-calculator.tsx is the full
 * calculator and /connect is the real onboarding. This links out to both.
 *
 * The mockup's headline claim, "down 47% vs frontier-only pricing", is not
 * reproducible from the data. Against the mean of the ten most expensive
 * tracked models the real figure is 92.7%, and that number is dragged by a
 * single outlier (o1-pro at $262.50 blended). Against the premium bucket mean
 * it is negative, since premium_mean (4.5392) sits below ACPI (4.7596).
 *
 * So no percentage is invented. The comparison is named models at their real
 * blended rates, which is attributable and needs no framing.
 */

export type ComparisonModel = { name: string; blended: number };

/** Log slider position -> tokens/month, 100K at 0 to 1B at 1. */
function positionToTokens(p: number): number {
  const min = Math.log10(100_000);
  const max = Math.log10(1_000_000_000);
  return Math.pow(10, min + (max - min) * p);
}

function fmtTokens(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(n >= 1e10 ? 0 : 1)}B tokens/mo`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M tokens/mo`;
  return `${Math.round(n / 1e3)}K tokens/mo`;
}

function fmtUsd(n: number): string {
  if (n >= 1000) return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (n >= 1) return "$" + n.toFixed(2);
  return "$" + n.toFixed(3);
}

/** Deterministic bar heights — a waveform motif, not data. */
const BARS = Array.from({ length: 48 }, (_, i) =>
  Math.round(28 + 46 * Math.abs(Math.sin(i * 0.7) * Math.cos(i * 0.23))),
);

export function GatewaySection({
  acpiRate,
  comparisons,
}: {
  acpiRate: number;
  comparisons: ComparisonModel[];
}) {
  const [pos, setPos] = useState(0.5);
  const tokens = useMemo(() => positionToTokens(pos), [pos]);
  const millions = tokens / 1_000_000;
  const spend = millions * acpiRate;
  const litBars = Math.round(pos * BARS.length);

  return (
    <section
      id="gateway"
      style={{
        padding: "var(--space-section-lg) var(--pad-x)",
        // borderTop: "1px solid var(--line)",
      }}
    >
      <Container>
      <div style={{ maxWidth: 640, marginBottom: 44 }}>
        <h2
          style={{ ...H2, marginBottom: 20, color: "var(--ink)" }}
        >
          Price it before you spend it.
        </h2>
        <p style={{ ...BODY, color: "var(--ink-dim)", marginBottom: 14 }}>
          Route through the gateway and every request is benchmarked against ACPI in real time — no
          blended contract to renegotiate, no dashboard that only shows the damage after the invoice
          lands.
        </p>
        <p style={{ ...BODY, color: "var(--ink-dim)", marginBottom: 14 }}>
          One line of code. No per-model SKUs, no annual commit to unlock visibility, no waiting on
          finance to reconcile the bill.
        </p>
        <Button href="/dashboard/connect" variant="text" style={{ marginTop: 10 }}>Connect your stack</Button>
      </div>

      <div
        style={{
          border: "1px solid var(--line-strong)",
          borderRadius: "var(--radius-panel)",
          background: "var(--panel)",
          overflow: "hidden",
        }}
      >
        <div
          className="gw-top"
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: "clamp(24px, 4vw, 56px)",
            padding: "30px clamp(20px,3vw,40px) 10px",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: "inline-flex",
                ...LABEL,
                color: "var(--ink)",
                border: "1px solid var(--line-strong)",
                borderRadius: "var(--radius-control)",
                padding: "5px 12px",
                marginBottom: 18,
              }}
            >
              {fmtTokens(tokens)}
            </div>

            <div
              aria-hidden
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: 3,
                height: 78,
                marginBottom: 14,
              }}
            >
              {BARS.map((h, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: `${h}%`,
                    borderRadius: 1,
                    background: i < litBars ? "var(--amber)" : "var(--line-strong)",
                    opacity: i < litBars ? 0.85 : 0.35,
                  }}
                />
              ))}
            </div>

            <input
              type="range"
              min={0}
              max={1}
              step={0.001}
              value={pos}
              onChange={(e) => setPos(Number(e.target.value))}
              aria-label="Monthly tokens"
              style={{ width: "100%", accentColor: "var(--amber)" }}
            />

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                ...LABEL_SM,
                color: "var(--ink-faint)",
                marginTop: 6,
              }}
            >
              <span>100K</span>
              <span>1M</span>
              <span style={{ letterSpacing: "0.08em" }}>TOKENS / MONTH</span>
              <span>100M</span>
              <span>1B</span>
            </div>
          </div>

          <div className="gw-price" style={{ flexShrink: 0, textAlign: "right" }}>
            <div
              style={{
                ...LABEL_SM,
                color: "var(--ink-dim)",
                marginBottom: 8,
              }}
            >
              Estimated spend
            </div>
            <div
              style={{
                ...FIGURE_SM,
                color: "var(--ink)",
                marginBottom: 8,
              }}
            >
              {fmtUsd(spend)}
            </div>
            <div style={{ ...LABEL, color: "var(--ink-faint)" }}>
              at the ACPI market rate · {fmtUsd(acpiRate)}/1M blended
            </div>
          </div>
        </div>

        <div
          style={{
            borderTop: "1px solid var(--line)",
            padding: "26px clamp(20px,3vw,40px) 34px",
          }}
        >
          <div
            style={{
              ...LABEL_SM,
              color: "var(--ink-faint)",
              marginBottom: 16,
            }}
          >
            WHAT YOU&apos;D PAY ELSEWHERE · SAME WORKLOAD, UNOPTIMIZED
          </div>
          {comparisons.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--ink-faint)" }}>
              Comparison rates are unavailable — the hourly snapshot has not been written yet.
            </div>
          ) : (
            comparisons.map((m) => (
              <div
                key={m.name}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  gap: 16,
                  padding: "9px 0",
                  borderBottom: "1px solid var(--line)",
                  fontSize: 13,
                }}
              >
                <span style={{ color: "var(--ink-dim)" }}>{m.name}</span>
                <span
                  style={{ ...DATA, color: "var(--ink)", whiteSpace: "nowrap" }}
                >
                  {fmtUsd(millions * m.blended)}
                </span>
              </div>
            ))
          )}
          <Button href="/calculator" variant="text" style={{ marginTop: 18 }}>Model your own workload</Button>
        </div>
      </div>
      </Container>
    </section>
  );
}
