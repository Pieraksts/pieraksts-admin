"use server";

/**
 * Server-only invoice actions: generate (monthly), lifecycle (sent / paid /
 * cancel). Service-role client, mirroring `src/lib/actions/salons.ts`. No auth
 * yet — see docs/auth-and-access.md.
 *
 * The numbers are owned by the DB: `generate_salon_invoice` freezes the lines,
 * assigns the gapless `PR-YYYY-NNNN` number, computes VAT/total, and marks the
 * fees invoiced — all in one transaction. The VAT rate comes from the supplier
 * config (0 when not VAT-registered), so a single switch governs the math.
 *
 * Like every billing accessor/action, each entry point calls
 * `requireSuperadmin()` first (docs/auth-and-access.md) — server actions are
 * publicly reachable POST endpoints, so the guard must live in the action, not
 * just the UI.
 */
import { revalidatePath } from "next/cache";

import { requireSuperadmin } from "@/lib/auth/require-superadmin";
import { SUPPLIER_VAT_RATE_BPS } from "@/lib/config/supplier";
import { getSupabaseAdmin } from "@/lib/supabase/server";

/** Refresh every view that surfaces an invoice or its salon. */
function revalidateInvoices(salonId: string, invoiceId?: string) {
  if (invoiceId) revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
  revalidatePath(`/salons/${salonId}`);
  revalidatePath("/salons");
  revalidatePath("/");
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Generate a draft invoice for a salon over [periodStart, periodEnd] (a calendar
 * month, supplied by the UI). Raises `INVOICE_NO_FEES` when the month has no
 * uninvoiced fees — there are never €0 invoices. Returns the new invoice id.
 */
export async function generateInvoice(
  salonId: string,
  periodStart: string,
  periodEnd: string,
): Promise<{ id: string }> {
  if (!ISO_DATE.test(periodStart) || !ISO_DATE.test(periodEnd)) {
    throw new Error("generateInvoice: invalid period");
  }
  if (periodEnd < periodStart) {
    throw new Error("generateInvoice: end before start");
  }

  await requireSuperadmin();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .rpc("generate_salon_invoice", {
      p_salon_id: salonId,
      p_period_start: periodStart,
      p_period_end: periodEnd,
      p_vat_rate_bps: SUPPLIER_VAT_RATE_BPS,
    })
    .select("id")
    .single<{ id: string }>();

  if (error) {
    // Surface the DB's domain errors verbatim so the UI can react to them.
    if (error.message.includes("INVOICE_NO_FEES")) {
      throw new Error("INVOICE_NO_FEES");
    }
    throw new Error(`generateInvoice: ${error.message}`);
  }

  revalidateInvoices(salonId, data.id);
  return { id: data.id };
}

/** Stamp an invoice as sent (only from draft). Due = sent_at + term. */
export async function markInvoiceSent(invoiceId: string, salonId: string) {
  await requireSuperadmin();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("salon_invoices")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", invoiceId)
    .eq("status", "draft")
    .select("id");

  if (error) throw new Error(`markInvoiceSent: ${error.message}`);
  if (!data || data.length === 0) {
    throw new Error("markInvoiceSent: invoice is not a draft");
  }
  revalidateInvoices(salonId, invoiceId);
}

/** Stamp an invoice as paid (from sent; overdue is just a derived 'sent'). */
export async function markInvoicePaid(invoiceId: string, salonId: string) {
  await requireSuperadmin();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("salon_invoices")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", invoiceId)
    .eq("status", "sent")
    .select("id");

  if (error) throw new Error(`markInvoicePaid: ${error.message}`);
  if (!data || data.length === 0) {
    throw new Error("markInvoicePaid: invoice is not awaiting payment");
  }
  revalidateInvoices(salonId, invoiceId);
}

/**
 * Cancel an invoice and release its fees back to uninvoiced (null out
 * `booking_fees.invoice_id`), so they can be picked up by a later generation.
 * Allowed from draft or sent — never from paid.
 */
export async function cancelInvoice(invoiceId: string, salonId: string) {
  await requireSuperadmin();
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("salon_invoices")
    .update({ status: "cancelled" })
    .eq("id", invoiceId)
    .in("status", ["draft", "sent"])
    .select("id");

  if (error) throw new Error(`cancelInvoice: ${error.message}`);
  if (!data || data.length === 0) {
    throw new Error("cancelInvoice: only a draft or sent invoice can be cancelled");
  }

  // Release the frozen fees. The lines stay attached to the cancelled invoice as
  // a record; the fees themselves become uninvoiced again.
  const { error: releaseError } = await supabase
    .from("booking_fees")
    .update({ invoice_id: null })
    .eq("invoice_id", invoiceId);

  if (releaseError) {
    throw new Error(`cancelInvoice (release fees): ${releaseError.message}`);
  }

  revalidateInvoices(salonId, invoiceId);
}
