"use client";

import createGlobe from "cobe";
import { useEffect, useRef } from "react";

export function Globe({ size = 500 }: { size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phi = useRef(0);

  useEffect(() => {
    const dpr = window.devicePixelRatio || 1;
    const px = size * dpr;
    const globe = createGlobe(canvasRef.current!, {
      devicePixelRatio: dpr,
      width: px,
      height: px,
      phi: 0,
      theta: 0.25,
      dark: 1,
      diffuse: 1.4,
      mapSamples: 16000,
      mapBrightness: 5,
      baseColor: [0.18, 0.38, 0.18],
      markerColor: [0.15, 1.0, 0.4],
      glowColor: [0.08, 0.45, 0.12],
      markers: [
        { location: [52.37,   4.90],  size: 0.07 }, // Netherlands
        { location: [37.77, -122.4],  size: 0.05 }, // SF
        { location: [40.71,  -74.0],  size: 0.05 }, // NYC
        { location: [51.51,  -0.13],  size: 0.05 }, // London
        { location: [35.68, 139.65],  size: 0.05 }, // Tokyo
        { location: [ 1.35, 103.82],  size: 0.04 }, // Singapore
        { location: [48.85,   2.35],  size: 0.04 }, // Paris
      ],
      onRender: (state) => {
        state.phi = phi.current;
        phi.current += 0.003;
      },
    });
    return () => globe.destroy();
  }, [size]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size, maxWidth: "100%" }}
    />
  );
}
