"use server";

/**
 * Server-only write actions for the admin panel. These run on the server and use
 * the service-role client (bypasses RLS), mirroring the read layer in
 * `src/lib/data/salons.ts`.
 *
 * Every action calls `requireSuperadmin()` first: server actions are reachable
 * as POST endpoints independent of any page, so each must enforce authorization
 * itself (docs/auth-and-access.md — never rely on the proxy alone). The resolved
 * user id is the audit attribution written to `salon_contract_events.created_by`.
 */
import { revalidatePath } from "next/cache";

import { requireSuperadmin } from "@/lib/auth/require-superadmin";
import type { ClientStatus } from "@/lib/data/salons";
import { getSupabaseAdmin } from "@/lib/supabase/server";

const CLIENT_STATUSES: ClientStatus[] = [
  "new",
  "active",
  "paused",
  "terminated",
];

/** Refresh the views that surface salon status/visibility/billing. */
function revalidateSalon(salonId: string) {
  revalidatePath(`/salons/${salonId}`);
  revalidatePath("/salons");
  revalidatePath("/");
}

/**
 * Append a row to `salon_contract_events` for audit attribution. `createdBy` is
 * the superadmin's auth uid from `requireSuperadmin()`; the column is nullable,
 * so an event log failure must never roll back the underlying action — we record
 * it best-effort and swallow errors after logging.
 */
async function logContractEvent(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  contractId: string,
  eventType: "created" | "activated" | "terminated",
  createdBy: string,
  opts?: { description?: string },
) {
  const { error } = await supabase.from("salon_contract_events").insert({
    contract_id: contractId,
    event_type: eventType,
    description: opts?.description ?? null,
    created_by: createdBy,
  });
  if (error) {
    console.error(`logContractEvent(${eventType}): ${error.message}`);
  }
}

export async function setClientStatus(salonId: string, status: ClientStatus) {
  await requireSuperadmin();
  if (!CLIENT_STATUSES.includes(status)) {
    throw new Error(`Invalid client status: ${status}`);
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("salon_admin_profiles")
    .upsert(
      { salon_id: salonId, client_status: status },
      { onConflict: "salon_id" },
    );

  if (error) throw new Error(`setClientStatus: ${error.message}`);
  revalidateSalon(salonId);
}

/**
 * `RDY-008`: Moderation Suspension is an independent exceptional control for
 * fraud, safety, legal, or marketplace-policy enforcement. Admin has no general
 * publication switch: marketplace visibility is derived from owner publication
 * intent, Publication Readiness, and entitlement, and a suspension overrides
 * all three. Releasing a suspension restores the derived visibility rather than
 * publishing the salon.
 */
export async function suspendSalonModeration(salonId: string, reason: string) {
  const { userId } = await requireSuperadmin();
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.rpc("suspend_salon_moderation", {
    p_salon_id: salonId,
    p_reason: reason.trim() === "" ? null : reason.trim(),
    p_actor_user_id: userId,
  });

  if (error) throw new Error(`suspendSalonModeration: ${error.message}`);
  revalidateSalon(salonId);
}

export async function releaseSalonModeration(salonId: string) {
  const { userId } = await requireSuperadmin();
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.rpc("release_salon_moderation", {
    p_salon_id: salonId,
    p_actor_user_id: userId,
  });

  if (error) throw new Error(`releaseSalonModeration: ${error.message}`);
  revalidateSalon(salonId);
}

/**
 * Sponsored placement in the booking app's home "Featured" rail. Admin-only;
 * unlike visibility, the salon owner has no control over this flag.
 */
export async function setFeatured(salonId: string, isFeatured: boolean) {
  await requireSuperadmin();
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("salons")
    .update({ is_featured: isFeatured })
    .eq("id", salonId);

  if (error) throw new Error(`setFeatured: ${error.message}`);
  revalidateSalon(salonId);
}

export type LegalProfileInput = {
  companyName: string;
  registrationNumber: string;
  vatNumber: string;
  legalAddress: string;
  contactPerson: string;
  billingEmail: string;
  billingPhone: string;
};

/** Empty string -> null, so "missing" is consistent in the DB and the gate. */
function nullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export async function saveLegalProfile(
  salonId: string,
  input: LegalProfileInput,
) {
  await requireSuperadmin();
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("salon_legal_profiles").upsert(
    {
      salon_id: salonId,
      company_name: nullable(input.companyName),
      registration_number: nullable(input.registrationNumber),
      vat_number: nullable(input.vatNumber),
      legal_address: nullable(input.legalAddress),
      contact_person: nullable(input.contactPerson),
      billing_email: nullable(input.billingEmail),
      billing_phone: nullable(input.billingPhone),
    },
    { onConflict: "salon_id" },
  );

  if (error) throw new Error(`saveLegalProfile: ${error.message}`);
  revalidatePath(`/salons/${salonId}`);
}

/*
 * `SUB-1` retired the commission/contract model as the launch commercial path.
 *
 * The launch commercial relationship is the provider-neutral Business
 * Subscription: a versioned Subscription Offer, a per-Salon entitlement, and
 * verified provider events as the only entitlement mutators. Running a
 * contract-commission model beside it would give a Salon two contradictory
 * commercial truths, so the two mutations that could start one —
 * `createContract` and `activateContract` — are gone.
 *
 * Existing contracts stay readable as history, and `terminateContract` remains
 * so a legacy contract can be wound down. Admin has no path to grant, cancel,
 * or repair a Business Subscription: see `src/lib/data/subscriptions.ts` for
 * the read-only support view.
 *
 * `BOOST-1` owns the future commission ledger. It is not this model.
 */

export async function terminateContract(salonId: string, contractId: string) {
  const { userId } = await requireSuperadmin();
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("salon_contracts")
    .update({ status: "terminated" })
    .eq("id", contractId)
    .eq("salon_id", salonId);
  if (error) throw new Error(`terminateContract: ${error.message}`);

  await logContractEvent(supabase, contractId, "terminated", userId);

  revalidateSalon(salonId);
}
