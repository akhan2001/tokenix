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
import { Badge } from "@/components/ui/badge";
import type { PriceRow } from "@/lib/data";

type SortKey = keyof Pick<
  PriceRow,
  "provider" | "model_name" | "context_length" | "input_per_million_usd" | "output_per_million_usd"
>;
type SortDir = "asc" | "desc";

const SOURCE_COLORS: Record<string, string> = {
  openrouter: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  litellm:    "bg-blue-500/15 text-blue-300 border-blue-500/30",
  together:   "bg-orange-500/15 text-orange-300 border-orange-500/30",
  groq:       "bg-amber-500/15 text-amber-300 border-amber-500/30",
  deepinfra:  "bg-teal-500/15 text-teal-300 border-teal-500/30",
  novita:     "bg-pink-500/15 text-pink-300 border-pink-500/30",
  perplexity: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  fireworks:  "bg-red-500/15 text-red-300 border-red-500/30",
  mistral:    "bg-sky-500/15 text-sky-300 border-sky-500/30",
};

function sourceBadgeClass(source: string) {
  return SOURCE_COLORS[source] ?? "bg-zinc-500/15 text-zinc-300 border-zinc-500/30";
}

function fmtCtx(raw: string) {
  const n = parseInt(raw.replace(/,/g, ""), 10);
  if (!n || isNaN(n)) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function SortIcon({ col, sort }: { col: SortKey; sort: { key: SortKey; dir: SortDir } }) {
  if (sort.key !== col) return <span className="ml-1 opacity-20">↕</span>;
  return <span className="ml-1 opacity-80">{sort.dir === "asc" ? "↑" : "↓"}</span>;
}

const PAGE_SIZE = 50;

export function PriceTable({
  rows,
  sources,
  providers,
}: {
  rows: PriceRow[];
  sources: string[];
  providers: string[];
}) {
  const [search, setSearch]       = useState("");
  const [source, setSource]       = useState("all");
  const [provider, setProvider]   = useState("all");
  const [sort, setSort]           = useState<{ key: SortKey; dir: SortDir }>({
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
      if (source !== "all" && r.source !== source) return false;
      if (provider !== "all" && r.provider !== provider) return false;
      if (q && !r.model_name.toLowerCase().includes(q) && !r.model_id.toLowerCase().includes(q) && !r.provider.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [rows, search, source, provider]);

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

  function handleFilter() {
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 items-center">
        <Input
          placeholder="Search model, provider…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); handleFilter(); }}
          className="w-64 bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-zinc-500"
        />

        <Select value={source} onValueChange={(v) => { setSource(v ?? "all"); handleFilter(); }}>
          <SelectTrigger className="w-44 bg-zinc-900 border-zinc-700 text-white">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
            <SelectItem value="all">All sources</SelectItem>
            {sources.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={provider} onValueChange={(v) => { setProvider(v ?? "all"); handleFilter(); }}>
          <SelectTrigger className="w-44 bg-zinc-900 border-zinc-700 text-white">
            <SelectValue placeholder="Provider" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700 text-white max-h-64 overflow-y-auto">
            <SelectItem value="all">All providers</SelectItem>
            {providers.map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="ml-auto text-sm text-zinc-500">
          {filtered.length.toLocaleString()} models
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-zinc-800 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-900/80 hover:bg-zinc-900/80 border-zinc-800">
              <TableHead
                className="text-zinc-400 cursor-pointer select-none w-32"
                onClick={() => toggleSort("provider")}
              >
                Provider <SortIcon col="provider" sort={sort} />
              </TableHead>
              <TableHead
                className="text-zinc-400 cursor-pointer select-none"
                onClick={() => toggleSort("model_name")}
              >
                Model <SortIcon col="model_name" sort={sort} />
              </TableHead>
              <TableHead className="text-zinc-400 w-20 text-center">Source</TableHead>
              <TableHead
                className="text-zinc-400 cursor-pointer select-none w-24 text-right"
                onClick={() => toggleSort("context_length")}
              >
                Context <SortIcon col="context_length" sort={sort} />
              </TableHead>
              <TableHead
                className="text-zinc-400 cursor-pointer select-none w-32 text-right"
                onClick={() => toggleSort("input_per_million_usd")}
              >
                Input /1M <SortIcon col="input_per_million_usd" sort={sort} />
              </TableHead>
              <TableHead
                className="text-zinc-400 cursor-pointer select-none w-32 text-right"
                onClick={() => toggleSort("output_per_million_usd")}
              >
                Output /1M <SortIcon col="output_per_million_usd" sort={sort} />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-zinc-500 py-12">
                  No models match your filters.
                </TableCell>
              </TableRow>
            )}
            {pageRows.map((row, i) => (
              <TableRow
                key={`${row.source}-${row.model_id}-${i}`}
                className="border-zinc-800 hover:bg-zinc-800/50 transition-colors"
              >
                <TableCell className="text-zinc-300 font-medium text-sm">
                  {row.provider || "—"}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-white text-sm font-medium leading-snug">
                      {row.model_name.replace(/^[A-Za-z][A-Za-z0-9 ]+:\s*/, "")}
                    </span>
                    <span className="text-zinc-500 text-xs font-mono">{row.model_id}</span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border uppercase tracking-wide ${sourceBadgeClass(row.source)}`}
                  >
                    {row.source}
                  </span>
                </TableCell>
                <TableCell className="text-right text-zinc-400 text-sm font-mono">
                  {fmtCtx(row.context_length)}
                </TableCell>
                <TableCell className="text-right font-mono text-sm text-emerald-400">
                  ${row.input_per_million_usd.toFixed(2)}
                </TableCell>
                <TableCell className="text-right font-mono text-sm text-sky-400">
                  ${row.output_per_million_usd.toFixed(2)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-zinc-500">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1 rounded border border-zinc-700 hover:border-zinc-500 disabled:opacity-30 transition-colors"
          >
            ← Prev
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 rounded border border-zinc-700 hover:border-zinc-500 disabled:opacity-30 transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
