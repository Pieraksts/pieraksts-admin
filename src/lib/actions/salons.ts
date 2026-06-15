"use server";

/**
 * Server-only write actions for the admin panel. These run on the server and use
 * the service-role client (bypasses RLS), mirroring the read layer in
 * `src/lib/data/salons.ts`.
 *
 * NOTE: there is no auth yet (separate phase — see docs/auth-and-access.md), so
 * these mutations are currently unguarded. That's acceptable for local-only use;
 * auth gates any deploy.
 */
import { revalidatePath } from "next/cache";

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

export async function setClientStatus(salonId: string, status: ClientStatus) {
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

export async function setVisibility(salonId: string, isPublic: boolean) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("salons")
    .update({ is_public: isPublic })
    .eq("id", salonId);

  if (error) throw new Error(`setVisibility: ${error.message}`);
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

export type NewContractInput = {
  commissionRateBps: number;
  startDate: string;
  endDate: string | null;
  status: "draft" | "pending_signature";
};

export async function createContract(salonId: string, input: NewContractInput) {
  if (
    !Number.isInteger(input.commissionRateBps) ||
    input.commissionRateBps < 0 ||
    input.commissionRateBps > 10000
  ) {
    throw new Error("createContract: commission rate out of range");
  }
  if (!input.startDate) throw new Error("createContract: start date required");
  if (input.endDate && input.endDate < input.startDate) {
    throw new Error("createContract: end date before start date");
  }

  const supabase = getSupabaseAdmin();

  // Gate: legal profile must be complete (docs/product-decisions.md).
  const { data: legal, error: legalError } = await supabase
    .from("salon_legal_profiles")
    .select("company_name, registration_number, legal_address, contact_person")
    .eq("salon_id", salonId)
    .maybeSingle();
  if (legalError) throw new Error(`createContract: ${legalError.message}`);
  const complete =
    legal?.company_name &&
    legal?.registration_number &&
    legal?.legal_address &&
    legal?.contact_person;
  if (!complete) throw new Error("LEGAL_PROFILE_INCOMPLETE");

  // Next version (contracts are versioned, never overwritten).
  const { data: latest, error: versionError } = await supabase
    .from("salon_contracts")
    .select("version")
    .eq("salon_id", salonId)
    .order("version", { ascending: false })
    .limit(1);
  if (versionError) throw new Error(`createContract: ${versionError.message}`);
  const nextVersion = (latest?.[0]?.version ?? 0) + 1;

  const { error } = await supabase.from("salon_contracts").insert({
    salon_id: salonId,
    version: nextVersion,
    commission_rate_bps: input.commissionRateBps,
    start_date: input.startDate,
    end_date: input.endDate,
    status: input.status,
  });
  if (error) throw new Error(`createContract: ${error.message}`);

  revalidateSalon(salonId);
}

/** YYYY-MM-DD one day before the given ISO date. */
function isoDayBefore(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Activate a contract. Enforces the app-level "exactly one active contract"
 * invariant: any other active contract is auto-terminated, and if its end_date
 * was open it's closed the day before this contract starts
 * (docs/product-decisions.md → Contracts).
 */
export async function activateContract(salonId: string, contractId: string) {
  const supabase = getSupabaseAdmin();

  const { data: target, error: targetError } = await supabase
    .from("salon_contracts")
    .select("id, start_date")
    .eq("id", contractId)
    .eq("salon_id", salonId)
    .maybeSingle();
  if (targetError) throw new Error(`activateContract: ${targetError.message}`);
  if (!target) throw new Error("activateContract: contract not found");

  const { data: priorActive, error: priorError } = await supabase
    .from("salon_contracts")
    .select("id, end_date")
    .eq("salon_id", salonId)
    .eq("status", "active")
    .neq("id", contractId);
  if (priorError) throw new Error(`activateContract: ${priorError.message}`);

  for (const prior of priorActive ?? []) {
    const update: { status: string; end_date?: string } = {
      status: "terminated",
    };
    if (prior.end_date == null) update.end_date = isoDayBefore(target.start_date);
    const { error } = await supabase
      .from("salon_contracts")
      .update(update)
      .eq("id", prior.id);
    if (error) throw new Error(`activateContract (terminate prior): ${error.message}`);
  }

  const { error } = await supabase
    .from("salon_contracts")
    .update({ status: "active" })
    .eq("id", contractId);
  if (error) throw new Error(`activateContract: ${error.message}`);

  revalidateSalon(salonId);
}

export async function terminateContract(salonId: string, contractId: string) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("salon_contracts")
    .update({ status: "terminated" })
    .eq("id", contractId)
    .eq("salon_id", salonId);
  if (error) throw new Error(`terminateContract: ${error.message}`);
  revalidateSalon(salonId);
}
