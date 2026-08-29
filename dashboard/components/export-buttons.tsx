"use client";

import { useState } from "react";

type Format = "csv" | "excel" | "pdf";

interface ExportButtonsProps {
  /** Window the CSV and Excel exports cover. */
  days: number;
  /** Report month for the PDF, as `YYYY-MM`. Resolved server-side in UTC. */
  month: string;
}

const BUTTONS: { format: Format; label: string }[] = [
  { format: "csv", label: "Export CSV" },
  { format: "excel", label: "Export Excel" },
  { format: "pdf", label: "Export PDF" },
];

/**
 * Download buttons for the three export formats.
 *
 * Fetched as a blob rather than left to a plain link: the route answers
 * failures with JSON, and a link would navigate the customer away from the
 * page into raw error text. This way a failure stays on the page as a line of
 * copy under the buttons, and the tab never moves.
 */
export function ExportButtons({ days, month }: ExportButtonsProps) {
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

      // Filename comes from the API's Content-Disposition so the CLI and the
      // dashboard hand back identically named files.
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
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {BUTTONS.map(({ format, label }) => {
          const active = busy === format;
          return (
            <button
              key={format}
              type="button"
              onClick={() => download(format)}
              disabled={busy !== null}
              style={{
                fontFamily: "var(--mono)",
                fontSize: 10,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: busy !== null && !active ? "var(--text3)" : "var(--text2)",
                background: "transparent",
                border: "1px solid var(--border)",
                padding: "9px 14px",
                cursor: busy !== null ? "default" : "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {active ? "Preparing…" : label}
            </button>
          );
        })}
      </div>
      {error && (
        <div role="alert" style={{ fontSize: 11, color: "var(--accent)", marginTop: 10 }}>
          {error}
        </div>
      )}
    </div>
  );
}
