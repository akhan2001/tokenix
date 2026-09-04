"use client";

import { useState } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * The design's single "Export" button, wired to the three real formats
 * behind /api/export/[format] — CSV, Excel, PDF — via a menu rather than
 * inventing a fourth "just export" action the API doesn't have. Duplicates
 * components/export-buttons.tsx's download logic rather than reusing it
 * directly: that component renders three always-visible buttons in the
 * marketing site's mono styling, which is the exact look this page is
 * deliberately moving away from.
 */
type Format = "csv" | "excel" | "pdf";

const FORMATS: { format: Format; label: string }[] = [
  { format: "csv", label: "CSV" },
  { format: "excel", label: "Excel" },
  { format: "pdf", label: "PDF report" },
];

export function ExportMenu({ days, month }: { days: number; month: string }) {
  const [busy, setBusy] = useState<Format | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function download(format: Format) {
    setBusy(format);
    setError(null);
    const query = format === "pdf" ? `month=${month}` : `days=${days}`;
    try {
      const response = await fetch(`/api/export/${format}?${query}`, { cache: "no-store" });
      if (!response.ok) {
        const detail = await response.json().catch(() => null);
        setError(detail?.error ?? "That export could not be generated.");
        return;
      }
      const disposition = response.headers.get("content-disposition") ?? "";
      const match = /filename="([^"]+)"/.exec(disposition);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = match?.[1] ?? `tokenix-export-${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("The download failed. Check your connection and try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <DropdownMenu>
        <DropdownMenuTrigger
          style={{
            padding: "8px 15px",
            borderRadius: 9,
            background: "#ffa515",
            color: "#141416",
            fontSize: 12.5,
            fontWeight: 500,
            border: "none",
            cursor: "pointer",
          }}
        >
          {busy ? "Preparing…" : "Export"}
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          style={{
            background: "#17171a",
            border: "1px solid rgba(255,255,255,0.09)",
            borderRadius: 11,
            padding: 6,
            minWidth: 160,
          }}
        >
          {FORMATS.map(({ format, label }) => (
            <DropdownMenuItem
              key={format}
              disabled={busy !== null}
              onClick={() => download(format)}
              style={{ padding: "8px 10px", fontSize: 13, color: "#c8c8d0", borderRadius: 7 }}
            >
              {label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {error && (
        <div role="alert" style={{ fontSize: 11, color: "#e0644f", marginTop: 8, textAlign: "right" }}>
          {error}
        </div>
      )}
    </div>
  );
}
