import "server-only";

import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * SSR auth client — **identity only** (`@supabase/ssr`, anon key, cookie-based).
 *
 * Answers *"who is this user?"* by reading/refreshing the Supabase session from
 * cookies. It is NOT privileged: the billing tables are RLS-locked to
 * `service_role`, so this client cannot read them. Privileged reads/writes and
 * the `admin_users` authorization lookup go through `getSupabaseAdmin()`
 * (`./server.ts`). See `docs/auth-and-access.md` ("Two Supabase clients").
 *
 * Used by `requireSuperadmin()` and the login/logout server actions. The anon
 * key is the same public value shipped in the mobile app; it never grants more
 * than an authenticated end user has.
 */
export async function getSupabaseAuth(): Promise<SupabaseClient> {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_ANON_KEY. Add them to .env.local (see .env.example).",
    );
  }

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        // In a Server Component the cookie store is read-only; the session is
        // refreshed by `proxy.ts` instead, so swallowing here is expected.
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options as CookieOptions);
          }
        } catch {
          // no-op: called from a Server Component render.
        }
      },
    },
  });
}
