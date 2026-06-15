import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getSupabaseAuth } from "@/lib/supabase/ssr-server";

export type InternalRole = "superadmin" | "admin";

export type AdminIdentity = {
  userId: string;
  email: string | null;
  role: InternalRole;
};

/**
 * The authoritative authorization wall. Call it at the **top of every data
 * accessor and every server action** that touches billing data — this, not the
 * proxy, is what closes the "server renders commission data unconditionally"
 * leak (docs/auth-and-access.md, step 3).
 *
 * 1. Resolve the user from the SSR (cookie) client — no session → `/login`.
 * 2. Look up `admin_users` by `user.id` via the **service-role** client (the
 *    table is RLS-locked, so only the service key can read it) — no row → `/403`.
 *
 * Authorization gates on `admin_users`, **never** on `profiles.roles`: a salon
 * owner is authenticated but must not reach the back office ("The role trap").
 *
 * Memoized per-render with React `cache` so calling it in several accessors on
 * one page performs the lookup once.
 */
export const requireSuperadmin = cache(async (): Promise<AdminIdentity> => {
  const auth = await getSupabaseAuth();
  const {
    data: { user },
  } = await auth.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("admin_users")
    .select("internal_role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(`requireSuperadmin: ${error.message}`);
  }

  // Authenticated but not on the internal allowlist (e.g. a salon owner).
  if (!data) {
    redirect("/403");
  }

  // `admin` is reserved for a future limited role; only `superadmin` has full
  // access today, so anything short of it is treated as no access.
  if (data.internal_role !== "superadmin") {
    redirect("/403");
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    role: data.internal_role as InternalRole,
  };
});
