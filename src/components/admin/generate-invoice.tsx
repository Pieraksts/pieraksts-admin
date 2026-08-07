/**
 * RETIRED by `SUB-1` — safe to delete.
 *
 * This module generated a monthly commission invoice from uninvoiced booking
 * fees, which was the launch commercial path before the provider-neutral
 * Business Subscription replaced it. Its server action (`generateInvoice`) is
 * gone and nothing imports this file any more. It is left in place only
 * because this change could not remove the file itself; delete it in the next
 * pass.
 *
 * `BOOST-1` owns the future commission ledger and charges it as off-session
 * PaymentIntents, never as an invoice generated here.
 */
export {};
