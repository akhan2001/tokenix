import { NextResponse, type NextRequest } from "next/server";

import { KEY_COOKIE } from "@/lib/cookie-name";

/**
 * Route guard for the authenticated product area.
 *
 * Next 16 renamed the `middleware` convention to `proxy` (same file role, new
 * name and a nodejs-only runtime), so this lives in `proxy.ts` and exports
 * `proxy` — a `middleware.ts` here would be the deprecated convention.
 *
 * `/connect` is deliberately NOT guarded: it is the page that issues the
 * session, so redirecting an unauthenticated visitor away from it would loop.
 *
 * This checks only that a cookie is *present*, never that it is valid — the
 * proxy cannot call the analytics API cheaply on every request. Each data page
 * still calls `requireWorkspaceKey()`, and the API still rejects a bad key with
 * a 401, so this is a fast redirect for the common signed-out case rather than
 * the security boundary.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has(KEY_COOKIE)) return NextResponse.next();

  const target = new URL("/connect", request.url);
  return NextResponse.redirect(target);
}

export const config = {
  matcher: ["/insights/:path*", "/benchmark/:path*", "/forecast/:path*"],
};
