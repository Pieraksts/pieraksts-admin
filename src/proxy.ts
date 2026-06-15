import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy-session";

/**
 * Proxy (Next 16's renamed Middleware — same feature, Node.js runtime).
 *
 * Refreshes the Supabase session cookie on each request and bounces requests
 * with no session to `/login`. This is an optimistic UX gate only; the
 * authoritative authorization check is `requireSuperadmin()`, called at the top
 * of every data accessor and server action. See `docs/auth-and-access.md`.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Run on everything except static assets and image optimization. Auth routes
  // are handled inside updateSession (so the cookie still refreshes there).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|brand/).*)"],
};
