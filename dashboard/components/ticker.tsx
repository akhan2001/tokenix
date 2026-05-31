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
      style={{ borderRight: "1px solid var(--border)" }}
    >
      <div className="flex flex-col">
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: "var(--text)",
            whiteSpace: "nowrap",
            lineHeight: 1.3,
            fontFamily: "var(--mono)",
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--text3)",
            fontFamily: "var(--mono)",
          }}
        >
          {item.provider}
        </span>
      </div>
      <div className="flex flex-col items-end">
        <span
          style={{
            fontSize: 11,
            fontFamily: "var(--mono)",
            whiteSpace: "nowrap",
            color: "var(--accent)",
          }}
        >
          IN&nbsp;${item.input_per_million_usd.toFixed(2)}
        </span>
        <span
          style={{
            fontSize: 11,
            fontFamily: "var(--mono)",
            whiteSpace: "nowrap",
            color: "var(--text2)",
          }}
        >
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
      className="w-full overflow-hidden flex items-center"
      style={{
        height: 44,
        background: "var(--s1)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div className="flex items-center h-full w-full overflow-hidden">
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
