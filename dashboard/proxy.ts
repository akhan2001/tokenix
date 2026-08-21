import { clerkMiddleware } from "@clerk/nextjs/server";

/**
 * Clerk session context for every request.
 *
 * This file is `proxy.ts`: Next 16 renamed the `middleware` convention and
 * warns on the old filename. Next accepts a default export here, which is what
 * `clerkMiddleware()` returns.
 *
 * It deliberately does NO route matching. `createRouteMatcher` is deprecated in
 * Clerk v7 ("will be removed in the next major version — use resource-based
 * auth checks instead"), so protection lives with the resource it protects:
 * app/(app)/layout.tsx gates the product area, and requireWorkspaceKey() gates
 * each data page again on the way to the API. This only establishes the
 * session; it decides nothing.
 *
 * Clerk authenticates humans. The `txk-` key still authenticates machines —
 * gateway traffic and the analytics API — and none of that passes through here.
 */
export default clerkMiddleware();

export const config = {
  matcher: [
    // Everything except Next internals and files with an extension, plus the
    // API routes, which need session context even though none are protected.
    "/((?!_next|[^?]*\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    // Clerk's auto-proxy path — handshake and session endpoints live here.
    "/__clerk/:path*",
  ],
};
