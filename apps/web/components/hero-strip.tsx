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
    { label: "Cheapest Input",   value: fmtPrice(minInput) + "/M",    sub: "lowest available",                               tone: "var(--green)" },
    { label: "Most Expensive",   value: fmtPrice(maxInput) + "/M",    sub: "highest listed",                                 tone: "var(--red)" },
    { label: "Median Input",     value: fmtPrice(medianInput) + "/M", sub: `across ${totalModels.toLocaleString()} models`,  tone: "var(--text)" },
    { label: "Avg Output (P99)", value: fmtPrice(avgOutput) + "/M",   sub: "trimmed mean",                                   tone: "var(--text)" },
    { label: "Providers",        value: String(providerCount),         sub: "companies tracked",                              tone: "var(--accent)" },
  ];

  return (
    <section style={{ borderBottom: "1px solid var(--border)", background: "var(--s1)" }}>
      <div className="hero-grid">
        {items.map((item) => (
          <div key={item.label} className="hero-item">
            <span
              style={{
                fontSize: 9,
                fontWeight: 400,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "var(--text3)",
                fontFamily: "var(--mono)",
              }}
            >
              {item.label}
            </span>
            <div
              className="hero-value"
              style={{
                fontFamily: "var(--serif)",
                fontWeight: 500,
                color: item.tone,
                letterSpacing: "-0.01em",
                lineHeight: 1,
              }}
            >
              {item.value}
            </div>
            <div
              style={{
                fontFamily: "var(--mono)",
                fontSize: 11,
                color: "var(--text3)",
              }}
            >
              {item.sub}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
