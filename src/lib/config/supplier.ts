/**
 * Pieraksts (the supplier) identity + invoicing terms.
 *
 * One supplier, rarely changes — kept as a single config constant rather than a
 * DB table (docs/product-decisions.md → "VAT & supplier identity"). The `TODO`
 * fields MUST be filled with the real SIA details before going live; they appear
 * on every generated invoice PDF.
 *
 * VAT is a flag: a SIA is not automatically VAT (PVN) registered. While
 * `vatRegistered` is false, invoices drop the VAT line and carry a "not VAT
 * liable" note; flip it (and confirm `vatRateBps`) once registration lands.
 */
export const SUPPLIER = {
  // TODO(go-live): real legal identity.
  legalName: "TODO — Pieraksts SIA",
  registrationNumber: "TODO — reg. no.",
  vatNumber: "TODO — LV VAT no.",
  legalAddress: "TODO — legal address",

  // TODO(go-live): real bank details for payment.
  iban: "TODO — IBAN",
  bankName: "TODO — bank",

  /** Due = sent_at + this many days (docs/product-decisions.md → Invoices). */
  paymentTermDays: 14,

  /**
   * VAT registration status. We build for VAT-registered at 21% (2100 bps).
   * Set to false until the PVN registration is actually granted.
   */
  vatRegistered: true,
  vatRateBps: 2100,
} as const;

/**
 * The VAT rate (bps) actually applied to new invoices: the configured rate when
 * registered, else 0. This is what the admin passes into `generate_salon_invoice`
 * and what the preview uses, so a single switch governs the math everywhere.
 */
export const SUPPLIER_VAT_RATE_BPS = SUPPLIER.vatRegistered
  ? SUPPLIER.vatRateBps
  : 0;
