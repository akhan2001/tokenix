"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { AcpiHistoryPoint } from "@/lib/data";

/* ── Time-window ranges over the real history ───────────────── */
const RANGES = [
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "All", days: Infinity },
] as const;

interface ChartPoint {
  d: Date;
  v: number;
}

function fmtDate(d: Date, withTime: boolean): string {
  const day = d.toLocaleString("en-US", { month: "short", day: "numeric" });
  if (!withTime) return day;
  return (
    day +
    " " +
    d.toLocaleString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
  );
}

function windowPoints(history: AcpiHistoryPoint[], days: number): ChartPoint[] {
  const all = history
    .map((p) => ({ d: new Date(p.timestamp), v: p.acpi }))
    .filter((p) => !Number.isNaN(p.d.getTime()));
  if (!all.length) return [];
  if (!Number.isFinite(days)) return all;

  const last = all[all.length - 1].d.getTime();
  const cutoff = last - days * 24 * 60 * 60 * 1000;
  const win = all.filter((p) => p.d.getTime() >= cutoff);
  return win.length >= 2 ? win : all.slice(-2);
}

const CW = 1100,
  CH = 330;
const PAD = { t: 18, b: 34, l: 8, r: 54 };

interface ChartState {
  data: ChartPoint[];
  xAt: (i: number) => number;
  yAt: (v: number) => number;
  withTime: boolean;
}

function renderChart(svgEl: SVGSVGElement, data: ChartPoint[], withTime: boolean): ChartState {
  const innerW = CW - PAD.l - PAD.r;
  const innerH = CH - PAD.t - PAD.b;
  const values = data.map((p) => p.v);
  const min = Math.min(...values);
  const max = Math.max(...values);
  // Pad the y-range by ~8% of the span so the line never hugs the frame edges.
  const span = Math.max(max - min, 0.01);
  const yMin = min - span * 0.18;
  const yMax = max + span * 0.18;

  const xAt = (i: number) => PAD.l + (i / Math.max(1, data.length - 1)) * innerW;
  const yAt = (v: number) => PAD.t + (1 - (v - yMin) / (yMax - yMin)) * innerH;

  let line = "";
  data.forEach((p, i) => {
    line += (i === 0 ? "M" : "L") + xAt(i).toFixed(1) + " " + yAt(p.v).toFixed(1) + " ";
  });
  const area =
    line +
    `L${xAt(data.length - 1).toFixed(1)} ${(PAD.t + innerH).toFixed(1)} ` +
    `L${PAD.l} ${(PAD.t + innerH).toFixed(1)} Z`;

  // SVG presentation attributes don't support var(), so resolve the theme
  // tokens to concrete colors (falls back to the original dark values).
  const cs = getComputedStyle(svgEl);
  const cGrid = cs.getPropertyValue("--border").trim() || "#1f2430";
  const cLabel = cs.getPropertyValue("--text3").trim() || "#3d4655";
  const cLine = cs.getPropertyValue("--accent").trim() || "#c8a96e";
  const cCross = cs.getPropertyValue("--border2").trim() || "#28303f";

  let grid = "";
  for (let k = 0; k <= 4; k++) {
    const val = yMin + ((yMax - yMin) * k) / 4;
    const y = yAt(val);
    grid += `<line x1="${PAD.l}" y1="${y.toFixed(1)}" x2="${(PAD.l + innerW).toFixed(1)}" y2="${y.toFixed(1)}" stroke="${cGrid}" stroke-width="1"/>`;
    grid += `<text x="${(PAD.l + innerW + 10).toFixed(1)}" y="${(y + 3.5).toFixed(1)}" fill="${cLabel}" font-family="DM Mono, monospace" font-size="10">$${val.toFixed(2)}</text>`;
  }

  const labelCount = Math.min(6, Math.max(2, data.length));
  let xlab = "";
  for (let k = 0; k < labelCount; k++) {
    const frac = k / (labelCount - 1);
    const idx = Math.round(frac * (data.length - 1));
    const x = xAt(idx);
    const anchor = k === 0 ? "start" : k === labelCount - 1 ? "end" : "middle";
    xlab += `<text x="${x.toFixed(1)}" y="${CH - 12}" fill="${cLabel}" font-family="DM Mono, monospace" font-size="10" text-anchor="${anchor}">${fmtDate(data[idx].d, false)}</text>`;
  }

  const lastX = xAt(data.length - 1).toFixed(1);
  const lastY = yAt(data[data.length - 1].v).toFixed(1);

  svgEl.innerHTML = `
    <defs>
      <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${cLine}" stop-opacity="0.16"/>
        <stop offset="100%" stop-color="${cLine}" stop-opacity="0"/>
      </linearGradient>
    </defs>
    ${grid}
    <path d="${area}" fill="url(#ag)"/>
    <path id="cline" d="${line}" fill="none" stroke="${cLine}" stroke-width="2" stroke-linejoin="round"/>
    ${xlab}
    <line id="cross" x1="0" y1="${PAD.t}" x2="0" y2="${(PAD.t + innerH).toFixed(1)}" stroke="${cCross}" stroke-width="1" opacity="0"/>
    <circle id="cdot-hover" r="4" fill="${cLine}" opacity="0"/>
    <circle cx="${lastX}" cy="${lastY}" r="9" fill="${cLine}" opacity="0.18">
      <animate attributeName="r" values="5;11;5" dur="2.4s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.3;0;0.3" dur="2.4s" repeatCount="indefinite"/>
    </circle>
    <circle cx="${lastX}" cy="${lastY}" r="3.5" fill="${cLine}"/>
  `;

  // Animate the line draw
  const cl = svgEl.querySelector<SVGPathElement>("#cline");
  if (cl) {
    const len = cl.getTotalLength();
    cl.style.strokeDasharray = String(len);
    cl.style.strokeDashoffset = String(len);
    cl.getBoundingClientRect(); // force reflow
    cl.style.transition = "stroke-dashoffset 1.1s cubic-bezier(.6,.05,.2,1)";
    cl.style.strokeDashoffset = "0";
  }

  return { data, xAt, yAt, withTime };
}

function fmtDelta(pct: number): string {
  const arrow = pct > 0 ? "▲" : pct < 0 ? "▼" : "■";
  return `${arrow} ${Math.abs(pct).toFixed(1)}%`;
}

export function AcpiChart({
  history,
  modelCount,
}: {
  history: AcpiHistoryPoint[];
  modelCount?: number;
}) {
  const [rangeIdx, setRangeIdx] = useState(1); // default 30D
  const svgRef = useRef<SVGSVGElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const chartStateRef = useRef<ChartState | null>(null);

  const days = RANGES[rangeIdx].days;
  const data = useMemo(() => windowPoints(history, days), [history, days]);
  const withTime = days <= 7;

  const hasData = data.length >= 2;

  // Real stats derived from the selected window
  const stats = useMemo(() => {
    if (!hasData) return null;
    const values = data.map((p) => p.v);
    const first = values[0];
    const last = values[values.length - 1];
    const high = Math.max(...values);
    const low = Math.min(...values);
    const change = first > 0 ? ((last - first) / first) * 100 : 0;
    return { first, last, high, low, change };
  }, [data, hasData]);

  // Draw chart when the windowed data changes
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !hasData) return;
    chartStateRef.current = renderChart(svg, data, withTime);
  }, [data, withTime, hasData]);

  // Hover interaction — re-attach when data changes
  useEffect(() => {
    const svg = svgRef.current;
    const tip = tipRef.current;
    if (!svg || !tip || !hasData) return;

    function onMove(e: MouseEvent) {
      const cs = chartStateRef.current;
      if (!cs) return;
      const { data, xAt, yAt, withTime } = cs;

      const rect = svg!.getBoundingClientRect();
      const relX = ((e.clientX - rect.left) / rect.width) * CW;
      let i = Math.round((relX - PAD.l) / ((CW - PAD.l - PAD.r) / (data.length - 1)));
      i = Math.max(0, Math.min(data.length - 1, i));

      const px = xAt(i);
      const py = yAt(data[i].v);

      const cross = svg!.querySelector<SVGLineElement>("#cross");
      const dot = svg!.querySelector<SVGCircleElement>("#cdot-hover");
      if (cross) { cross.setAttribute("x1", String(px)); cross.setAttribute("x2", String(px)); cross.setAttribute("opacity", "0.6"); }
      if (dot) { dot.setAttribute("cx", String(px)); dot.setAttribute("cy", String(py)); dot.setAttribute("opacity", "1"); }

      const scaleX = rect.width / CW;
      const scaleY = rect.height / CH;
      tip!.style.opacity = "1";
      tip!.style.left = Math.min(rect.width - 130, Math.max(0, px * scaleX + 12)) + "px";
      tip!.style.top = (py * scaleY - 10) + "px";

      const ttv = tip!.querySelector<HTMLElement>(".tt-v");
      const ttd = tip!.querySelector<HTMLElement>(".tt-d");
      if (ttv) ttv.textContent = "$" + data[i].v.toFixed(4);
      if (ttd) ttd.textContent = fmtDate(data[i].d, withTime);
    }

    function onLeave() {
      tip!.style.opacity = "0";
      const cross = svg!.querySelector<SVGLineElement>("#cross");
      const dot = svg!.querySelector<SVGCircleElement>("#cdot-hover");
      if (cross) cross.setAttribute("opacity", "0");
      if (dot) dot.setAttribute("opacity", "0");
    }

    svg.addEventListener("mousemove", onMove);
    svg.addEventListener("mouseleave", onLeave);
    return () => {
      svg.removeEventListener("mousemove", onMove);
      svg.removeEventListener("mouseleave", onLeave);
    };
  }, [data, hasData]);

  const statTiles = stats
    ? [
        { label: `Index high · ${RANGES[rangeIdx].label}`, value: "$" + stats.high.toFixed(2), tone: "var(--text)" },
        { label: `Index low · ${RANGES[rangeIdx].label}`, value: "$" + stats.low.toFixed(2), tone: "var(--accent)" },
        {
          label: `Change · ${RANGES[rangeIdx].label}`,
          value: fmtDelta(stats.change),
          tone: stats.change <= 0 ? "var(--green)" : "var(--red)",
        },
        { label: "Current level", value: "$" + stats.last.toFixed(4), tone: "var(--text)" },
        {
          label: "Models in basket",
          value: (modelCount ?? history[history.length - 1]?.model_count ?? 0).toLocaleString(),
          tone: "var(--text)",
        },
      ]
    : [];

  return (
    <section
      className="home-chart-sec"
      style={{ padding: "var(--space-section-md) 48px", borderBottom: "1px solid var(--border)" }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Header row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginBottom: 30,
          }}
        >
          <div>
            <div className="sec-kicker">Index performance</div>
            <div
              style={{
                fontFamily: "var(--serif)",
                fontSize: 26,
                fontWeight: 500,
                color: "var(--text)",
                letterSpacing: "-0.01em",
              }}
            >
              ACPI, cost of one unit of intelligence
            </div>
          </div>

          {/* Range tabs */}
          <div style={{ display: "flex", gap: 6 }}>
            {RANGES.map((r, i) => (
              <button
                key={r.label}
                className={`range-tab${rangeIdx === i ? " on" : ""}`}
                onClick={() => setRangeIdx(i)}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Chart frame */}
        <div
          style={{
            position: "relative",
            border: "1px solid var(--border)",
            background: "var(--s1)",
            padding: "24px 24px 14px",
          }}
        >
          {hasData ? (
            <svg
              ref={svgRef}
              viewBox={`0 0 ${CW} ${CH}`}
              width="100%"
              preserveAspectRatio="none"
              style={{ display: "block", overflow: "visible" }}
              suppressHydrationWarning
            />
          ) : (
            <div
              style={{
                height: 240,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text3)",
                fontSize: 12,
                letterSpacing: "0.04em",
              }}
            >
              Building index history — check back after the next hourly run.
            </div>
          )}
          {/* Hover tooltip */}
          <div
            ref={tipRef}
            style={{
              position: "absolute",
              pointerEvents: "none",
              opacity: 0,
              transition: "opacity 0.12s",
              background: "var(--s2)",
              border: "1px solid var(--border2)",
              padding: "8px 11px",
              fontSize: 10,
              zIndex: 5,
              whiteSpace: "nowrap",
            }}
          >
            <div
              className="tt-v"
              style={{ fontFamily: "var(--serif)", fontSize: 15, color: "var(--accent)" }}
            />
            <div
              className="tt-d"
              style={{ color: "var(--text3)", letterSpacing: "0.06em", marginTop: 2 }}
            />
          </div>
        </div>

        {/* Chart stats */}
        {stats && (
          <div
            style={{
              display: "flex",
              gap: 36,
              marginTop: 22,
              paddingTop: 20,
              borderTop: "1px solid var(--border)",
              flexWrap: "wrap",
            }}
          >
            {statTiles.map(({ label, value, tone }) => (
              <div key={label} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <div
                  style={{
                    fontSize: 9,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    color: "var(--text3)",
                  }}
                >
                  {label}
                </div>
                <div
                  style={{
                    fontFamily: "var(--serif)",
                    fontSize: 18,
                    color: tone,
                  }}
                >
                  {value}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
