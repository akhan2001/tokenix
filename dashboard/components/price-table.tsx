"use client";

import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PriceRow } from "@/lib/data";

type SortKey = keyof Pick<
  PriceRow,
  "provider" | "model_name" | "context_length" | "input_per_million_usd" | "output_per_million_usd"
>;
type SortDir = "asc" | "desc";

type TierKey = "S" | "A" | "B" | "C";

const TIERS: Record<TierKey, { label: string; cls: string }> = {
  S: { label: "S",  cls: "bg-amber-500/20 text-amber-300 border-amber-500/30"      },
  A: { label: "A",  cls: "bg-blue-500/20 text-blue-300 border-blue-500/30"          },
  B: { label: "B",  cls: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
  C: { label: "C",  cls: "bg-zinc-600/20 text-zinc-400 border-zinc-600/30"          },
};

const TIER_LABELS: Record<TierKey, string> = {
  S: "Frontier  ≥ $10/M",
  A: "Advanced  $1–$10/M",
  B: "Standard  $0.1–$1/M",
  C: "Economy   < $0.1/M",
};

function getTier(inp: number): TierKey {
  if (inp >= 10)  return "S";
  if (inp >= 1)   return "A";
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

function SortIcon({ col, sort }: { col: SortKey; sort: { key: SortKey; dir: SortDir } }) {
  if (sort.key !== col) return <span className="ml-1" style={{ color: "#05260F", opacity: 0.8 }}>↕</span>;
  return <span className="ml-1" style={{ color: "#00A32A" }}>{sort.dir === "asc" ? "↑" : "↓"}</span>;
}

const PAGE_SIZE = 50;

function Pagination({
  page,
  totalPages,
  count,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  count: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between text-sm" style={{ color: "#7A7A7A" }}>
      <button
        disabled={page === 1}
        onClick={onPrev}
        className="px-3 py-1 rounded disabled:opacity-30 transition-colors"
        style={{ border: "1px solid #05260F" }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#00A32A")}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#05260F")}
      >
        ← Prev
      </button>
      <span>
        Page {page} of {totalPages} &nbsp;·&nbsp; {count.toLocaleString()} models
      </span>
      <button
        disabled={page === totalPages}
        onClick={onNext}
        className="px-3 py-1 rounded disabled:opacity-30 transition-colors"
        style={{ border: "1px solid #05260F" }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#00A32A")}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#05260F")}
      >
        Next →
      </button>
    </div>
  );
}

export function PriceTable({
  rows,
  providers,
}: {
  rows: PriceRow[];
  providers: string[];
}) {
  const [search, setSearch]     = useState("");
  const [tier, setTier]         = useState("all");
  const [provider, setProvider] = useState("all");
  const [sort, setSort]         = useState<{ key: SortKey; dir: SortDir }>({
    key: "input_per_million_usd",
    dir: "asc",
  });
  const [page, setPage] = useState(1);

  function toggleSort(key: SortKey) {
    setSort((s) =>
      s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }
    );
    setPage(1);
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter((r) => {
      if (provider !== "all" && r.provider !== provider) return false;
      if (tier !== "all" && getTier(r.input_per_million_usd) !== tier) return false;
      if (
        q &&
        !r.model_name.toLowerCase().includes(q) &&
        !r.model_id.toLowerCase().includes(q) &&
        !r.provider.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [rows, search, tier, provider]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      const cmp =
        typeof av === "number"
          ? av - (bv as number)
          : String(av).localeCompare(String(bv));
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageRows   = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const paginationProps = {
    page,
    totalPages,
    count: filtered.length,
    onPrev: () => setPage((p) => p - 1),
    onNext: () => setPage((p) => p + 1),
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Filter bar */}
      <div className="flex items-center gap-3">
        <span className="text-sm mr-auto" style={{ color: "#7A7A7A" }}>
          {filtered.length.toLocaleString()} models
        </span>

        <Input
          placeholder="Search model or provider…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-60 placeholder:text-[#7A7A7A] text-[#E0E0E0] focus-visible:ring-[#00A32A]"
          style={{ background: "#000000", border: "1px solid #05260F" }}
        />

        <Select value={provider} onValueChange={(v) => { setProvider(v ?? "all"); setPage(1); }}>
          <SelectTrigger
            className="w-40 text-[#E0E0E0]"
            style={{ background: "#000000", border: "1px solid #05260F" }}
          >
            <SelectValue placeholder="Provider" />
          </SelectTrigger>
          <SelectContent
            className="text-[#E0E0E0] max-h-64 overflow-y-auto"
            style={{ background: "#000000", border: "1px solid #05260F" }}
          >
            <SelectItem value="all">All providers</SelectItem>
            {providers.map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={tier} onValueChange={(v) => { setTier(v ?? "all"); setPage(1); }}>
          <SelectTrigger
            className="w-44 text-[#E0E0E0]"
            style={{ background: "#000000", border: "1px solid #05260F" }}
          >
            <SelectValue placeholder="Tier" />
          </SelectTrigger>
          <SelectContent
            className="text-[#E0E0E0]"
            style={{ background: "#000000", border: "1px solid #05260F" }}
          >
            <SelectItem value="all">All tiers</SelectItem>
            {(Object.keys(TIERS) as TierKey[]).map((t) => (
              <SelectItem key={t} value={t}>
                <span className="font-bold mr-2">{t}</span>
                <span className="text-xs" style={{ color: "#7A7A7A" }}>{TIER_LABELS[t]}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Pagination — top */}
      <Pagination {...paginationProps} />

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #05260F" }}>
        <Table>
          <TableHeader>
            <TableRow
              className="hover:opacity-100"
              style={{ background: "rgba(5,38,15,0.6)", borderBottom: "1px solid #05260F" }}
            >
              <TableHead
                className="cursor-pointer select-none w-28"
                style={{ color: "#7A7A7A" }}
                onClick={() => toggleSort("provider")}
              >
                Provider <SortIcon col="provider" sort={sort} />
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                style={{ color: "#7A7A7A" }}
                onClick={() => toggleSort("model_name")}
              >
                Model <SortIcon col="model_name" sort={sort} />
              </TableHead>
              <TableHead className="w-16 text-center" style={{ color: "#7A7A7A" }}>Tier</TableHead>
              <TableHead
                className="cursor-pointer select-none w-24 text-right"
                style={{ color: "#7A7A7A" }}
                onClick={() => toggleSort("context_length")}
              >
                Context <SortIcon col="context_length" sort={sort} />
              </TableHead>
              <TableHead
                className="cursor-pointer select-none w-32 text-right"
                style={{ color: "#7A7A7A" }}
                onClick={() => toggleSort("input_per_million_usd")}
              >
                Input /1M <SortIcon col="input_per_million_usd" sort={sort} />
              </TableHead>
              <TableHead
                className="cursor-pointer select-none w-32 text-right"
                style={{ color: "#7A7A7A" }}
                onClick={() => toggleSort("output_per_million_usd")}
              >
                Output /1M <SortIcon col="output_per_million_usd" sort={sort} />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12" style={{ color: "#7A7A7A" }}>
                  No models match your filters.
                </TableCell>
              </TableRow>
            )}
            {pageRows.map((row, i) => {
              const t = getTier(row.input_per_million_usd);
              const tierData = TIERS[t];
              return (
                <TableRow
                  key={`${row.source}-${row.model_id}-${i}`}
                  className="transition-colors"
                  style={{ borderBottom: "1px solid rgba(5,38,15,0.6)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(5,38,15,0.25)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                >
                  <TableCell className="font-medium text-sm" style={{ color: "#E0E0E0" }}>
                    {row.provider || "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium leading-snug" style={{ color: "#E0E0E0" }}>
                        {row.model_name.replace(/^[A-Za-z][A-Za-z0-9 ]+:\s*/, "")}
                      </span>
                      <span className="text-xs font-mono" style={{ color: "#7A7A7A" }}>{row.model_id}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border ${tierData.cls}`}
                      title={TIER_LABELS[t]}
                    >
                      {tierData.label}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-sm font-mono" style={{ color: "#7A7A7A" }}>
                    {fmtCtx(row.context_length)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm" style={{ color: "#00A32A" }}>
                    ${row.input_per_million_usd.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm" style={{ color: "#00FF41" }}>
                    ${row.output_per_million_usd.toFixed(2)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination — bottom */}
      <Pagination {...paginationProps} />
    </div>
  );
}
