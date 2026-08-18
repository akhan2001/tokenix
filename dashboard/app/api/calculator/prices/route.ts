import {
  loadAcpi,
  loadCalculatorPrices,
  calculatorPricesUpdatedAt,
} from "@/lib/data";

/**
 * GET /api/calculator/prices
 *
 * Public pricing feed for the token cost calculator: every model the
 * calculator can quote, plus the current ACPI level for context.
 *
 * Cached as a static asset and revalidated hourly, matching the ACPI pipeline's
 * cadence. That also means abuse of this public endpoint is absorbed by the CDN
 * rather than by the serverless function, which is why there's no per-IP
 * rate limiter here — there is no per-request work to protect.
 */
export const dynamic = "force-static";
export const revalidate = 3600;

export async function GET() {
  try {
    const models = loadCalculatorPrices();

    // null = the export file isn't there at all (pipeline never ran, or the
    // file didn't ship with the deploy). An empty array would be a different,
    // quieter bug — treat both as unavailable rather than serving an empty
    // calculator that looks like "no models exist".
    if (!models || models.length === 0) {
      return Response.json(
        { error: "Pricing data is not available yet. Please try again shortly." },
        { status: 503, headers: { "Cache-Control": "no-store" } }
      );
    }

    const acpi = loadAcpi();

    return Response.json(
      {
        acpi: acpi
          ? {
              value: acpi.acpi,
              computed_at: acpi.computed_at,
              model_count: acpi.model_count,
              provider_count: acpi.provider_count,
            }
          : null,
        models,
        last_updated: calculatorPricesUpdatedAt(),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      }
    );
  } catch {
    // Never surface the underlying error: its message would carry absolute
    // server paths from the fs/parse layer.
    return Response.json(
      { error: "Unable to load pricing data." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
