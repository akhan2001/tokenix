import { Globe } from "./globe";

interface HeroProps {
  compositeIndex: number;
  modelsTracked: number;
  lastUpdated: string | null;
}

export function Hero({ compositeIndex, modelsTracked, lastUpdated }: HeroProps) {
  return (
    <section className="w-full bg-zinc-950 border-b border-white/10 px-10 py-16 flex flex-col lg:flex-row items-center gap-10 lg:gap-0">

      {/* Left — copy */}
      <div className="flex-1 flex flex-col gap-6 max-w-lg">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-[10px] uppercase tracking-[0.2em] text-emerald-400 font-medium">
            Live pricing data
          </span>
        </div>

        <h2 className="text-[3.5rem] font-black uppercase leading-[0.9] tracking-tight text-white">
          The price<br />
          index for<br />
          <span className="text-emerald-400">AI tokens</span>
        </h2>

        <p className="text-zinc-400 text-base leading-relaxed">
          Real-time inference pricing across every major model —
          scraped, normalized, and benchmarked across{" "}
          <span className="text-white font-medium">{modelsTracked.toLocaleString()} models</span>{" "}
          from 15+ sources.
        </p>

        {/* Quick stats */}
        <div className="flex gap-6 border-t border-white/10 pt-6">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest text-zinc-500">Composite index</span>
            <span className="text-2xl font-black font-mono text-white">${compositeIndex.toFixed(2)}</span>
            <span className="text-[10px] text-zinc-500">per 1M tokens</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest text-zinc-500">Models tracked</span>
            <span className="text-2xl font-black font-mono text-white">{modelsTracked.toLocaleString()}</span>
            <span className="text-[10px] text-zinc-500">& growing</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest text-zinc-500">Last updated</span>
            <span className="text-2xl font-black font-mono text-white">{lastUpdated ?? "—"}</span>
            <span className="text-[10px] text-zinc-500">real-time</span>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <a
            href="#table"
            className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-[11px] uppercase tracking-widest px-5 py-2.5 rounded-lg transition-colors"
          >
            View index
          </a>
          <a
            href="#"
            className="border border-zinc-700 hover:border-zinc-500 text-zinc-300 font-medium text-[11px] uppercase tracking-widest px-5 py-2.5 rounded-lg transition-colors"
          >
            Methodology
          </a>
        </div>
      </div>

      {/* Right — globe */}
      <div className="shrink-0 flex items-center justify-center lg:flex-1">
        <Globe size={460} />
      </div>
    </section>
  );
}
