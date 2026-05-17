import { loadPrices, tickerModels } from "@/lib/data";
import { Ticker } from "@/components/ticker";
import { PriceTable } from "@/components/price-table";
import { Hero } from "@/components/hero";

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

  const timestamp = rows[0]?.timestamp ?? null;
  let lastUpdated: string | null = null;
  if (timestamp) {
    const d = new Date(timestamp);
    if (!isNaN(d.getTime()))
      lastUpdated = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">

      {/* Nav */}
      <header className="border-b border-white/10 bg-zinc-950/95 backdrop-blur sticky top-0 z-50 px-8 py-3 flex items-center shrink-0">
        <div className="flex items-center gap-2 mr-auto">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <h1 className="text-base font-black tracking-[0.15em] uppercase">TOKENIX</h1>
        </div>
        <nav className="hidden md:flex items-center gap-7 text-[11px] uppercase tracking-widest text-zinc-400">
          <a href="#table"  className="hover:text-white transition-colors">Index</a>
          <a href="#table"  className="hover:text-white transition-colors">Models</a>
          <a href="#"       className="hover:text-white transition-colors">API</a>
          <a href="#"       className="hover:text-white transition-colors">Methodology</a>
        </nav>
        <a
          href="#"
          className="hidden md:inline-flex ml-8 bg-emerald-500 hover:bg-emerald-400 transition-colors text-black font-bold text-[10px] uppercase tracking-widest px-4 py-2 rounded-md"
        >
          Get API Access
        </a>
      </header>

      {/* Hero + globe */}
      <Hero
        compositeIndex={medianInput}
        modelsTracked={rows.length}
        lastUpdated={lastUpdated}
      />

      {/* Ticker */}
      <Ticker items={ticker} />

      {/* Stats row */}
      <div className="border-b border-white/10 bg-zinc-900/40 px-8 py-3 flex flex-wrap gap-6 text-sm shrink-0">
        {[
          { label: "Cheapest Input",       value: `$${minInput.toFixed(4)}/M`,    color: "text-emerald-400" },
          { label: "Most Expensive Input", value: `$${maxInput.toFixed(2)}/M`,    color: "text-rose-400"    },
          { label: "Median Input",         value: `$${medianInput.toFixed(2)}/M`, color: "text-zinc-300"    },
          { label: "Avg Input (p99)",      value: `$${avgInput.toFixed(2)}/M`,    color: "text-zinc-300"    },
          { label: "Avg Output (p99)",     value: `$${avgOutput.toFixed(2)}/M`,   color: "text-zinc-300"    },
        ].map((stat) => (
          <div key={stat.label} className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500">{stat.label}</span>
            <span className={`font-mono font-medium text-sm ${stat.color}`}>{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Table */}
      <main id="table" className="flex-1 px-8 py-6">
        <PriceTable rows={rows} providers={providers} />
      </main>

      <footer className="border-t border-white/10 px-8 py-3 text-xs text-zinc-600 text-right">
        Prices in USD per million tokens
      </footer>
    </div>
  );
}
