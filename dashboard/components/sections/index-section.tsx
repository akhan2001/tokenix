import type { PriceRow } from "@/lib/data";
import { Button, Container, H2, BODY, LABEL, DATA } from "@/components/primitives";

/**
 * Landing-page teaser for the index. Intro copy plus a glimpse of real rows,
 * fading out into a link to the full screener.
 *
 * Ported from data/tokenix-index-screener.html. It deliberately does NOT
 * recreate the screener: components/price-table.tsx already carries the real
 * search, provider/tier filters, bidirectional sort and pagination. This is a
 * window onto that, not a second implementation of it.
 *
 * One column changed. The mockup has a "Quality" column with a score bar, but
 * there is no quality field on PriceRow, and only 27 of 332 models carry a
 * benchmark score at all (screener.scored_model_count in acpi_latest.json).
 * A quality number on an arbitrary sample would have been invented. It is
 * replaced with the 75/25 input:output blended rate, which is the figure ACPI
 * is actually built from and is derivable for every row.
 *
 * Layout is inline, deliberately. The first version put the column widths in
 * global CSS classes and rendered as an unstyled text dump whenever the
 * stylesheet was stale — price-table.tsx never had that failure because it
 * styles inline, which is also the house convention. Structure is inline here;
 * the stylesheet carries only hover and responsive overrides, so losing it
 * costs polish rather than the whole table.
 */

const COL = {
  model: { flex: "1 1 auto", minWidth: 0, paddingRight: 12 },
  provider: { width: 130, ...DATA, color: "var(--ink-dim)" },
  price: { width: 110, ...DATA },
  blended: { width: 110, ...DATA },
  context: { width: 90, ...DATA, color: "var(--ink-dim)" },
  updated: { width: 90, ...DATA, color: "var(--ink-dim)" },
} as const;

const ROW = {
  display: "flex",
  alignItems: "flex-start",
  padding: "12px 16px",
  borderBottom: "1px solid var(--line)",
} as const;

const PREVIEW_ROWS = 8;

/** The 75/25 input:output blend ACPI uses. */
function blended(r: PriceRow): number {
  return r.input_per_million_usd * 0.75 + r.output_per_million_usd * 0.25;
}

function fmt(n: number): string {
  if (n >= 100) return "$" + n.toFixed(0);
  if (n >= 1) return "$" + n.toFixed(2);
  return "$" + n.toFixed(3);
}

function fmtContext(ctx: string): string {
  const n = Number(ctx);
  if (!Number.isFinite(n) || n <= 0) return "—";
  if (n >= 1000) return `${Math.round(n / 1000)}K`;
  return String(n);
}

function relative(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const mins = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export function IndexSection({
  rows,
  modelCount,
  providerCount,
}: {
  rows: PriceRow[];
  modelCount: number;
  providerCount: number;
}) {
  // A representative slice rather than the cheapest tail: sample across the
  // sorted range so the preview shows the spread the index actually covers.
  const priced = rows.filter((r) => r.input_per_million_usd > 0);
  const sorted = [...priced].sort((a, b) => blended(b) - blended(a));
  const step = Math.max(1, Math.floor(sorted.length / PREVIEW_ROWS));
  const preview = Array.from({ length: PREVIEW_ROWS }, (_, i) => sorted[i * step]).filter(
    Boolean,
  );

  return (
    <section
      id="index"
      style={{
        padding: "var(--space-section-lg) var(--pad-x)",
        borderTop: "1px solid var(--line)",
      }}
    >
      <Container>
      <div style={{ maxWidth: 640, marginBottom: 44 }}>
        <h2
          style={{ ...H2, marginBottom: 20, color: "var(--ink)" }}
        >
          No model priced blind.
        </h2>
        <p style={{ ...BODY, color: "var(--ink-dim)", marginBottom: 14 }}>
          Every model tracked by ACPI, in one table — live price per million tokens, provider,
          blended rate, and context window, refreshed hourly from {providerCount} sources.
        </p>
        <p style={{ ...BODY, color: "var(--ink-dim)", marginBottom: 14 }}>
          No bundled SKUs, no vendor-quoted rate cards. Filter, sort, and compare the same numbers
          your team uses to decide what to actually run.
        </p>
        <Button href="/screener" variant="text" style={{ marginTop: 10 }}>Explore the full screener</Button>
      </div>

      <div style={{ position: "relative" }}>
        <div
          style={{
            border: "1px solid var(--line-strong)",
            borderRadius: "var(--radius-panel)",
            overflow: "hidden",
            background: "var(--panel)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              height: 46,
              padding: "0 16px",
              borderBottom: "1px solid var(--line)",
              ...LABEL,
            }}
          >
            <span style={{ color: "var(--ink-dim)" }}>Screener</span>
            <span style={{ color: "var(--ink-faint)" }}>/</span>
            <span style={{ color: "var(--ink)" }}>All Models</span>
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
              <span className="idx-stat" style={{ color: "var(--ink-faint)", fontSize: 11 }}>
                {modelCount} MODELS · {providerCount} PROVIDERS
              </span>
              <Button
                href="/screener"
                variant="secondary"
                style={{ fontSize: 12, padding: "6px 10px" }}
              >
                Open full screener
              </Button>
            </div>
          </div>

          <div
            style={{
              ...ROW,
              alignItems: "center",
              height: 38,
              padding: "0 16px",
              ...LABEL,
              color: "var(--ink-faint)",
            }}
          >
            <div style={COL.model}>Model</div>
            <div style={{ ...COL.provider, color: "inherit" }}>Provider</div>
            <div style={COL.price}>Input / 1M</div>
            <div className="idx-hide-sm" style={COL.blended}>Blended / 1M</div>
            <div className="idx-hide-sm" style={{ ...COL.context, color: "inherit" }}>Context</div>
            <div className="idx-hide-sm" style={{ ...COL.updated, color: "inherit" }}>Updated</div>
          </div>

          {preview.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--ink-faint)", fontSize: 13 }}>
              Price data is unavailable — the hourly snapshot has not been written yet.
            </div>
          ) : (
            preview.map((r) => (
              <div key={r.model_id} className="idx-datarow" style={ROW}>
                <div style={COL.model}>
                  <div style={{ fontSize: 13.5, color: "var(--ink)", marginBottom: 3 }}>
                    {r.model_name || r.model_id}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--ink-faint)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {r.model_id}
                  </div>
                </div>
                <div style={COL.provider}>{r.provider || "—"}</div>
                <div style={{ ...COL.price, color: "var(--ink)" }}>
                  {fmt(r.input_per_million_usd)}
                </div>
                <div className="idx-hide-sm" style={{ ...COL.blended, color: "var(--amber-hot)" }}>
                  {fmt(blended(r))}
                </div>
                <div className="idx-hide-sm" style={COL.context}>{fmtContext(r.context_length)}</div>
                <div className="idx-hide-sm" style={COL.updated}>{relative(r.timestamp)}</div>
              </div>
            ))
          )}
        </div>

        <div
          aria-hidden
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: "46%",
            background: "linear-gradient(180deg, transparent, var(--panel) 92%)",
            pointerEvents: "none",
            borderRadius: "0 0 var(--radius-panel) var(--radius-panel)",
          }}
        />
      </div>
      </Container>
    </section>
  );
}
