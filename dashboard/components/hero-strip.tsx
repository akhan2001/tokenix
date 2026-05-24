interface HeroStripProps {
  minInput: number;
  maxInput: number;
  medianInput: number;
  avgOutput: number;
  providerCount: number;
  totalModels: number;
}

function fmtPrice(n: number): string {
  if (n >= 1000) return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (n >= 1) return "$" + n.toFixed(2);
  if (n >= 0.01) return "$" + n.toFixed(3);
  return "$" + n.toFixed(4);
}

export function HeroStrip({ minInput, maxInput, medianInput, avgOutput, providerCount, totalModels }: HeroStripProps) {
  const items = [
    { label: "CHEAPEST INPUT",   value: fmtPrice(minInput) + "/M",    sub: "lowest available",                             tone: "#3DDC84" },
    { label: "MOST EXPENSIVE",   value: fmtPrice(maxInput) + "/M",    sub: "highest listed",                               tone: "#FF4D5E" },
    { label: "MEDIAN INPUT",     value: fmtPrice(medianInput) + "/M", sub: `across ${totalModels.toLocaleString()} models`, tone: "#E0E0E0" },
    { label: "AVG OUTPUT (P99)", value: fmtPrice(avgOutput) + "/M",   sub: "trimmed mean",                                 tone: "#E0E0E0" },
    { label: "PROVIDERS",        value: String(providerCount),         sub: "tracked",                                      tone: "#E0E0E0" },
  ];

  return (
    <section
      className="grid-bg"
      style={{
        borderBottom: "1px solid #05260F",
        background: "linear-gradient(180deg, rgba(5,38,15,0.45) 0%, rgba(5,38,15,0.25) 100%)",
      }}
    >
      <div className="hero-grid">
        {items.map((item) => (
          <div key={item.label} className="hero-item">
            <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: "#7A7A7A" }}>
              {item.label}
            </span>
            <div
              className="hero-value"
              style={{ fontFamily: "var(--font-jetbrains), ui-monospace, monospace", fontWeight: 600, color: item.tone, letterSpacing: "-0.01em", lineHeight: 1 }}
            >
              {item.value}
            </div>
            <div style={{ fontFamily: "var(--font-jetbrains), ui-monospace, monospace", fontSize: 10, color: "#7A7A7A" }}>
              {item.sub}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
