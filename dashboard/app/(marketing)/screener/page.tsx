import { loadPrices, tickerModels } from "@/lib/data";
import { Ticker } from "@/components/ticker";
import { HeroStrip } from "@/components/hero-strip";
import { PriceTable } from "@/components/price-table";

export const dynamic = "force-dynamic";

export default function Screener() {
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
  const avgOutput   = trimmed.length ? trimmed.reduce((s, r) => s + r.output_per_million_usd, 0) / trimmed.length : 0;
  const providerCount = new Set(rows.map((r) => r.provider).filter(Boolean)).size;

  return (
    <>
      <Ticker items={ticker} />
      <HeroStrip
        minInput={minInput}
        maxInput={maxInput}
        medianInput={medianInput}
        avgOutput={avgOutput}
        providerCount={providerCount}
        totalModels={rows.length}
      />
      <main style={{ flex: 1 }}>
        <PriceTable rows={rows} providers={providers} />
      </main>
    </>
  );
}
