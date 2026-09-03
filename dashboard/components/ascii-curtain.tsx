"use client";

import { useEffect, useRef } from "react";

/**
 * The ASCII curtain that backs the hero, the problem panel and the CTA.
 *
 * These were three near-identical canvases with divergent magic numbers. The
 * differences were never only "how many beams" — they also differed in cell
 * size, glyph set, fold coefficients, vignette, beam width and skew, and the
 * brightness formula itself. So the parameters are grouped into presets rather
 * than exposed as a dozen loose props; HERO / PANEL / FOOTER below reproduce
 * the three originals exactly.
 *
 * Brightness is unified as:
 *   b = (fold * foldScale * ramp + beam * (beamBase + beamRamp * ramp)) * vignette
 * which collapses to each original when the preset's coefficients are applied.
 *
 * Colour is NOT read from --amber yet. The ramps below are the literal values
 * from the mockups; routing them through the token shifts the bright stop from
 * #ff6a14 to #ff7a1a, which is a visible retheme and belongs in its own change.
 */

export type ColorStop = readonly [pos: number, r: number, g: number, b: number];
export type Beam = { speed: number; weight: number; phase?: number };

export type CurtainPreset = {
  cellW: number;
  cellH: number;
  fontInset: number;
  chars: readonly string[];
  colorStops: readonly ColorStop[];
  beams: readonly Beam[];
  beamWidth: number;
  beamSkew: number;
  fold: {
    base: number;
    amp1: number;
    freq1: number;
    drift1: number;
    amp2: number;
    freq2: number;
    drift2: number;
  };
  vignette: { center: number; depth: number };
  /** Left-to-right brightness gradient; hero only. */
  ramp: { min: number; span: number } | null;
  foldScale: number;
  beamBase: number;
  beamRamp: number;
  cutoff: number;
};

const RAMP_WARM: readonly ColorStop[] = [
  [0.0, 18, 9, 3],
  [0.4, 150, 62, 4],
  [0.7, 255, 106, 20],
  [1.0, 255, 217, 166],
];

const RAMP_DIM: readonly ColorStop[] = [
  [0.0, 18, 9, 3],
  [0.45, 120, 52, 4],
  [0.75, 225, 96, 18],
  [1.0, 255, 200, 140],
];

const GLYPHS_FULL: readonly string[] = [".", "'", ":", "¦", "|", "‡", "#"];
const GLYPHS_QUIET: readonly string[] = [".", "'", ":", "¦", "|"];

export const HERO_CURTAIN: CurtainPreset = {
  cellW: 13,
  cellH: 19,
  fontInset: 5,
  chars: GLYPHS_FULL,
  colorStops: RAMP_WARM,
  beams: [
    { speed: 130, weight: 0.85 },
    { speed: 78, weight: 0.45, phase: 0.45 },
  ],
  beamWidth: 46,
  beamSkew: 0.72,
  fold: { base: 0.42, amp1: 0.3, freq1: 0.3, drift1: 0.12, amp2: 0.18, freq2: 0.07, drift2: 0.05 },
  vignette: { center: 0.42, depth: 0.55 },
  ramp: { min: 0.12, span: 0.88 },
  foldScale: 0.5,
  beamBase: 0.3,
  beamRamp: 0.7,
  cutoff: 0.05,
};

export const PANEL_CURTAIN: CurtainPreset = {
  cellW: 10,
  cellH: 15,
  fontInset: 4,
  chars: GLYPHS_FULL,
  colorStops: RAMP_WARM,
  beams: [{ speed: 110, weight: 0.7 }],
  beamWidth: 40,
  beamSkew: 0.7,
  fold: { base: 0.55, amp1: 0.3, freq1: 0.32, drift1: 0.15, amp2: 0.15, freq2: 0.08, drift2: 0.06 },
  vignette: { center: 0.4, depth: 0.5 },
  ramp: null,
  foldScale: 0.55,
  beamBase: 1,
  beamRamp: 0,
  cutoff: 0.05,
};

export const FOOTER_CURTAIN: CurtainPreset = {
  cellW: 13,
  cellH: 19,
  fontInset: 5,
  chars: GLYPHS_QUIET,
  colorStops: RAMP_DIM,
  beams: [],
  beamWidth: 40,
  beamSkew: 0.7,
  fold: { base: 0.3, amp1: 0.22, freq1: 0.26, drift1: 0.1, amp2: 0.12, freq2: 0.06, drift2: 0.04 },
  vignette: { center: 0.5, depth: 0.7 },
  ramp: null,
  foldScale: 1,
  beamBase: 0,
  beamRamp: 0,
  cutoff: 0.06,
};

function rampColor(stops: readonly ColorStop[], b: number): string {
  const v = Math.max(0, Math.min(1, b));
  let lo = stops[0];
  let hi = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (v >= stops[i][0] && v <= stops[i + 1][0]) {
      lo = stops[i];
      hi = stops[i + 1];
      break;
    }
  }
  const span = hi[0] - lo[0] || 1;
  const f = (v - lo[0]) / span;
  const r = Math.round(lo[1] + (hi[1] - lo[1]) * f);
  const g = Math.round(lo[2] + (hi[2] - lo[2]) * f);
  const bl = Math.round(lo[3] + (hi[3] - lo[3]) * f);
  return `rgb(${r},${g},${bl})`;
}

type Props = {
  preset?: CurtainPreset;
  /** Monospace stack. The glyph set needs the broken-bar and double-dagger, so
   *  this is deliberately not var(--mono) — DM Mono does not carry them. */
  fontFamily?: string;
  className?: string;
  style?: React.CSSProperties;
};

export function AsciiCurtain({
  preset = HERO_CURTAIN,
  fontFamily = "'JetBrains Mono', ui-monospace, monospace",
  className,
  style,
}: Props) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const p = preset;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0;
    let H = 0;
    let raf = 0;
    // Three of these can share one page now, which was never true when each
    // lived in its own file. Offscreen instances stop rather than burn rAF.
    let visible = true;

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      W = r.width;
      H = r.height;
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (now: number) => {
      raf = 0;
      const t = reduceMotion ? 4 : (now - t0) / 1000;

      ctx.clearRect(0, 0, W, H);
      ctx.font = `${p.cellH - p.fontInset}px ${fontFamily}`;
      ctx.textBaseline = "top";

      const cols = Math.ceil(W / p.cellW) + 1;
      const rows = Math.ceil(H / p.cellH) + 1;

      const beamPos = p.beams.map(
        (b) => ((t * b.speed + (b.phase ?? 0) * (W + H)) % (W + H)) - H,
      );

      for (let cx = 0; cx < cols; cx++) {
        const x = cx * p.cellW;
        const ramp = p.ramp ? p.ramp.min + p.ramp.span * (cx / cols) : 1;
        const fold =
          p.fold.base +
          p.fold.amp1 * Math.sin(cx * p.fold.freq1 + t * p.fold.drift1) +
          p.fold.amp2 * Math.sin(cx * p.fold.freq2 - t * p.fold.drift2);

        for (let cy = 0; cy < rows; cy++) {
          const y = cy * p.cellH;

          let beam = 0;
          if (p.beams.length) {
            const d = x - y * p.beamSkew;
            for (let i = 0; i < p.beams.length; i++) {
              const db = d - beamPos[i];
              beam +=
                Math.exp(-(db * db) / (2 * p.beamWidth * p.beamWidth)) * p.beams[i].weight;
            }
          }

          const vign = 1 - Math.abs(cy / rows - p.vignette.center) * p.vignette.depth;
          let b = (fold * p.foldScale * ramp + beam * (p.beamBase + p.beamRamp * ramp)) * vign;
          b = Math.max(0, Math.min(1, b));
          if (b < p.cutoff) continue;

          const idx = Math.min(p.chars.length - 1, Math.floor(b * p.chars.length));
          ctx.fillStyle = rampColor(p.colorStops, b);
          ctx.fillText(p.chars[idx], x, y);
        }
      }

      if (!reduceMotion && visible) raf = requestAnimationFrame(draw);
    };

    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const io = new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting ?? true;
        if (visible && !reduceMotion && !raf) raf = requestAnimationFrame(draw);
      },
      { rootMargin: "120px" },
    );
    io.observe(canvas);

    const t0 = performance.now();
    raf = requestAnimationFrame(draw);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, [preset, fontFamily]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={className}
      style={{ display: "block", width: "100%", height: "100%", ...style }}
    />
  );
}
