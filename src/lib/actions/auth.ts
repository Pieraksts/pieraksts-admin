"use server";

/**
 * Authentication actions for the admin login flow. These only establish
 * *identity* (a Supabase session cookie). They do NOT grant access — that is
 * decided by `requireSuperadmin()`, which checks the `admin_users` allowlist on
 * every data read/write. A salon owner can sign in here and still get a 403.
 */
import { redirect } from "next/navigation";

import { getSupabaseAuth } from "@/lib/supabase/ssr-server";

export type LoginState = { error: string } | undefined;

/** Only allow redirecting back to in-app paths (no open redirect). */
function safeNext(next: FormDataEntryValue | null): string {
  const value = typeof next === "string" ? next : "";
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export async function signIn(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const supabase = await getSupabaseAuth();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Deliberately vague — don't reveal whether the email exists.
    return { error: "Invalid email or password." };
  }

  // On success the session cookie is set; authorization is enforced downstream
  // by requireSuperadmin() on the destination page.
  redirect(next);
}

export async function signOut() {
  const supabase = await getSupabaseAuth();
  await supabase.auth.signOut();
  redirect("/login");
}
