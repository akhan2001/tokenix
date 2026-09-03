"use client";

import { useState, useMemo } from "react";
import type { PriceRow } from "@/lib/data";

type SortKey = keyof Pick<PriceRow, "provider" | "model_name" | "context_length" | "input_per_million_usd" | "output_per_million_usd">;
type SortDir = "asc" | "desc";
type TierKey = "S" | "A" | "B" | "C";

/**
 * Quality-tier badge colours. Four categorical values, so the set is chosen
 * for pairwise separation under dichromacy, not for hue variety.
 *
 * Validated against the dark surface #07070a. Method: Vienot 1999 dichromat
 * simulation (sRGB D65), difference reported as CIEDE2000.
 *   S #ffd08a 14.03:1   A #5eb0ff 8.75:1   B #c9d1e0 13.11:1   C #7a8296 5.23:1
 *   worst pair (A/C): dE00 20.0 deuteranope / 18.7 protanope
 * The previous light-surface set (#c8a96e/#6e9fc8/#4caf7d/#8a96a8) fell to 9.4
 * deuteranope and 4.7 protanope on the worst pair — inside the confusion floor.
 * The tier letter is still rendered alongside, so colour is never the sole
 * carrier; the set is built to not need that fallback.
 */
const TIER_COLORS: Record<TierKey, { fg: string; bd: string }> = {
  S: { fg: "var(--tier-s)", bd: "rgba(255,208,138,0.3)" },
  A: { fg: "var(--tier-a)", bd: "rgba(94,176,255,0.3)" },
  B: { fg: "var(--tier-b)", bd: "rgba(201,209,224,0.3)" },
  C: { fg: "var(--tier-c)", bd: "rgba(122,130,150,0.3)" },
};

const TIER_LABELS: Record<TierKey, string> = {
  S: "Frontier  ≥ $10/M",
  A: "Advanced  $1–$10/M",
  B: "Standard  $0.1–$1/M",
  C: "Economy   < $0.1/M",
};

function getTier(inp: number): TierKey {
  if (inp >= 10) return "S";
  if (inp >= 1) return "A";
  if (inp >= 0.1) return "B";
  return "C";
}

function fmtCtx(raw: string) {
  const n = parseInt(raw.replace(/,/g, ""), 10);
  if (!n || isNaN(n)) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function fmtPrice(n: number): string {
  if (n >= 1000) return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (n >= 1) return "$" + n.toFixed(2);
  if (n >= 0.01) return "$" + n.toFixed(3);
  return "$" + n.toFixed(4);
}

function TierBadge({ t }: { t: TierKey }) {
  const c = TIER_COLORS[t];
  return (
    <span
      title={TIER_LABELS[t]}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 20,
        height: 20,
        fontFamily: "var(--mono)",
        fontSize: 11,
        fontWeight: 400,
        color: c.fg,
        border: `1px solid ${c.bd}`,
        background: "transparent",
      }}
    >
      {t}
    </span>
  );
}

function SortArrows({ col, sort }: { col: SortKey; sort: { key: SortKey; dir: SortDir } }) {
  const active = sort.key === col;
  return (
    <span
      style={{
        display: "inline-flex",
        flexDirection: "column",
        marginLeft: 4,
        lineHeight: 0.7,
        verticalAlign: "middle",
      }}
    >
      <span style={{ fontSize: 7, color: active && sort.dir === "asc" ? "var(--accent)" : "var(--border2)", lineHeight: 1 }}>▲</span>
      <span style={{ fontSize: 7, color: active && sort.dir === "desc" ? "var(--accent)" : "var(--border2)", lineHeight: 1 }}>▼</span>
    </span>
  );
}

const PAGE_SIZES = [25, 50, 100];

function PgBtn({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      style={{
        height: 28,
        padding: "0 12px",
        border: "1px solid var(--border)",
        color: "var(--text2)",
        fontSize: 11,
        fontFamily: "var(--mono)",
        background: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.3 : 1,
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        transition: "all 0.15s",
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.borderColor = "var(--accent-dim)";
          e.currentTarget.style.color = "var(--accent)";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.color = "var(--text2)";
      }}
    >
      {children}
    </button>
  );
}

function PgNum({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        minWidth: 28,
        height: 28,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        border: active ? "1px solid var(--accent-dim)" : "1px solid var(--border)",
        background: active ? "var(--s1)" : "transparent",
        color: active ? "var(--accent)" : "var(--text3)",
        fontFamily: "var(--mono)",
        fontSize: 11,
        cursor: "pointer",
        transition: "all 0.15s",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.borderColor = "var(--accent-dim)";
          e.currentTarget.style.color = "var(--text)";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.borderColor = "var(--border)";
          e.currentTarget.style.color = "var(--text3)";
        }
      }}
    >
      {children}
    </button>
  );
}

function Pagination({
  page,
  totalPages,
  setPage,
  total,
  rowsPerPage,
  setRowsPerPage,
}: {
  page: number;
  totalPages: number;
  setPage: (action: React.SetStateAction<number>) => void;
  total: number;
  rowsPerPage: number;
  setRowsPerPage: (n: number) => void;
}) {
  const start = (page - 1) * rowsPerPage + 1;
  const end = Math.min(page * rowsPerPage, total);

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
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 0",
        borderTop: "1px solid var(--border)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <PgBtn disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
          ← Prev
        </PgBtn>

        {totalPages > 1 && (
          <div className="pg-numbers">
            {pages.map((p, i) => {
              const prev = pages[i - 1];
              return (
                <span key={p} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  {prev && p - prev > 1 && (
                    <span style={{ color: "var(--text3)", fontSize: 11, fontFamily: "var(--mono)" }}>···</span>
                  )}
                  <PgNum active={p === page} onClick={() => setPage(p)}>
                    {p}
                  </PgNum>
                </span>
              );
            })}
          </div>
        )}

        <PgBtn
          disabled={page >= totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
        >
          Next →
        </PgBtn>

        <span style={{ width: 1, height: 16, background: "var(--border)", margin: "0 4px" }} />

        {PAGE_SIZES.map((n) => (
          <PgNum
            key={n}
            active={rowsPerPage === n}
            onClick={() => {
              setRowsPerPage(n);
              setPage(1);
            }}
          >
            {n}
          </PgNum>
        ))}
        <span style={{ fontSize: 10, color: "var(--text3)", fontFamily: "var(--mono)" }}>
          / page
        </span>
      </div>

      <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--text3)" }}>
        <span style={{ color: "var(--text)" }}>{start.toLocaleString()}</span>
        <span style={{ margin: "0 4px" }}>—</span>
        <span style={{ color: "var(--text)" }}>{end.toLocaleString()}</span>
        <span style={{ margin: "0 8px" }}>of</span>
        <span style={{ color: "var(--text)" }}>{total.toLocaleString()}</span>
      </div>
    </div>
  );
}

export function PriceTable({ rows, providers }: { rows: PriceRow[]; providers: string[] }) {
  const [search, setSearch] = useState("");
  const [providerFilter, setProviderFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: "input_per_million_usd",
    dir: "asc",
  });
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  function toggleSort(key: SortKey) {
    setSort((s) =>
      s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }
    );
    setPage(1);
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter((r) => {
      if (providerFilter !== "all" && r.provider !== providerFilter) return false;
      if (tierFilter !== "all" && getTier(r.input_per_million_usd) !== tierFilter) return false;
      if (
        q &&
        !r.model_name.toLowerCase().includes(q) &&
        !r.model_id.toLowerCase().includes(q) &&
        !r.provider.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [rows, search, providerFilter, tierFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sort.key],
        bv = b[sort.key];
      const cmp =
        typeof av === "number" ? av - (bv as number) : String(av).localeCompare(String(bv));
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / rowsPerPage));
  const pageRows = sorted.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const SortTh = ({
    id,
    label,
    align = "left",
    width,
  }: {
    id: SortKey;
    label: string;
    align?: "left" | "right" | "center";
    width?: number;
  }) => (
    <th
      onClick={() => toggleSort(id)}
      style={{
        cursor: "pointer",
        userSelect: "none",
        padding: "10px 14px",
        textAlign: align,
        width,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          fontSize: 9,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: sort.key === id ? "var(--accent)" : "var(--text3)",
          fontWeight: 400,
        }}
      >
        {label}
        <SortArrows col={id} sort={sort} />
      </span>
    </th>
  );

  const paginationProps = { page, totalPages, setPage, total: sorted.length, rowsPerPage, setRowsPerPage };
  const cellPad = "11px 14px";

  return (
    <div className="flex flex-col screener-wrap">
      {/* Heading + filter bar */}
      <div className="screener-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h2
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 500,
              fontFamily: "var(--serif)",
              letterSpacing: "-0.012em",
              color: "var(--text)",
            }}
          >
            Live Screener
          </h2>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "2px 9px",
              fontSize: 9,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              border: "1px solid var(--border)",
              color: "var(--text3)",
            }}
          >
            <span className="pulse-dot" style={{ width: 5, height: 5 }} />
            <span style={{ fontFamily: "var(--mono)" }}>{sorted.length.toLocaleString()}</span>
            <span>models</span>
          </span>
        </div>

        <div className="screener-filters">
          {/* Search */}
          <div style={{ position: "relative" }} className="screener-search">
            <span
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text3)",
                fontSize: 13,
              }}
            >
              ⌕
            </span>
            <input
              placeholder="Search model or provider…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{
                height: 30,
                background: "var(--bg)",
                border: "1px solid var(--border)",
                color: "var(--text)",
                padding: "0 28px",
                fontSize: 12,
                fontFamily: "var(--mono)",
                width: "100%",
                outline: "none",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent-dim)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                style={{
                  position: "absolute",
                  right: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text3)",
                  fontSize: 11,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            )}
          </div>

          <select
            value={providerFilter}
            onChange={(e) => {
              setProviderFilter(e.target.value);
              setPage(1);
            }}
            className="screener-select"
          >
            <option value="all">all providers</option>
            {providers.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <select
            value={tierFilter}
            onChange={(e) => {
              setTierFilter(e.target.value);
              setPage(1);
            }}
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
        <table
          style={{
            borderCollapse: "collapse",
            width: "100%",
            fontSize: 12,
            borderLeft: "1px solid var(--border)",
            borderRight: "1px solid var(--border)",
          }}
        >
          <thead>
            <tr
              style={{
                background: "var(--s1)",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <th
                style={{
                  width: 40,
                  padding: cellPad,
                  color: "var(--text3)",
                  fontSize: 9,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  textAlign: "left",
                  fontWeight: 400,
                }}
              >
                #
              </th>
              <SortTh id="provider" label="Provider" width={160} />
              <SortTh id="model_name" label="Model" />
              <th
                style={{
                  width: 60,
                  padding: cellPad,
                  textAlign: "center",
                  color: "var(--text3)",
                  fontSize: 9,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  fontWeight: 400,
                }}
              >
                Tier
              </th>
              <SortTh id="context_length" label="Context" align="right" width={90} />
              <SortTh id="input_per_million_usd" label="Input /1M" align="right" width={120} />
              <SortTh id="output_per_million_usd" label="Output /1M" align="right" width={120} />
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  style={{ padding: 40, textAlign: "center", color: "var(--text3)" }}
                >
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
                  style={{ borderBottom: "1px solid var(--border)", transition: "background 0.12s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--s1)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                >
                  <td
                    style={{
                      padding: cellPad,
                      fontFamily: "var(--mono)",
                      fontSize: 10,
                      color: "var(--text3)",
                    }}
                  >
                    {absIdx}
                  </td>
                  <td style={{ padding: cellPad, color: "var(--text2)" }}>
                    {row.provider || "—"}
                  </td>
                  <td style={{ padding: cellPad }}>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ color: "var(--text)" }}>
                        {row.model_name.replace(/^[A-Za-z][A-Za-z0-9 ]+:\s*/, "")}
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--mono)",
                          color: "var(--text3)",
                          fontSize: 10,
                        }}
                      >
                        {row.model_id}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: cellPad, textAlign: "center" }}>
                    <TierBadge t={t} />
                  </td>
                  <td
                    style={{
                      padding: cellPad,
                      textAlign: "right",
                      fontFamily: "var(--mono)",
                      color: "var(--text3)",
                    }}
                  >
                    {fmtCtx(row.context_length)}
                  </td>
                  <td
                    style={{
                      padding: cellPad,
                      textAlign: "right",
                      fontFamily: "var(--mono)",
                      color: "var(--accent)",
                    }}
                  >
                    {fmtPrice(row.input_per_million_usd)}
                  </td>
                  <td
                    style={{
                      padding: cellPad,
                      textAlign: "right",
                      fontFamily: "var(--mono)",
                      color: "var(--text2)",
                    }}
                  >
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
