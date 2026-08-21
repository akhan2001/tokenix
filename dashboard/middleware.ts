import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Route guard for the authenticated product area, backed by Clerk.
 *
 * This is `middleware.ts`, not `proxy.ts`. Next 16 renamed the convention and
 * proxy.ts runs on nodejs only, but Clerk ships `clerkMiddleware` for the
 * middleware convention and exports nothing for proxy — so the deprecated-but-
 * supported filename is the correct one here, and the old cookie-based proxy.ts
 * has been removed so there is exactly one guard.
 *
 * Clerk authenticates *humans* into the dashboard. The `txk-` key still
 * authenticates *machines* — gateway traffic and the analytics API — and none
 * of that runs through here.
 *
 * `/connect` IS protected, unlike under the old cookie guard. It no longer
 * takes a key from the visitor; it provisions and displays one for a signed-in
 * user, so an anonymous visitor has nothing to do there and is sent to sign in.
 */
const isProtectedRoute = createRouteMatcher([
  "/insights(.*)",
  "/benchmark(.*)",
  "/forecast(.*)",
  "/connect(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) await auth.protect();
});

export const config = {
  matcher: [
    // Everything except Next internals and files with an extension, plus the
    // API routes, which need session context even though none are protected.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    // Clerk's auto-proxy path — handshake and session endpoints are served
    // from here, so the middleware has to see it.
    "/__clerk/:path*",
  ],
};
