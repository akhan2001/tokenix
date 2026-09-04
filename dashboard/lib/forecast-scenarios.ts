/**
 * Three forecast scenarios — current trajectory, with optimisation, and flat
 * growth — computed from data the dashboard already has.
 *
 * The MVP plan for this called for a new `GET /api/v1/forecast/scenarios`
 * endpoint in the analytics API. It isn't needed: every input this requires
 * (this month's projected spend, the measured month-over-month growth rate,
 * and the recoverable-savings share) already comes back from the existing
 * `/api/v1/forecast` endpoint (see lib/tokenix-api.ts's `Forecast` type) and
 * `components/dashboard/forecast-projection-chart.tsx` already computed two
 * of these three lines client-side. This file is that same math, pulled out
 * so the page's text summary and the chart read from one source instead of
 * two independent recomputations that could drift apart.
 *
 * A pure, directive-free module: usable from the server page (for the text
 * summary) and the client chart component alike.
 */
export interface ScenarioPoint {
  month: number;
  /** Cumulative spend through this month, at unchanged growth. */
  current: number;
  /** Cumulative spend through this month, with the measured savings applied. */
  optimized: number;
  /** Cumulative spend through this month, at zero growth from month 1's rate. */
  flat: number;
}

export interface ForecastScenarios {
  points: ScenarioPoint[];
  /** Convenience reads for the three checkpoints the MVP spec calls out. */
  atMonth: (n: 1 | 3 | 12) => ScenarioPoint;
}

export function computeForecastScenarios({
  monthlyBase,
  growthRate,
  savingShare,
}: {
  monthlyBase: number;
  /** Fraction, e.g. 0.18 for +18% month over month. */
  growthRate: number;
  /** Fraction of spend recoverable by optimisation, e.g. 0.24 for 24%. */
  savingShare: number;
}): ForecastScenarios {
  const points: ScenarioPoint[] = [];
  let running = monthlyBase;
  let current = 0;
  let optimized = 0;
  let flat = 0;

  for (let month = 1; month <= 12; month += 1) {
    if (month > 1) running *= 1 + growthRate;
    current += running;
    optimized += running * (1 - savingShare);
    flat += monthlyBase;
    points.push({ month, current, optimized, flat });
  }

  return {
    points,
    atMonth: (n) => points[n - 1],
  };
}
