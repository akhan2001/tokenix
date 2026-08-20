/**
 * Name of the httpOnly cookie holding the workspace `txk-` key.
 *
 * Its own module because `proxy.ts` needs it and must not import
 * `lib/tokenix-api.ts` — that pulls in `next/headers`, which does not belong in
 * the proxy. Keeping the literal in one place means the guard and the reader
 * can never drift apart.
 */
export const KEY_COOKIE = "tokenix_key";
