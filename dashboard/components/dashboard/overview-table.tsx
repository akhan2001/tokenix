"use client";

import { useMemo, useState } from "react";

import { fmtUsd, fmtPct, shortModel } from "@/lib/tokenix-api";

/**
 * The breakdown, as one table both readers can use.
 *
 * Not two tables and not two dashboards. A CFO reads Spend and Δ vs ACPI and
 * stops; a CTO reads Model and Provider to decide what to route where.
 *
 * Typography: Inter throughout, including the numeric columns — the approved
 * design (Claude Design "Tokenix Dashboard.dc.html") runs no monospace
 * anywhere on this page, unlike the marketing site's price-table.tsx, which
 * this was originally copied from. Only `font-variant-numeric: tabular-nums`
 * carries over, so figures still align in a column.
 */

export interface OverviewRow {
  model_id: string;
  provider: string;
  requests: number;
  cost_usd: number;
  acpi_bench_usd: number;
  overpay_usd: number;
}

type SortKey = "model_id" | "provider" | "requests" | "cost_usd" | "acpi_bench_usd" | "overpay_usd";
type SortDir = "asc" | "desc";

const COLUMNS: { key: SortKey; label: string; numeric: boolean }[] = [
  { key: "model_id", label: "Model", numeric: false },
  { key: "provider", label: "Provider", numeric: false },
  { key: "requests", label: "Requests", numeric: true },
  { key: "cost_usd", label: "Spend", numeric: true },
  { key: "acpi_bench_usd", label: "ACPI reference", numeric: true },
  { key: "overpay_usd", label: "Δ vs ACPI", numeric: true },
];

function SortArrows({ col, sort }: { col: SortKey; sort: { key: SortKey; dir: SortDir } }) {
  const active = sort.key === col;
  return (
    <span
      aria-hidden
      style={{ display: "inline-flex", flexDirection: "column", marginLeft: 6, lineHeight: 1 }}
    >
      <span style={{ fontSize: 7, lineHeight: 1, color: active && sort.dir === "asc" ? "#ffa515" : "#3a3a40" }}>▲</span>
      <span style={{ fontSize: 7, lineHeight: 1, color: active && sort.dir === "desc" ? "#ffa515" : "#3a3a40" }}>▼</span>
    </span>
  );
}

export function OverviewTable({ rows }: { rows: OverviewRow[] }) {
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: "cost_usd",
    dir: "desc",
  });

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const x = a[sort.key];
      const y = b[sort.key];
      const cmp =
        typeof x === "number" && typeof y === "number"
          ? x - y
          : String(x).localeCompare(String(y));
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [rows, sort]);

  function toggle(key: SortKey) {
    setSort((current) =>
      current.key === key
        ? { key, dir: current.dir === "asc" ? "desc" : "asc" }
        : { key, dir: COLUMNS.find((c) => c.key === key)?.numeric ? "desc" : "asc" },
    );
  }

  if (rows.length === 0) {
    return (
      <div style={{ padding: "40px 20px", textAlign: "center", fontSize: 13, color: "#6f6f78" }}>
        No priced traffic yet. Once requests flow through the gateway, every model appears here
        with its ACPI reference price.
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
        <thead>
          <tr>
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                scope="col"
                aria-sort={
                  sort.key === col.key ? (sort.dir === "asc" ? "ascending" : "descending") : "none"
                }
                style={{
                  textAlign: col.numeric ? "right" : "left",
                  padding: "0 0 9px",
                  borderBottom: "1px solid rgba(255,255,255,0.07)",
                  fontSize: 11,
                  color: "#6f6f78",
                  fontWeight: 400,
                  whiteSpace: "nowrap",
                }}
              >
                <button
                  type="button"
                  onClick={() => toggle(col.key)}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    font: "inherit",
                    color: sort.key === col.key ? "#ffa515" : "inherit",
                    display: "inline-flex",
                    alignItems: "center",
                  }}
                >
                  {col.label}
                  <SortArrows col={col.key} sort={sort} />
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => {
            const over = row.overpay_usd > 0;
            const pct =
              row.acpi_bench_usd > 0 ? (row.overpay_usd / row.acpi_bench_usd) * 100 : null;
            return (
              <tr key={row.model_id} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <td style={{ padding: "12.5px 0", fontSize: 12.5, color: "#ededf0" }}>
                  {shortModel(row.model_id)}
                </td>
                <td style={{ ...cell, color: "#8a8a93", textAlign: "left" }}>
                  {row.provider || "—"}
                </td>
                <td style={cell}>{row.requests.toLocaleString("en-US")}</td>
                <td style={{ ...cell, color: "#ededf0" }}>{fmtUsd(row.cost_usd)}</td>
                <td style={{ ...cell, color: "#8a8a93" }}>{fmtUsd(row.acpi_bench_usd)}</td>
                <td style={{ ...cell, color: over ? "#e0644f" : "#4caf7d" }}>
                  {over ? "+" : ""}
                  {fmtUsd(row.overpay_usd)}
                  {pct !== null && <span style={{ color: "#6f6f78", marginLeft: 8 }}>{fmtPct(pct)}</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const cell: React.CSSProperties = {
  padding: "12.5px 0",
  textAlign: "right",
  fontSize: 12.5,
  color: "#c8c8d0",
  whiteSpace: "nowrap",
  fontVariantNumeric: "tabular-nums",
};
