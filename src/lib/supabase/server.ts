import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client — bypasses RLS, so it is **server-only**.
 *
 * The billing tables (`salon_*`, `booking_fees`, `salon_invoices`, ...) have RLS
 * enabled with no anon/authenticated policies; only `service_role` can read them.
 * The `import "server-only"` above turns any client-component import of this file
 * into a build error, so the key can never reach the browser. See
 * `docs/auth-and-access.md`.
 *
 * Lazily constructed so a missing env var fails at request time (under the
 * `force-dynamic` data pages) rather than at module load / build time.
 */
let client: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Add them to .env.local (see .env.example).",
    );
  }

  client = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return client;
}
