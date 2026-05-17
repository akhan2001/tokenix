import { loadPrices, tickerModels } from "@/lib/data";
import { Ticker } from "@/components/ticker";
import { PriceTable } from "@/components/price-table";

export const dynamic = "force-dynamic";

export default function Home() {
  const rows      = loadPrices();
  const ticker    = tickerModels(rows);
  const sources   = [...new Set(rows.map((r) => r.source))].sort();
  const providers = [...new Set(rows.map((r) => r.provider).filter(Boolean))].sort();

  const timestamp      = rows[0]?.timestamp ?? null;
  const totalModels    = rows.length;
  const totalProviders = providers.length;

  // Use only models with non-zero input for input stats; exclude extreme outliers (>99th pct) from averages
  const withInput  = rows.filter((r) => r.input_per_million_usd > 0);
  const sortedInp  = [...withInput].sort((a, b) => a.input_per_million_usd - b.input_per_million_usd);
  const p99idx     = Math.floor(sortedInp.length * 0.99);
  const trimmed    = sortedInp.slice(0, p99idx);

  const minInput   = withInput.length ? sortedInp[0].input_per_million_usd : 0;
  const maxInput   = withInput.length ? sortedInp[sortedInp.length - 1].input_per_million_usd : 0;
  const medianInput = trimmed.length ? trimmed[Math.floor(trimmed.length / 2)].input_per_million_usd : 0;
  const avgInput   = trimmed.length ? trimmed.reduce((s, r) => s + r.input_per_million_usd, 0) / trimmed.length : 0;
  const avgOutput  = trimmed.length ? trimmed.reduce((s, r) => s + r.output_per_million_usd, 0) / trimmed.length : 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-white/10 bg-zinc-950 px-6 py-3 flex items-center gap-4 shrink-0">
        <span className="text-lg font-bold tracking-tight">TOKENIX</span>
        <div className="h-4 w-px bg-zinc-700" />
        <div className="flex gap-4 text-xs text-zinc-500">
          <span>{totalModels.toLocaleString()} models</span>
          <span>{totalProviders} providers</span>
          {timestamp && (
            <span>
              Updated{" "}
              <span className="text-zinc-400">
                {new Date(timestamp).toUTCString().replace(" GMT", " UTC")}
              </span>
            </span>
          )}
        </div>
        <div className="ml-auto">
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
            Live
          </span>
        </div>
      </header>

      {/* Ticker */}
      <Ticker items={ticker} />

      {/* Stats row */}
      <div className="border-b border-white/10 bg-zinc-900/40 px-6 py-3 flex flex-wrap gap-6 text-sm shrink-0">
        {[
          { label: "Cheapest Input",        value: `$${minInput.toFixed(4)}/M`,    color: "text-emerald-400" },
          { label: "Most Expensive Input",  value: `$${maxInput.toFixed(2)}/M`,   color: "text-rose-400"    },
          { label: "Median Input",          value: `$${medianInput.toFixed(2)}/M`, color: "text-zinc-300"    },
          { label: "Avg Input (p99)",       value: `$${avgInput.toFixed(2)}/M`,   color: "text-zinc-300"    },
          { label: "Avg Output (p99)",      value: `$${avgOutput.toFixed(2)}/M`,  color: "text-zinc-300"    },
          { label: "Sources",               value: sources.join(", "),             color: "text-zinc-400"    },
        ].map((stat) => (
          <div key={stat.label} className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500">{stat.label}</span>
            <span className={`font-mono font-medium text-sm ${stat.color}`}>{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Table */}
      <main className="flex-1 px-6 py-6">
        <PriceTable rows={rows} sources={sources} providers={providers} />
      </main>

      <footer className="border-t border-white/10 px-6 py-3 text-xs text-zinc-600 flex justify-between">
        <span>Sources: OpenRouter · LiteLLM DB · DeepInfra · NovitaAI · Groq · Perplexity · Fireworks</span>
        <span>Prices in USD per million tokens</span>
      </footer>
    </div>
  );
}
