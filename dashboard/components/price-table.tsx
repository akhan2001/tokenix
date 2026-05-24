"use client";

import { useState, useMemo } from "react";
import type { PriceRow } from "@/lib/data";

type SortKey = keyof Pick<PriceRow, "provider" | "model_name" | "context_length" | "input_per_million_usd" | "output_per_million_usd">;
type SortDir = "asc" | "desc";
type TierKey = "S" | "A" | "B" | "C";

const TIER_COLORS: Record<TierKey, { fg: string; bd: string; bg: string }> = {
  S: { fg: "#F5B300", bd: "#3a2a05", bg: "rgba(245,179,0,0.08)" },
  A: { fg: "#3FA3FF", bd: "#0a2540", bg: "rgba(63,163,255,0.08)" },
  B: { fg: "#3DDC84", bd: "#0a3a20", bg: "rgba(61,220,132,0.08)" },
  C: { fg: "#7A7A7A", bd: "#222",    bg: "rgba(122,122,122,0.06)" },
};

const TIER_LABELS: Record<TierKey, string> = {
  S: "Frontier  ≥ $10/M",
  A: "Advanced  $1–$10/M",
  B: "Standard  $0.1–$1/M",
  C: "Economy   < $0.1/M",
};

function getTier(inp: number): TierKey {
  if (inp >= 10) return "S";
  if (inp >= 1)  return "A";
  if (inp >= 0.1) return "B";
  return "C";
}

function fmtCtx(raw: string) {
  const n = parseInt(raw.replace(/,/g, ""), 10);
  if (!n || isNaN(n)) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function fmtPrice(n: number): string {
  if (n >= 1000) return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (n >= 1)    return "$" + n.toFixed(2);
  if (n >= 0.01) return "$" + n.toFixed(3);
  return "$" + n.toFixed(4);
}

function TierBadge({ t }: { t: TierKey }) {
  const c = TIER_COLORS[t];
  return (
    <span
      title={TIER_LABELS[t]}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 18, height: 18,
        fontFamily: "var(--font-jetbrains), ui-monospace, monospace",
        fontSize: 10, fontWeight: 700,
        color: c.fg, borderColor: c.bd, background: c.bg,
        border: "1px solid",
      }}
    >
      {t}
    </span>
  );
}

function SortArrows({ col, sort }: { col: SortKey; sort: { key: SortKey; dir: SortDir } }) {
  const active = sort.key === col;
  return (
    <span style={{ display: "inline-flex", flexDirection: "column", marginLeft: 4, lineHeight: 0.7, verticalAlign: "middle" }}>
      <span style={{ fontSize: 7, color: active && sort.dir === "asc"  ? "#00A32A" : "#05260F", lineHeight: 1 }}>▲</span>
      <span style={{ fontSize: 7, color: active && sort.dir === "desc" ? "#00A32A" : "#05260F", lineHeight: 1 }}>▼</span>
    </span>
  );
}

const PAGE_SIZES = [25, 50, 100];

function Pagination({
  page, totalPages, setPage, total, rowsPerPage, setRowsPerPage,
}: {
  page: number;
  totalPages: number;
  setPage: (action: React.SetStateAction<number>) => void;
  total: number;
  rowsPerPage: number;
  setRowsPerPage: (n: number) => void;
}) {
  const start = (page - 1) * rowsPerPage + 1;
  const end   = Math.min(page * rowsPerPage, total);

  const pages = useMemo(() => {
    const set = new Set([1, totalPages]);
    for (let i = -2; i <= 2; i++) {
      const p = page + i;
      if (p >= 1 && p <= totalPages) set.add(p);
    }
    return Array.from(set).sort((a, b) => a - b);
  }, [page, totalPages]);

  if (totalPages <= 1 && rowsPerPage === 50) return null;

  return (
    <div
      className="flex items-center justify-between"
      style={{ padding: "10px 0", borderTop: "1px solid #05260F", borderBottom: "1px solid #05260F" }}
    >
      <div className="flex items-center gap-2">
        <PgBtn disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>← Prev</PgBtn>

        {totalPages > 1 && (
          <div className="pg-numbers">
            {pages.map((p, i) => {
              const prev = pages[i - 1];
              return (
                <span key={p} className="flex items-center gap-1">
                  {prev && p - prev > 1 && (
                    <span style={{ color: "#4a4a4a", fontSize: 11, fontFamily: "var(--font-jetbrains), ui-monospace, monospace" }}>···</span>
                  )}
                  <PgNum active={p === page} onClick={() => setPage(p)}>{p}</PgNum>
                </span>
              );
            })}
          </div>
        )}

        <PgBtn disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next →</PgBtn>

        <span style={{ width: 1, height: 16, background: "#05260F", margin: "0 4px" }} />
        {PAGE_SIZES.map((n) => (
          <PgNum key={n} active={rowsPerPage === n} onClick={() => { setRowsPerPage(n); setPage(1); }}>
            {n}
          </PgNum>
        ))}
        <span style={{ fontSize: 10, color: "#7A7A7A" }}>/ page</span>
      </div>

      <div style={{ fontFamily: "var(--font-jetbrains), ui-monospace, monospace", fontSize: 11, color: "#7A7A7A" }}>
        <span style={{ color: "#E0E0E0" }}>{start.toLocaleString()}</span>
        <span style={{ margin: "0 4px" }}>—</span>
        <span style={{ color: "#E0E0E0" }}>{end.toLocaleString()}</span>
        <span style={{ margin: "0 8px" }}>of</span>
        <span style={{ color: "#E0E0E0" }}>{total.toLocaleString()}</span>
      </div>
    </div>
  );
}

function PgBtn({ children, disabled, onClick }: { children: React.ReactNode; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="flex items-center gap-1 text-xs px-3"
      style={{ height: 28, border: "1px solid #05260F", color: "#E0E0E0", opacity: disabled ? 0.3 : 1, cursor: disabled ? "not-allowed" : "pointer" }}
      onMouseEnter={(e) => { if (!disabled) { e.currentTarget.style.borderColor = "#00A32A"; e.currentTarget.style.color = "#00FF41"; } }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#05260F"; e.currentTarget.style.color = "#E0E0E0"; }}
    >
      {children}
    </button>
  );
}

function PgNum({ children, active, onClick }: { children: React.ReactNode; active?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        minWidth: 28, height: 28,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        border: active ? "1px solid #00A32A" : "1px solid #05260F",
        background: active ? "#05260F" : "transparent",
        color: active ? "#00FF41" : "#7A7A7A",
        fontFamily: "var(--font-jetbrains), ui-monospace, monospace",
        fontSize: 11,
        cursor: "pointer",
      }}
      onMouseEnter={(e) => { if (!active) { e.currentTarget.style.borderColor = "#00A32A"; e.currentTarget.style.color = "#E0E0E0"; } }}
      onMouseLeave={(e) => { if (!active) { e.currentTarget.style.borderColor = "#05260F"; e.currentTarget.style.color = "#7A7A7A"; } }}
    >
      {children}
    </button>
  );
}

export function PriceTable({ rows, providers }: { rows: PriceRow[]; providers: string[] }) {
  const [search, setSearch]           = useState("");
  const [providerFilter, setProviderFilter] = useState("all");
  const [tierFilter, setTierFilter]   = useState("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: "input_per_million_usd", dir: "asc" });
  const [page, setPage]               = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  function toggleSort(key: SortKey) {
    setSort((s) => s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" });
    setPage(1);
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter((r) => {
      if (providerFilter !== "all" && r.provider !== providerFilter) return false;
      if (tierFilter !== "all" && getTier(r.input_per_million_usd) !== tierFilter) return false;
      if (q && !r.model_name.toLowerCase().includes(q) && !r.model_id.toLowerCase().includes(q) && !r.provider.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, search, providerFilter, tierFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sort.key], bv = b[sort.key];
      const cmp = typeof av === "number" ? av - (bv as number) : String(av).localeCompare(String(bv));
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / rowsPerPage));
  const pageRows   = sorted.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const SortTh = ({ id, label, align = "left", width }: { id: SortKey; label: string; align?: "left" | "right" | "center"; width?: number }) => (
    <th
      onClick={() => toggleSort(id)}
      style={{ cursor: "pointer", userSelect: "none", padding: "10px 14px", textAlign: align, width, whiteSpace: "nowrap" }}
    >
      <span style={{ display: "inline-flex", alignItems: "center", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: sort.key === id ? "#00FF41" : "#7A7A7A", fontWeight: 500 }}>
        {label}
        <SortArrows col={id} sort={sort} />
      </span>
    </th>
  );

  const paginationProps = { page, totalPages, setPage, total: sorted.length, rowsPerPage, setRowsPerPage };
  const cellPad = "10px 14px";

  return (
    <div className="flex flex-col screener-wrap">
      {/* Heading + filter bar */}
      <div className="screener-header">
        <div className="flex items-center gap-3">
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600, fontFamily: "var(--font-bricolage), sans-serif", letterSpacing: "-0.015em", color: "#E0E0E0" }}>
            Screener
          </h2>
          <span className="flex items-center gap-1.5" style={{ padding: "2px 8px", fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", border: "1px solid #05260F", color: "#7A7A7A" }}>
            <span className="pulse-dot" style={{ width: 6, height: 6 }} />
            <span style={{ fontFamily: "var(--font-jetbrains), ui-monospace, monospace" }}>{sorted.length.toLocaleString()}</span>
            <span>models</span>
          </span>
        </div>

        <div className="screener-filters">
          <div style={{ position: "relative" }} className="screener-search">
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#7A7A7A", fontSize: 13 }}>⌕</span>
            <input
              placeholder="Search model or provider…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              style={{ height: 30, background: "#000", border: "1px solid #05260F", color: "#E0E0E0", padding: "0 28px", fontSize: 12, width: "100%", outline: "none" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#00A32A")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#05260F")}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "#7A7A7A", fontSize: 11, background: "none", border: "none", cursor: "pointer" }}>
                ✕
              </button>
            )}
          </div>

          <select
            value={providerFilter}
            onChange={(e) => { setProviderFilter(e.target.value); setPage(1); }}
            className="screener-select"
          >
            <option value="all">all providers</option>
            {providers.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>

          <select
            value={tierFilter}
            onChange={(e) => { setTierFilter(e.target.value); setPage(1); }}
            className="screener-select"
          >
            <option value="all">all tiers</option>
            <option value="S">S — frontier</option>
            <option value="A">A — flagship</option>
            <option value="B">B — workhorse</option>
            <option value="C">C — specialized</option>
          </select>
        </div>
      </div>

      <Pagination {...paginationProps} />

      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13, borderLeft: "1px solid #05260F", borderRight: "1px solid #05260F" }}>
          <thead>
            <tr style={{ background: "rgba(5,38,15,0.6)", borderBottom: "1px solid #05260F" }}>
              <th style={{ width: 40, padding: cellPad, color: "#7A7A7A", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", textAlign: "left" }}>#</th>
              <SortTh id="provider"               label="Provider"   width={160} />
              <SortTh id="model_name"             label="Model" />
              <th style={{ width: 60, padding: cellPad, textAlign: "center", color: "#7A7A7A", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase" }}>Tier</th>
              <SortTh id="context_length"         label="Context"    align="right" width={90} />
              <SortTh id="input_per_million_usd"  label="Input /1M"  align="right" width={120} />
              <SortTh id="output_per_million_usd" label="Output /1M" align="right" width={120} />
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 40, textAlign: "center", color: "#7A7A7A" }}>
                  No models match the current filter.
                </td>
              </tr>
            )}
            {pageRows.map((row, idx) => {
              const absIdx = (page - 1) * rowsPerPage + idx + 1;
              const t = getTier(row.input_per_million_usd);
              return (
                <tr
                  key={`${row.source}-${row.model_id}-${idx}`}
                  style={{ borderBottom: "1px solid #05260F" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(5,38,15,0.45)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                >
                  <td style={{ padding: cellPad, fontFamily: "var(--font-jetbrains), ui-monospace, monospace", fontSize: 11, color: "#4a4a4a" }}>
                    {absIdx}
                  </td>
                  <td style={{ padding: cellPad, color: "#E0E0E0", fontWeight: 500 }}>
                    {row.provider || "—"}
                  </td>
                  <td style={{ padding: cellPad }}>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ color: "#E0E0E0", fontWeight: 600 }}>
                        {row.model_name.replace(/^[A-Za-z][A-Za-z0-9 ]+:\s*/, "")}
                      </span>
                      <span style={{ fontFamily: "var(--font-jetbrains), ui-monospace, monospace", color: "#7A7A7A", fontSize: 11 }}>
                        {row.model_id}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: cellPad, textAlign: "center" }}>
                    <TierBadge t={t} />
                  </td>
                  <td style={{ padding: cellPad, textAlign: "right", fontFamily: "var(--font-jetbrains), ui-monospace, monospace", color: "#7A7A7A" }}>
                    {fmtCtx(row.context_length)}
                  </td>
                  <td style={{ padding: cellPad, textAlign: "right", fontFamily: "var(--font-jetbrains), ui-monospace, monospace", color: "#00A32A", fontWeight: 600 }}>
                    {fmtPrice(row.input_per_million_usd)}
                  </td>
                  <td style={{ padding: cellPad, textAlign: "right", fontFamily: "var(--font-jetbrains), ui-monospace, monospace", color: "#00FF41", fontWeight: 600 }}>
                    {fmtPrice(row.output_per_million_usd)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Pagination {...paginationProps} />
    </div>
  );
}
