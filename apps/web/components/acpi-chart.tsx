"use client";

import { useEffect, useRef, useState } from "react";

/* ── Series builder (deterministic, same as home.html) ────── */
function buildSeries(): number[] {
  const N = 204;
  const v0 = 11.84,
    vN = 5.84;
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

const MONTH_DATES: Date[] = [];
for (let i = 0; i < 17; i++) MONTH_DATES.push(new Date(2025, i, 1));

function fmtMon(d: Date): string {
  return (
    d.toLocaleString("en-US", { month: "short" }) +
    " '" +
    String(d.getFullYear()).slice(2)
  );
}

const CW = 1100,
  CH = 330;
const PAD = { t: 18, b: 34, l: 8, r: 54 };

interface ChartState {
  data: number[];
  months: Date[];
  xAt: (i: number) => number;
  yAt: (v: number) => number;
}

function renderChart(svgEl: SVGSVGElement, monthsBack: number): ChartState {
  const total = SERIES.length;
  const startIdx = Math.round(total - (monthsBack / 17) * total);
  const data = SERIES.slice(Math.max(0, startIdx));
  const months = MONTH_DATES.slice(17 - monthsBack);

  const innerW = CW - PAD.l - PAD.r;
  const innerH = CH - PAD.t - PAD.b;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const yMin = Math.floor(min - 0.4);
  const yMax = Math.ceil(max + 0.4);

  const xAt = (i: number) => PAD.l + (i / (data.length - 1)) * innerW;
  const yAt = (v: number) => PAD.t + (1 - (v - yMin) / (yMax - yMin)) * innerH;

  let line = "";
  data.forEach((v, i) => {
    line += (i === 0 ? "M" : "L") + xAt(i).toFixed(1) + " " + yAt(v).toFixed(1) + " ";
  });
  const area =
    line +
    `L${xAt(data.length - 1).toFixed(1)} ${(PAD.t + innerH).toFixed(1)} ` +
    `L${PAD.l} ${(PAD.t + innerH).toFixed(1)} Z`;

  let grid = "";
  for (let k = 0; k <= 4; k++) {
    const val = yMin + ((yMax - yMin) * k) / 4;
    const y = yAt(val);
    grid += `<line x1="${PAD.l}" y1="${y.toFixed(1)}" x2="${(PAD.l + innerW).toFixed(1)}" y2="${y.toFixed(1)}" stroke="#1f2430" stroke-width="1"/>`;
    grid += `<text x="${(PAD.l + innerW + 10).toFixed(1)}" y="${(y + 3.5).toFixed(1)}" fill="#3d4655" font-family="DM Mono, monospace" font-size="10">$${val.toFixed(2)}</text>`;
  }

  const labelCount = monthsBack <= 6 ? 4 : 6;
  let xlab = "";
  for (let k = 0; k < labelCount; k++) {
    const frac = k / (labelCount - 1);
    const idx = Math.round(frac * (data.length - 1));
    const mIdx = Math.min(months.length - 1, Math.round(frac * (months.length - 1)));
    const x = xAt(idx);
    const anchor = k === 0 ? "start" : k === labelCount - 1 ? "end" : "middle";
    xlab += `<text x="${x.toFixed(1)}" y="${CH - 12}" fill="#3d4655" font-family="DM Mono, monospace" font-size="10" text-anchor="${anchor}">${fmtMon(months[mIdx])}</text>`;
  }

  const lastX = xAt(data.length - 1).toFixed(1);
  const lastY = yAt(data[data.length - 1]).toFixed(1);

  svgEl.innerHTML = `
    <defs>
      <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#c8a96e" stop-opacity="0.16"/>
        <stop offset="100%" stop-color="#c8a96e" stop-opacity="0"/>
      </linearGradient>
    </defs>
    ${grid}
    <path d="${area}" fill="url(#ag)"/>
    <path id="cline" d="${line}" fill="none" stroke="#c8a96e" stroke-width="2" stroke-linejoin="round"/>
    ${xlab}
    <line id="cross" x1="0" y1="${PAD.t}" x2="0" y2="${(PAD.t + innerH).toFixed(1)}" stroke="#28303f" stroke-width="1" opacity="0"/>
    <circle id="cdot-hover" r="4" fill="#c8a96e" opacity="0"/>
    <circle cx="${lastX}" cy="${lastY}" r="9" fill="#c8a96e" opacity="0.18">
      <animate attributeName="r" values="5;11;5" dur="2.4s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.3;0;0.3" dur="2.4s" repeatCount="indefinite"/>
    </circle>
    <circle cx="${lastX}" cy="${lastY}" r="3.5" fill="#c8a96e"/>
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

  return { data, months, xAt, yAt };
}

export function AcpiChart() {
  const [range, setRange] = useState(17);
  const svgRef = useRef<SVGSVGElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const chartStateRef = useRef<ChartState | null>(null);

  // Draw chart when range changes
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    chartStateRef.current = renderChart(svg, range);
  }, [range]);

  // Hover interaction — re-attach when range changes
  useEffect(() => {
    const svg = svgRef.current;
    const tip = tipRef.current;
    if (!svg || !tip) return;

    function onMove(e: MouseEvent) {
      const cs = chartStateRef.current;
      if (!cs) return;
      const { data, months, xAt, yAt } = cs;

      const rect = svg!.getBoundingClientRect();
      const relX = ((e.clientX - rect.left) / rect.width) * CW;
      let i = Math.round((relX - PAD.l) / ((CW - PAD.l - PAD.r) / (data.length - 1)));
      i = Math.max(0, Math.min(data.length - 1, i));

      const px = xAt(i);
      const py = yAt(data[i]);

      const cross = svg!.querySelector<SVGLineElement>("#cross");
      const dot = svg!.querySelector<SVGCircleElement>("#cdot-hover");
      if (cross) { cross.setAttribute("x1", String(px)); cross.setAttribute("x2", String(px)); cross.setAttribute("opacity", "0.6"); }
      if (dot) { dot.setAttribute("cx", String(px)); dot.setAttribute("cy", String(py)); dot.setAttribute("opacity", "1"); }

      const scaleX = rect.width / CW;
      const scaleY = rect.height / CH;
      tip!.style.opacity = "1";
      tip!.style.left = Math.min(rect.width - 130, Math.max(0, px * scaleX + 12)) + "px";
      tip!.style.top = (py * scaleY - 10) + "px";

      const mIdx = Math.min(months.length - 1, Math.round((i / (data.length - 1)) * (months.length - 1)));
      const ttv = tip!.querySelector<HTMLElement>(".tt-v");
      const ttd = tip!.querySelector<HTMLElement>(".tt-d");
      if (ttv) ttv.textContent = "$" + data[i].toFixed(2);
      if (ttd) ttd.textContent = fmtMon(months[mIdx]);
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
  }, [range]);

  return (
    <section
      className="home-chart-sec"
      style={{ padding: "54px 48px", borderBottom: "1px solid var(--border)" }}
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
            {([6, 12, 17] as const).map((r) => (
              <button
                key={r}
                className={`range-tab${range === r ? " on" : ""}`}
                onClick={() => setRange(r)}
              >
                {r}M
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
          <svg
            ref={svgRef}
            viewBox={`0 0 ${CW} ${CH}`}
            width="100%"
            preserveAspectRatio="none"
            style={{ display: "block", overflow: "visible" }}
            suppressHydrationWarning
          />
          {/* Hover tooltip */}
          <div
            ref={tipRef}
            style={{
              position: "absolute",
              pointerEvents: "none",
              opacity: 0,
              transition: "opacity 0.12s",
              background: "#05060a",
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
          {[
            { label: "Index high · 17M",    value: "$11.84",  tone: "var(--text)" },
            { label: "Index low · 17M",     value: "$5.84",   tone: "var(--accent)" },
            { label: "Trailing change",      value: "▼ 50.7%", tone: "var(--green)" },
            { label: "Annualised deflation", value: "▼ 38.4%", tone: "var(--green)" },
            { label: "Models in basket",     value: "312",     tone: "var(--text)" },
          ].map(({ label, value, tone }) => (
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
      </div>
    </section>
  );
}
