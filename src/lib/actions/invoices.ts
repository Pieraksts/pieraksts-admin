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
import { getSupabaseAdmin } from "@/lib/supabase/server";

/** Refresh every view that surfaces an invoice or its salon. */
function revalidateInvoices(salonId: string, invoiceId?: string) {
  if (invoiceId) revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
  revalidatePath(`/salons/${salonId}`);
  revalidatePath("/salons");
  revalidatePath("/");
}

/*
 * `SUB-1` retired commission invoicing as the launch commercial path, so
 * `generateInvoice` is gone. Booking-fee commission invoices belong to the
 * contract model the Business Subscription replaces; issuing one now would
 * bill a Salon twice under two different commercial truths.
 *
 * The existing lifecycle actions below stay so already-issued invoices can be
 * settled or cancelled. `BOOST-1` owns the future commission ledger and will
 * charge it as off-session PaymentIntents, never as an invoice generated here.
 */

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

  // Release the frozen fees so they become uninvoiced again.
  const { error: releaseError } = await supabase
    .from("booking_fees")
    .update({ invoice_id: null })
    .eq("invoice_id", invoiceId);

  if (releaseError) {
    throw new Error(`cancelInvoice (release fees): ${releaseError.message}`);
  }

  // Drop the frozen line items. `salon_invoice_lines.booking_fee_id` is unique,
  // so leaving them would block the released fees from ever being re-invoiced.
  // The cancelled invoice header (number, period, totals, status) is retained as
  // the void record.
  const { error: linesError } = await supabase
    .from("salon_invoice_lines")
    .delete()
    .eq("invoice_id", invoiceId);

  if (linesError) {
    throw new Error(`cancelInvoice (clear lines): ${linesError.message}`);
  }

  revalidateInvoices(salonId, invoiceId);
}
