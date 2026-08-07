/**
 * Provider-neutral Business Subscription support reads (`SUB-1`).
 *
 * These are read-only. Admin has no path to grant, cancel, or repair a
 * subscription: entitlement is mutated only by verified provider events, and
 * `PAY-1` owns the provider side. There is deliberately no Stripe admin here.
 *
 * This replaces the legacy commission/contract billing model as the launch
 * commercial view. Those records remain readable as history, but they are no
 * longer a live commercial path — see `src/lib/actions/salons.ts`.
 *
 * Money is in **minor units (cents)**, matching the backend contract — unlike
 * the legacy contract/invoice tables in `salons.ts`, which are numeric euros.
 */
import { requireSuperadmin } from "@/lib/auth/require-superadmin";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export type SalonSubscriptionStatus =
  | "none"
  | "pending-payment-method"
  | "trialing"
  | "active"
  | "grace"
  | "ended";

export type SalonEntitlementStatus = "trialing" | "active" | "grace" | "ended";

export type SalonSubscriptionSupportRow = {
  salonId: string;
  salonName: string;
  subscriptionStatus: SalonSubscriptionStatus;
  entitlementStatus: SalonEntitlementStatus | null;
  offerVersion: string | null;
  currency: string | null;
  billingInterval: string | null;
  basePriceAmount: number | null;
  includedBillableSpecialists: number | null;
  additionalSpecialistPriceAmount: number | null;
  billableSpecialistQuantity: number;
  totalAmount: number | null;
  taxPresentation: string | null;
  paymentMethodOnFile: boolean | null;
  trialEndsAt: string | null;
  currentPeriodEndsAt: string | null;
  cancellationEffectiveAt: string | null;
  graceEndsAt: string | null;
  endedAt: string | null;
  isDevelopmentAccess: boolean;
};

type SubscriptionRow = {
  salon_id: string;
  salon_name: string;
  subscription_status: SalonSubscriptionStatus;
  entitlement_status: SalonEntitlementStatus | null;
  offer_version: string | null;
  currency: string | null;
  billing_interval: string | null;
  base_price_amount: number | null;
  included_billable_specialists: number | null;
  additional_specialist_price_amount: number | null;
  billable_specialist_quantity: number;
  total_amount: number | null;
  tax_presentation: string | null;
  payment_method_on_file: boolean | null;
  trial_ends_at: string | null;
  current_period_ends_at: string | null;
  cancellation_effective_at: string | null;
  grace_ends_at: string | null;
  ended_at: string | null;
  is_development_access: boolean;
};

function mapRow(row: SubscriptionRow): SalonSubscriptionSupportRow {
  return {
    salonId: row.salon_id,
    salonName: row.salon_name,
    subscriptionStatus: row.subscription_status,
    entitlementStatus: row.entitlement_status,
    offerVersion: row.offer_version,
    currency: row.currency,
    billingInterval: row.billing_interval,
    basePriceAmount: row.base_price_amount,
    includedBillableSpecialists: row.included_billable_specialists,
    additionalSpecialistPriceAmount: row.additional_specialist_price_amount,
    billableSpecialistQuantity: row.billable_specialist_quantity,
    totalAmount: row.total_amount,
    taxPresentation: row.tax_presentation,
    paymentMethodOnFile: row.payment_method_on_file,
    trialEndsAt: row.trial_ends_at,
    currentPeriodEndsAt: row.current_period_ends_at,
    cancellationEffectiveAt: row.cancellation_effective_at,
    graceEndsAt: row.grace_ends_at,
    endedAt: row.ended_at,
    isDevelopmentAccess: row.is_development_access,
  };
}

export async function getSalonSubscriptions(): Promise<SalonSubscriptionSupportRow[]> {
  await requireSuperadmin();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc("get_admin_salon_subscriptions", {
    p_salon_ids: null,
  });
  if (error) throw new Error(error.message);
  return ((data ?? []) as SubscriptionRow[]).map(mapRow);
}

export async function getSalonSubscription(
  salonId: string,
): Promise<SalonSubscriptionSupportRow | null> {
  await requireSuperadmin();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc("get_admin_salon_subscriptions", {
    p_salon_ids: [salonId],
  });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as SubscriptionRow[];
  return rows.length > 0 ? mapRow(rows[0]) : null;
}

/** Minor units to a display string, e.g. `2999` → `€29.99`. */
export function formatSubscriptionAmount(
  minorUnits: number | null,
  currency: string | null,
): string {
  if (minorUnits === null) return "—";
  const symbol = currency === "EUR" ? "€" : `${currency ?? ""} `;
  const major = Math.trunc(minorUnits / 100);
  const remainder = Math.abs(minorUnits % 100);
  return `${symbol}${major}.${String(remainder).padStart(2, "0")}`;
}
