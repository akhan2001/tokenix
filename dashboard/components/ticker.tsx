"use client";

import { useEffect, useRef } from "react";

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
    <div className="flex items-center gap-3 px-5 border-r border-white/10 shrink-0">
      <div className="flex flex-col">
        <span className="text-xs font-semibold text-white/90 whitespace-nowrap leading-tight">
          {label}
        </span>
        <span className="text-[10px] text-white/40 uppercase tracking-wider">
          {item.provider}
        </span>
      </div>
      <div className="flex flex-col items-end">
        <span className="text-xs font-mono text-emerald-400 whitespace-nowrap">
          IN&nbsp;${item.input_per_million_usd.toFixed(2)}
        </span>
        <span className="text-xs font-mono text-sky-400 whitespace-nowrap">
          OUT&nbsp;${item.output_per_million_usd.toFixed(2)}
        </span>
      </div>
    </div>
  );
}

export function Ticker({ items }: { items: TickerItem[] }) {
  const trackRef = useRef<HTMLDivElement>(null);

  // Seamless CSS marquee via animation — duplicate items so loop is invisible
  const doubled = [...items, ...items];

  return (
    <div className="w-full bg-zinc-950 border-b border-white/10 overflow-hidden h-12 flex items-center">
      <div className="flex items-center h-full overflow-hidden relative w-full">
        {/* Left gradient fade */}
        <div className="absolute left-0 top-0 h-full w-10 bg-gradient-to-r from-zinc-950 to-transparent z-10 pointer-events-none" />
        {/* Right gradient fade */}
        <div className="absolute right-0 top-0 h-full w-10 bg-gradient-to-l from-zinc-950 to-transparent z-10 pointer-events-none" />

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
