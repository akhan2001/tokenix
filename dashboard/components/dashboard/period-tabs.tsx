"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

import { type Period, PERIODS } from "@/lib/period";

export type { Period };

/**
 * Week / Month / Quarter / Year, ported from the design's segmented control.
 *
 * The period lives in the URL (`?period=`) rather than component state, so
 * the page that reads it stays a server component doing a real data fetch
 * per period — matching how every other page in this app is built — instead
 * of introducing a client-side data layer just for this one control.
 *
 * `Period`/`PERIODS`/`daysFor` live in lib/period.ts, not here — every export
 * of a "use client" file becomes a client-only reference at its import
 * boundary, even a re-export of a plain value, which is what made
 * `daysFor()` (no browser API involved) uncallable from the server page that
 * needs the day count for a period. Server code must import those directly
 * from lib/period; only `PeriodTabs` itself belongs on this module.
 */
export function PeriodTabs({ active }: { active: Period }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function pick(period: Period) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", period);
    // welcome=1 has already been consumed by the time anyone touches this
    // control — drop it so switching periods can't re-trigger the mint path.
    params.delete("welcome");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div
      style={{
        display: "flex",
        gap: 2,
        background: "#17171a",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 9,
        padding: 3,
      }}
    >
      {PERIODS.map(({ id, label }) => {
        const on = id === active;
        return (
          <button
            key={id}
            type="button"
            onClick={() => pick(id)}
            aria-pressed={on}
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              fontSize: 12.5,
              fontFamily: "inherit",
              border: "none",
              cursor: "pointer",
              color: on ? "#ededf0" : "#8a8a93",
              background: on ? "rgba(255,255,255,0.08)" : "transparent",
              transition: "background 0.15s ease, color 0.15s ease",
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
