import { auth } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";

import { ApiError, fetchExport } from "@/lib/tokenix-api";
import { findWorkspace } from "@/lib/workspace";

/**
 * GET /api/export/{csv|excel|pdf}
 *
 * Download proxy for the analytics API's export endpoints.
 *
 * The browser cannot call those endpoints directly. Authenticating a human
 * there means sending `x-internal-token`, and that secret must never reach the
 * client — so the request is made here, server-side, from a Clerk session.
 *
 * Unlike the pages in the (app) group this never redirects on failure: a
 * download that answers with a sign-in page produces a corrupt file rather
 * than a visible error, so every failure is a JSON status the button can read.
 */

export const dynamic = "force-dynamic";

const FORMATS = {
  csv: { path: "csv", param: "days" },
  excel: { path: "excel", param: "days" },
  pdf: { path: "pdf", param: "month" },
} as const;

type Format = keyof typeof FORMATS;

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

function fail(message: string, status: number) {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: NextRequest, ctx: RouteContext<"/api/export/[format]">) {
  const { format } = await ctx.params;
  if (!(format in FORMATS)) {
    return fail("Unknown export format.", 404);
  }
  const spec = FORMATS[format as Format];

  const { userId } = await auth();
  if (!userId) return fail("Sign in to export your usage.", 401);

  let query: string;
  if (spec.param === "month") {
    const month = request.nextUrl.searchParams.get("month") ?? "";
    if (!MONTH.test(month)) {
      return fail("Pass a report month formatted YYYY-MM.", 400);
    }
    query = `month=${month}`;
  } else {
    // Clamped here as well as upstream so a hand-edited URL gets a clear 400
    // from the dashboard rather than a 422 from an API the user cannot see.
    const days = Number(request.nextUrl.searchParams.get("days") ?? 30);
    if (!Number.isInteger(days) || days < 1 || days > 365) {
      return fail("days must be a whole number between 1 and 365.", 400);
    }
    query = `days=${days}`;
  }

  let workspaceId: string;
  try {
    const workspace = await findWorkspace(userId);
    if (!workspace) return fail("Set up your workspace on the Connect page first.", 404);
    workspaceId = workspace.workspace_id;
  } catch {
    return fail("Could not reach the Tokenix analytics API.", 503);
  }

  let upstream: Response;
  try {
    upstream = await fetchExport(workspaceId, `/api/v1/export/${spec.path}?${query}`);
  } catch (error) {
    return fail(
      error instanceof ApiError ? error.message : "The export could not be generated.",
      503,
    );
  }

  if (!upstream.ok || !upstream.body) {
    return fail("The export could not be generated.", 502);
  }

  // Streamed straight through — a month of raw records should never be held in
  // this function's memory just to be handed on.
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/octet-stream",
      "content-disposition":
        upstream.headers.get("content-disposition") ?? `attachment; filename="tokenix-export"`,
      "Cache-Control": "no-store",
    },
  });
}
