import { loadPrices, loadAcpi, loadAcpiHistory } from "@/lib/data";
import { HeroSection } from "@/components/sections/hero-section";
import { ProblemSection } from "@/components/sections/problem-section";
import { IndexSection } from "@/components/sections/index-section";
import { GatewaySection } from "@/components/sections/gateway-section";
import { MethodologySection } from "@/components/sections/methodology-section";
import { CtaSection } from "@/components/sections/cta-section";

export const dynamic = "force-dynamic";

export default function Home() {
  const rows = loadPrices();
  const acpiData = loadAcpi();
  const acpiHistory = loadAcpiHistory();

  // Named frontier models at their real blended (75/25) rates, for the gateway
  // teaser's comparison list. o1-pro is excluded as an outlier at ~$262/1M —
  // it would carry the whole comparison on its own.
  const gatewayComparisons = [...rows]
    .map((r) => ({
      name: r.model_name || r.model_id,
      blended: r.input_per_million_usd * 0.75 + r.output_per_million_usd * 0.25,
    }))
    .filter((m) => m.blended > 0 && m.blended < 100)
    .sort((a, b) => b.blended - a.blended)
    .slice(0, 4);

  const providerCount = new Set(rows.map((r) => r.provider).filter(Boolean)).size;

  return (
    <>
      {/* ── HERO ─────────────────────────────────────────────── */}
      <HeroSection acpi={acpiData} history={acpiHistory} />

      {/* ── PROBLEM ──────────────────────────────────────────── */}
      <ProblemSection
        modelCount={acpiData?.model_count ?? rows.length}
        providerCount={acpiData?.provider_count ?? providerCount}
      />

      {/* ── INDEX ────────────────────────────────────────────── */}
      <IndexSection
        rows={rows}
        modelCount={acpiData?.model_count ?? rows.length}
        providerCount={acpiData?.provider_count ?? providerCount}
      />

      {/* ── GATEWAY ──────────────────────────────────────────── */}
      <GatewaySection acpiRate={acpiData?.acpi ?? 0} comparisons={gatewayComparisons} />

      {/* ── METHODOLOGY ──────────────────────────────────────── */}
      <MethodologySection
        modelCount={acpiData?.model_count ?? rows.length}
        providerCount={acpiData?.provider_count ?? providerCount}
      />

      <CtaSection />
    </>
  );
}
