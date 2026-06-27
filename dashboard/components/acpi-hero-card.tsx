"use client";

import { useEffect, useRef, useState } from "react";
import type { AcpiData } from "@/lib/data";

/* Deterministic ACPI series — 17 months (Jan 2025 → May 2026), 204 data points */
function buildSeries(): number[] {
  const N = 204;
  const v0 = 11.84, vN = 5.84;
  const smooth = (t: number) => t * t * (3 - 2 * t);
  const pts: number[] = [];
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const base = v0 + (vN - v0) * smooth(t);
    const env = Math.sin(Math.PI * t) * 0.9;
    const noise =
      env *
      (0.42 * Math.sin(t * 11 + 1) +
        0.2 * Math.sin(t * 27 + 0.5) +
        0.12 * Math.sin(t * 47));
    pts.push(Math.max(5.4, base + noise));
  }
  pts[pts.length - 1] = vN;
  return pts;
}

const SERIES = buildSeries();

function MiniSpark() {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const data = SERIES.filter((_, i) => i % 4 === 0);
    const w = 360,
      h = 56;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const x = (i: number) => ((i / (data.length - 1)) * w).toFixed(1);
    const y = (v: number) => (4 + (1 - (v - min) / (max - min)) * (h - 8)).toFixed(1);

    let line = "";
    let area = "";
    data.forEach((v, i) => {
      line += (i ? "L" : "M") + x(i) + " " + y(v) + " ";
    });
    area = line + `L${w} ${h} L0 ${h} Z`;

    svg.innerHTML = `
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#4caf7d" stop-opacity="0.22"/>
          <stop offset="100%" stop-color="#4caf7d" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path d="${area}" fill="url(#sg)"/>
      <path d="${line}" fill="none" stroke="#4caf7d" stroke-width="1.5"/>
      <circle cx="${x(data.length - 1)}" cy="${y(data[data.length - 1])}" r="2.5" fill="#4caf7d"/>
    `;
  }, []);

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 360 56"
      width="100%"
      height="56"
      preserveAspectRatio="none"
      suppressHydrationWarning
    />
  );
}

function CountUp({ target }: { target: number }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const dur = 900;
    const t0 = performance.now();
    function step(now: number) {
      const p = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setValue(target * e);
      if (p < 1) requestAnimationFrame(step);
      else setValue(target);
    }
    requestAnimationFrame(step);
  }, [target]);

  return <>${value.toFixed(2)}</>;
}

export function AcpiHeroCard({ acpi }: { acpi: AcpiData | null }) {
  const value = acpi?.acpi ?? null;
  const updatedAt = acpi?.computed_at
    ? new Date(acpi.computed_at).toLocaleString("en-US", {
        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
        timeZoneName: "short",
      })
    : null;

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        background: "linear-gradient(180deg, var(--s1), transparent)",
        padding: "30px 32px",
        position: "relative",
      }}
    >
      {/* Top row: label + status badge */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 8,
        }}
      >
        <div
          style={{
            fontSize: 10,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "var(--text3)",
          }}
        >
          ACPI · AI Compute Price Index
        </div>
        {value !== null && (
          <div
            style={{
              fontSize: 9,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--green)",
              border: "1px solid rgba(76,175,125,0.3)",
              padding: "3px 8px",
            }}
          >
            Live
          </div>
        )}
      </div>

      {/* Big index number */}
      <div
        style={{
          fontFamily: "var(--serif)",
          fontSize: "clamp(56px, 7vw, 92px)",
          fontWeight: 400,
          lineHeight: 1,
          color: "var(--text)",
          letterSpacing: "-0.02em",
        }}
      >
        {value !== null ? <CountUp target={value} /> : (
          <span style={{ color: "var(--text3)", fontSize: "clamp(32px, 4vw, 56px)" }}>—</span>
        )}
      </div>

      {/* Unit + timestamp */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginTop: 14,
        }}
      >
        <div style={{ fontSize: 11, color: "var(--text3)", letterSpacing: "0.05em" }}>
          per 1M standard compute units
        </div>
        {updatedAt && (
          <div style={{ fontSize: 10, color: "var(--text3)", letterSpacing: "0.04em" }}>
            {updatedAt}
          </div>
        )}
      </div>

      {/* Mini spark */}
      {/* <div
        style={{
          marginTop: 22,
          borderTop: "1px solid var(--border)",
          paddingTop: 18,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 9,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--text3)",
            marginBottom: 8,
          }}
        >
          <span>Trailing 17 months</span>
          <span>May 29, 2026</span>
        </div>
        <MiniSpark />
      </div> */}
    </div>
  );
}
