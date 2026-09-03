"use client";

import { useMemo, useState } from "react";

import { fmtUsd, fmtPct, shortModel } from "@/lib/tokenix-api";

/**
 * The breakdown, as one table both readers can use.
 *
 * Not two tables and not two dashboards. A CFO reads Spend and Δ vs ACPI and
 * stops; a CTO reads Model and Provider to decide what to route where. Sorting
 * is what lets them share it — each orders by the column they came for instead
 * of needing a view built for them, and neither has to be told which rows the
 * other cared about.
 *
 * Sort state lives here rather than on the server: it is a reading preference,
 * not data, and a round trip per column click would make it feel broken.
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

/** Matches components/price-table.tsx so the two tables sort alike. */
function SortArrows({ col, sort }: { col: SortKey; sort: { key: SortKey; dir: SortDir } }) {
  const active = sort.key === col;
  return (
    <span
      aria-hidden
      style={{ display: "inline-flex", flexDirection: "column", marginLeft: 6, lineHeight: 1 }}
    >
      <span
        style={{
          fontSize: 7,
          lineHeight: 1,
          color: active && sort.dir === "asc" ? "var(--accent)" : "var(--border2)",
        }}
      >
        ▲
      </span>
      <span
        style={{
          fontSize: 7,
          lineHeight: 1,
          color: active && sort.dir === "desc" ? "var(--accent)" : "var(--border2)",
        }}
      >
        ▼
      </span>
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
        : // Numbers open on the largest — the expensive models are the point.
          { key, dir: COLUMNS.find((c) => c.key === key)?.numeric ? "desc" : "asc" },
    );
  }

  if (rows.length === 0) {
    return (
      <div style={{ padding: "40px 20px", textAlign: "center", fontSize: 13, color: "var(--text3)" }}>
        No priced traffic yet. Once requests flow through the gateway, every model appears here
        with its ACPI reference price.
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
        <thead>
          <tr>
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                scope="col"
                aria-sort={
                  sort.key === col.key
                    ? sort.dir === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                }
                style={{
                  textAlign: col.numeric ? "right" : "left",
                  padding: "12px 16px",
                  borderBottom: "1px solid var(--border)",
                  fontSize: 9,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "var(--text3)",
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
                    letterSpacing: "inherit",
                    textTransform: "inherit",
                    color: sort.key === col.key ? "var(--accent)" : "inherit",
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
            // Positive overpay = paying above the market reference. The app's
            // convention throughout is up/over = red, under = green, because
            // this is a cost index and rising is not good news.
            const over = row.overpay_usd > 0;
            const pct =
              row.acpi_bench_usd > 0 ? (row.overpay_usd / row.acpi_bench_usd) * 100 : null;
            return (
              <tr key={row.model_id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "14px 16px", fontSize: 13, color: "var(--text)" }}>
                  {shortModel(row.model_id)}
                </td>
                <td style={{ ...cell, color: "var(--text2)", textAlign: "left" }}>
                  {row.provider || "—"}
                </td>
                <td style={{ ...cell, color: "var(--text2)" }}>
                  {row.requests.toLocaleString("en-US")}
                </td>
                <td style={{ ...cell, color: "var(--text)" }}>{fmtUsd(row.cost_usd)}</td>
                <td style={{ ...cell, color: "var(--text2)" }}>{fmtUsd(row.acpi_bench_usd)}</td>
                <td style={{ ...cell, color: over ? "var(--red)" : "var(--green)" }}>
                  {over ? "+" : ""}
                  {fmtUsd(row.overpay_usd)}
                  {pct !== null && (
                    <span style={{ color: "var(--text3)", marginLeft: 8 }}>
                      {fmtPct(pct)}
                    </span>
                  )}
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
  padding: "14px 16px",
  textAlign: "right",
  fontFamily: "var(--mono)",
  fontSize: 13,
  whiteSpace: "nowrap",
  fontVariantNumeric: "tabular-nums",
};
