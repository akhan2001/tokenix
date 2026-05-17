"use client";

import { useRef } from "react";

interface TickerItem {
  model_id: string;
  model_name: string;
  provider: string;
  input_per_million_usd: number;
  output_per_million_usd: number;
}

function TickerCard({ item }: { item: TickerItem }) {
  const label =
    item.model_name.replace(/^[A-Za-z][A-Za-z0-9 ]+:\s*/, "").replace(/\s*\(.*\)$/, "").trim() ||
    item.model_id.split("/").pop() ||
    item.model_id;

  return (
    <div
      className="flex items-center gap-3 px-5 shrink-0"
      style={{ borderRight: "1px solid rgba(0,60,20,0.4)" }}
    >
      <div className="flex flex-col">
        <span className="text-xs font-semibold whitespace-nowrap leading-tight" style={{ color: "#00FF41" }}>
          {label}
        </span>
        <span className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(0,80,25,0.85)" }}>
          {item.provider}
        </span>
      </div>
      <div className="flex flex-col items-end">
        <span className="text-xs font-mono whitespace-nowrap" style={{ color: "rgba(0,80,25,0.85)" }}>
          IN&nbsp;${item.input_per_million_usd.toFixed(2)}
        </span>
        <span className="text-xs font-mono whitespace-nowrap" style={{ color: "rgba(0,80,25,0.85)" }}>
          OUT&nbsp;${item.output_per_million_usd.toFixed(2)}
        </span>
      </div>
    </div>
  );
}

export function Ticker({ items }: { items: TickerItem[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const doubled = [...items, ...items];

  return (
    <div
      className="w-full overflow-hidden h-12 flex items-center"
      style={{ background: "#00A32A", borderBottom: "1px solid #05260F" }}
    >
      <div className="flex items-center h-full overflow-hidden relative w-full">
        <div
          className="absolute left-0 top-0 h-full w-10 z-10 pointer-events-none"
          style={{ background: "linear-gradient(to right, #00A32A, transparent)" }}
        />
        <div
          className="absolute right-0 top-0 h-full w-10 z-10 pointer-events-none"
          style={{ background: "linear-gradient(to left, #00A32A, transparent)" }}
        />
        <div
          ref={trackRef}
          className="flex items-center h-full animate-ticker"
          style={{ width: "max-content" }}
        >
          {doubled.map((item, i) => (
            <TickerCard key={`${item.model_id}-${i}`} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}
