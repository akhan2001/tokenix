import { loadPrices, tickerModels } from "@/lib/data";
import { Header } from "@/components/header";
import { Ticker } from "@/components/ticker";
import { HeroStrip } from "@/components/hero-strip";
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
  const avgOutput   = trimmed.length ? trimmed.reduce((s, r) => s + r.output_per_million_usd, 0) / trimmed.length : 0;

  const providerCount = new Set(rows.map((r) => r.provider).filter(Boolean)).size;

  return (
    <div className="scanlines min-h-screen flex flex-col" style={{ background: "#000000", color: "#E0E0E0" }}>
      <Header />
      <Ticker items={ticker} />
      <HeroStrip
        minInput={minInput}
        maxInput={maxInput}
        medianInput={medianInput}
        avgOutput={avgOutput}
        providerCount={providerCount}
        totalModels={rows.length}
      />
      <main className="flex-1">
        <PriceTable rows={rows} providers={providers} />
      </main>
      <footer
        className="flex items-center justify-between flex-wrap gap-4 px-6 py-4"
        style={{ borderTop: "1px solid #05260F" }}
      >
        <div className="flex items-center gap-4">
          <span className="logo-mark">TX</span>
          <span style={{ fontSize: 11, color: "#7A7A7A" }}>© 2025 TOKENIX</span>
        </div>
        <div className="flex items-center gap-4">
          {["Methodology", "Status", "Terms"].map((link) => (
            <a key={link} href="#" className="footer-link">{link}</a>
          ))}
          <span style={{ fontSize: 11, color: "#7A7A7A", borderLeft: "1px solid #05260F", paddingLeft: 16 }}>
            Prices in USD per million tokens
          </span>
        </div>
      </footer>
    </div>
  );
}
