/**
 * Week / Month / Quarter / Year — the period a time-series view is scoped to.
 *
 * Split out of components/dashboard/period-tabs.tsx, which is a "use client"
 * module: every export of a client module becomes a client reference at the
 * import boundary, even a pure function with no React or browser API in it.
 * That made `daysFor()` uncallable from a server component (the exact error
 * this file exists to fix) despite doing nothing client-specific. Server
 * pages that need the day count for a period import it from here instead;
 * <PeriodTabs> re-exports the same names so existing call sites don't need
 * to know the type/day-count logic moved.
 */
export type Period = "week" | "month" | "quarter" | "year";

export const PERIODS: { id: Period; label: string; days: number }[] = [
  { id: "week", label: "Week", days: 7 },
  { id: "month", label: "Month", days: 30 },
  { id: "quarter", label: "Quarter", days: 90 },
  { id: "year", label: "Year", days: 365 },
];

export function daysFor(period: Period): number {
  return PERIODS.find((p) => p.id === period)?.days ?? 30;
}
