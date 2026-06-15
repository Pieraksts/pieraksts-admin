import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Refresh the Supabase session cookie for an incoming request and, if there is
 * no session, redirect to `/login` (except on public auth routes).
 *
 * This is a UX convenience used by `proxy.ts` — NOT the authorization wall.
 * Per Next's data-security guidance, never trust the proxy alone: the real gate
 * is `requireSuperadmin()` at every data accessor / server action. This only
 * keeps the cookie fresh and bounces obviously-unauthenticated requests early.
 */

// Routes reachable without a session (the login flow and the no-access page).
const PUBLIC_PATHS = ["/login", "/403", "/auth"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export async function updateSession(
  request: NextRequest,
): Promise<NextResponse> {
  // Must keep `request`/`response` cookies in lockstep so refreshed tokens are
  // written back to the browser. This is the canonical @supabase/ssr pattern.
  let response = NextResponse.next({ request });

  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  // If env is missing we can't refresh; let the request through and let the
  // data layer surface the misconfiguration rather than hard-failing here.
  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // IMPORTANT: getUser() (not getSession) — it revalidates the token with the
  // auth server and triggers the cookie refresh via setAll above.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  if (!user && !isPublicPath(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    // Preserve where they were headed so login can bounce them back.
    if (pathname !== "/") loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}
