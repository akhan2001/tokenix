import { loadPrices, tickerModels } from "@/lib/data";
import { Ticker } from "@/components/ticker";
import { PriceTable } from "@/components/price-table";

export const dynamic = "force-dynamic";

export default function Home() {
  const rows      = loadPrices();
  const ticker    = tickerModels(rows);
  const providers = [...new Set(rows.map((r) => r.provider).filter(Boolean))].sort();

  const withInput  = rows.filter((r) => r.input_per_million_usd > 0);
  const sortedInp  = [...withInput].sort((a, b) => a.input_per_million_usd - b.input_per_million_usd);
  const p99idx     = Math.floor(sortedInp.length * 0.99);
  const trimmed    = sortedInp.slice(0, p99idx);

  const minInput    = withInput.length ? sortedInp[0].input_per_million_usd : 0;
  const maxInput    = withInput.length ? sortedInp[sortedInp.length - 1].input_per_million_usd : 0;
  const medianInput = trimmed.length ? trimmed[Math.floor(trimmed.length / 2)].input_per_million_usd : 0;
  const avgInput    = trimmed.length ? trimmed.reduce((s, r) => s + r.input_per_million_usd, 0) / trimmed.length : 0;
  const avgOutput   = trimmed.length ? trimmed.reduce((s, r) => s + r.output_per_million_usd, 0) / trimmed.length : 0;

  return (
    <div
      className="min-h-screen text-white flex flex-col"
      style={{ background: "radial-gradient(ellipse 90% 35% at 50% 0%, #05260F 0%, #000000 55%)" }}
    >
      {/* Header */}
      <header
        className="px-6 py-3 flex items-center gap-4 shrink-0"
        style={{ borderBottom: "1px solid #05260F", background: "#000000" }}
      >
        <h1
          className="text-3xl font-bold tracking-tight"
          style={{ fontFamily: "var(--font-bricolage), sans-serif", color: "#00FF41" }}
        >
          TOKENIX
        </h1>
      </header>

      {/* Ticker */}
      <Ticker items={ticker} />

      {/* Stats row */}
      <div
        className="px-6 py-3 flex flex-wrap gap-6 text-sm shrink-0"
        style={{ borderBottom: "1px solid #05260F", background: "rgba(5,38,15,0.35)" }}
      >
        {[
          { label: "Cheapest Input",       value: `$${minInput.toFixed(4)}/M`    },
          { label: "Most Expensive Input", value: `$${maxInput.toFixed(2)}/M`    },
          { label: "Median Input",         value: `$${medianInput.toFixed(2)}/M` },
          { label: "Avg Input (p99)",      value: `$${avgInput.toFixed(2)}/M`    },
          { label: "Avg Output (p99)",     value: `$${avgOutput.toFixed(2)}/M`   },
        ].map((stat) => (
          <div key={stat.label} className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider" style={{ color: "#7A7A7A" }}>
              {stat.label}
            </span>
            <span className="font-mono font-medium text-sm" style={{ color: "#00A32A" }}>
              {stat.value}
            </span>
          </div>
        ))}
      </div>

      {/* Table */}
      <main className="flex-1 px-6 py-6">
        <PriceTable rows={rows} providers={providers} />
      </main>

      <footer
        className="px-6 py-3 text-xs text-right"
        style={{ borderTop: "1px solid #05260F", color: "#7A7A7A" }}
      >
        Prices in USD per million tokens
      </footer>
    </div>
  );
}
