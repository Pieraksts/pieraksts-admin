/**
 * Salon / contract / billing data — server-only Supabase reads.
 *
 * This is the single swap-point the UI is built against; the accessors are async
 * and shaped so pages don't care that the source is now Supabase (service-role)
 * instead of the previous mock.
 *
 * Money is `numeric(12, 2)` **euros** throughout (matching the DB), not cents.
 *
 * Tables (see `Pieraksts/supabase/migrations/20260614120000_contract_billing_admin_foundation.sql`):
 * salons, salon_admin_profiles, salon_legal_profiles, salon_contracts,
 * booking_fees, salon_invoices, plus `profiles` for the app-user count.
 */
import { getSupabaseAdmin } from "@/lib/supabase/server";

export type ClientStatus = "new" | "active" | "paused" | "terminated";

export type ContractStatus =
  | "draft"
  | "pending_signature"
  | "signed"
  | "active"
  | "terminated";

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled";

export type LegalProfile = {
  companyName: string;
  registrationNumber: string;
  vatNumber: string | null;
  legalAddress: string;
  contactPerson: string;
  billingEmail: string;
  billingPhone: string | null;
};

// Fields required before a contract can be drawn (docs/product-decisions.md →
// "PDF generation" legal-profile gate). Shared by the contract page and the
// create-contract action so the gate is defined once.
const REQUIRED_LEGAL_FIELDS: { key: keyof LegalProfile; label: string }[] = [
  { key: "companyName", label: "Company name" },
  { key: "registrationNumber", label: "Registration number" },
  { key: "legalAddress", label: "Legal address" },
  { key: "contactPerson", label: "Contact person" },
];

/** Labels of the required legal-profile fields that are still missing/blank. */
export function missingLegalFields(profile: LegalProfile | null): string[] {
  return REQUIRED_LEGAL_FIELDS.filter(({ key }) => {
    const value = profile?.[key];
    return !value || (typeof value === "string" && value.trim() === "");
  }).map((f) => f.label);
}

export type Contract = {
  id: string;
  version: number;
  commissionRateBps: number;
  startDate: string;
  endDate: string | null;
  status: ContractStatus;
};

export type BookingFee = {
  id: string;
  bookingDate: string;
  serviceName: string;
  grossAmount: number;
  commissionRateBps: number;
  commissionAmount: number;
  invoiced: boolean;
};

export type Invoice = {
  id: string;
  reference: string;
  periodStart: string;
  periodEnd: string;
  subtotal: number;
  status: InvoiceStatus;
};

export type SalonSummary = {
  id: string;
  name: string;
  city: string;
  clientStatus: ClientStatus;
  isPublic: boolean;
  activeContract: Contract | null;
  uninvoiced: number;
  latestInvoiceStatus: InvoiceStatus | null;
};

export type SalonDetail = SalonSummary & {
  legalProfile: LegalProfile | null;
  contracts: Contract[];
  bookingFees: BookingFee[];
  invoices: Invoice[];
};

export type RecentInvoice = {
  id: string;
  reference: string;
  salonId: string;
  salonName: string;
  periodStart: string;
  periodEnd: string;
  subtotal: number;
  status: InvoiceStatus;
};

export type AdminOverview = {
  salonCount: number;
  activeCount: number;
  appUserCount: number;
  uninvoiced: number;
  recentInvoices: RecentInvoice[];
};

// Default payment term; due = sent_at + 14d (docs/product-decisions.md → Invoices).
const PAYMENT_TERM_DAYS = 14;

// ---------------------------------------------------------------------------
// Row shapes (no generated DB types yet) + small mappers/helpers.
// ---------------------------------------------------------------------------

type Numeric = number | string;

type SalonRow = {
  id: string;
  name: string;
  city: string | null;
  is_public: boolean;
};

type AdminProfileRow = { salon_id: string; client_status: string };

type ContractRow = {
  id: string;
  salon_id: string;
  version: number;
  commission_rate_bps: number;
  start_date: string;
  end_date: string | null;
  status: ContractStatus;
};

type FeeSumRow = { salon_id: string; commission_amount: Numeric };

type FeeRow = {
  id: string;
  booking_date: string;
  service_name_snapshot: string;
  booking_gross_amount: Numeric;
  commission_rate_bps: number;
  commission_amount: Numeric;
};

type InvoiceRow = {
  id: string;
  salon_id: string;
  period_start: string;
  period_end: string;
  subtotal_amount: Numeric;
  status: string;
  sent_at: string | null;
};

type RecentInvoiceRow = InvoiceRow & {
  salons: { name: string } | { name: string }[] | null;
};

type LegalRow = {
  company_name: string | null;
  registration_number: string | null;
  vat_number: string | null;
  legal_address: string | null;
  contact_person: string | null;
  billing_email: string | null;
  billing_phone: string | null;
};

/** PostgREST/numeric can arrive as a string; coerce to a euro number. */
function toEuros(value: Numeric | null | undefined): number {
  return value == null ? 0 : Number(value);
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Mirrors `resolve_active_salon_contract`: the single `active` contract whose
 * date range covers today, preferring the latest start_date then version. A
 * `signed`/`draft`/future-dated contract resolves to none.
 */
function pickActiveContract(
  contracts: Contract[],
  today = todayISO(),
): Contract | null {
  const candidates = contracts
    .filter(
      (c) =>
        c.status === "active" &&
        c.startDate <= today &&
        (c.endDate === null || c.endDate >= today),
    )
    .sort((a, b) =>
      a.startDate === b.startDate
        ? b.version - a.version
        : a.startDate < b.startDate
          ? 1
          : -1,
    );
  return candidates[0] ?? null;
}

/** `salon_invoices` has no number column yet (a planned schema addition); use a
 * short, stable id-derived reference until `invoice_number` lands. */
function invoiceReference(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

/** Overdue is derived, never stored: a `sent` invoice past its 14-day term. */
function deriveInvoiceStatus(
  status: string,
  sentAt: string | null,
): InvoiceStatus {
  if (status === "sent" && sentAt) {
    const due = new Date(sentAt);
    due.setDate(due.getDate() + PAYMENT_TERM_DAYS);
    if (due.getTime() < Date.now()) return "overdue";
  }
  return status as InvoiceStatus;
}

function mapContract(row: ContractRow): Contract {
  return {
    id: row.id,
    version: row.version,
    commissionRateBps: row.commission_rate_bps,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
  };
}

function mapInvoice(row: InvoiceRow): Invoice {
  return {
    id: row.id,
    reference: invoiceReference(row.id),
    periodStart: row.period_start,
    periodEnd: row.period_end,
    subtotal: toEuros(row.subtotal_amount),
    status: deriveInvoiceStatus(row.status, row.sent_at),
  };
}

function mapLegal(row: LegalRow): LegalProfile {
  return {
    companyName: row.company_name ?? "",
    registrationNumber: row.registration_number ?? "",
    vatNumber: row.vat_number,
    legalAddress: row.legal_address ?? "",
    contactPerson: row.contact_person ?? "",
    billingEmail: row.billing_email ?? "",
    billingPhone: row.billing_phone,
  };
}

function unwrap<T>(
  res: { data: T | null; error: { message: string } | null },
  label: string,
): T {
  if (res.error) throw new Error(`${label}: ${res.error.message}`);
  return (res.data ?? ([] as unknown as T)) as T;
}

// ---------------------------------------------------------------------------
// Accessors.
// ---------------------------------------------------------------------------

export async function getSalons(): Promise<SalonSummary[]> {
  const supabase = getSupabaseAdmin();

  const [salonsRes, profilesRes, contractsRes, feesRes, invoicesRes] =
    await Promise.all([
      supabase
        .from("salons")
        .select("id, name, city, is_public")
        .order("name")
        .returns<SalonRow[]>(),
      supabase
        .from("salon_admin_profiles")
        .select("salon_id, client_status")
        .returns<AdminProfileRow[]>(),
      supabase
        .from("salon_contracts")
        .select(
          "id, salon_id, version, commission_rate_bps, start_date, end_date, status",
        )
        .returns<ContractRow[]>(),
      supabase
        .from("booking_fees")
        .select("salon_id, commission_amount")
        .is("invoice_id", null)
        .returns<FeeSumRow[]>(),
      // Ordered newest-first so the first row per salon is its latest invoice.
      supabase
        .from("salon_invoices")
        .select("id, salon_id, period_start, period_end, subtotal_amount, status, sent_at")
        .order("period_end", { ascending: false })
        .order("created_at", { ascending: false })
        .returns<InvoiceRow[]>(),
    ]);

  const salons = unwrap(salonsRes, "salons");
  const profiles = unwrap(profilesRes, "salon_admin_profiles");
  const contracts = unwrap(contractsRes, "salon_contracts");
  const fees = unwrap(feesRes, "booking_fees");
  const invoices = unwrap(invoicesRes, "salon_invoices");

  const statusBySalon = new Map(
    profiles.map((p) => [p.salon_id, p.client_status as ClientStatus]),
  );

  const contractsBySalon = new Map<string, Contract[]>();
  for (const row of contracts) {
    const list = contractsBySalon.get(row.salon_id) ?? [];
    list.push(mapContract(row));
    contractsBySalon.set(row.salon_id, list);
  }

  const uninvoicedBySalon = new Map<string, number>();
  for (const fee of fees) {
    uninvoicedBySalon.set(
      fee.salon_id,
      (uninvoicedBySalon.get(fee.salon_id) ?? 0) + toEuros(fee.commission_amount),
    );
  }

  const latestInvoiceBySalon = new Map<string, InvoiceStatus>();
  for (const inv of invoices) {
    if (!latestInvoiceBySalon.has(inv.salon_id)) {
      latestInvoiceBySalon.set(
        inv.salon_id,
        deriveInvoiceStatus(inv.status, inv.sent_at),
      );
    }
  }

  return salons.map((s) => ({
    id: s.id,
    name: s.name,
    city: s.city ?? "",
    clientStatus: statusBySalon.get(s.id) ?? "new",
    isPublic: s.is_public,
    activeContract: pickActiveContract(contractsBySalon.get(s.id) ?? []),
    uninvoiced: uninvoicedBySalon.get(s.id) ?? 0,
    latestInvoiceStatus: latestInvoiceBySalon.get(s.id) ?? null,
  }));
}

export async function getSalon(id: string): Promise<SalonDetail | null> {
  const supabase = getSupabaseAdmin();

  const [salonRes, profileRes, legalRes, contractsRes, feesRes, invoicesRes] =
    await Promise.all([
      supabase
        .from("salons")
        .select("id, name, city, is_public")
        .eq("id", id)
        .maybeSingle()
        .returns<SalonRow>(),
      supabase
        .from("salon_admin_profiles")
        .select("salon_id, client_status")
        .eq("salon_id", id)
        .maybeSingle()
        .returns<AdminProfileRow>(),
      supabase
        .from("salon_legal_profiles")
        .select(
          "company_name, registration_number, vat_number, legal_address, contact_person, billing_email, billing_phone",
        )
        .eq("salon_id", id)
        .maybeSingle()
        .returns<LegalRow>(),
      supabase
        .from("salon_contracts")
        .select(
          "id, salon_id, version, commission_rate_bps, start_date, end_date, status",
        )
        .eq("salon_id", id)
        .order("version", { ascending: false })
        .returns<ContractRow[]>(),
      supabase
        .from("booking_fees")
        .select(
          "id, booking_date, service_name_snapshot, booking_gross_amount, commission_rate_bps, commission_amount",
        )
        .eq("salon_id", id)
        .is("invoice_id", null)
        .order("booking_date", { ascending: false })
        .returns<FeeRow[]>(),
      supabase
        .from("salon_invoices")
        .select("id, salon_id, period_start, period_end, subtotal_amount, status, sent_at")
        .eq("salon_id", id)
        .order("period_end", { ascending: false })
        .order("created_at", { ascending: false })
        .returns<InvoiceRow[]>(),
    ]);

  if (salonRes.error) throw new Error(`salons: ${salonRes.error.message}`);
  const salon = salonRes.data;
  if (!salon) return null;

  if (profileRes.error)
    throw new Error(`salon_admin_profiles: ${profileRes.error.message}`);
  if (legalRes.error)
    throw new Error(`salon_legal_profiles: ${legalRes.error.message}`);

  const contracts = unwrap(contractsRes, "salon_contracts").map(mapContract);
  const bookingFees = unwrap(feesRes, "booking_fees").map((f) => ({
    id: f.id,
    bookingDate: f.booking_date,
    serviceName: f.service_name_snapshot,
    grossAmount: toEuros(f.booking_gross_amount),
    commissionRateBps: f.commission_rate_bps,
    commissionAmount: toEuros(f.commission_amount),
    invoiced: false,
  }));
  const invoices = unwrap(invoicesRes, "salon_invoices").map(mapInvoice);

  return {
    id: salon.id,
    name: salon.name,
    city: salon.city ?? "",
    clientStatus: (profileRes.data?.client_status as ClientStatus) ?? "new",
    isPublic: salon.is_public,
    activeContract: pickActiveContract(contracts),
    uninvoiced: bookingFees.reduce((sum, f) => sum + f.commissionAmount, 0),
    latestInvoiceStatus: invoices[0]?.status ?? null,
    legalProfile: legalRes.data ? mapLegal(legalRes.data) : null,
    contracts,
    bookingFees,
    invoices,
  };
}

export async function getOverview(): Promise<AdminOverview> {
  const supabase = getSupabaseAdmin();

  const [salonCountRes, activeCountRes, appUserCountRes, feesRes, recentRes] =
    await Promise.all([
      supabase.from("salons").select("id", { count: "exact", head: true }),
      supabase
        .from("salon_admin_profiles")
        .select("salon_id", { count: "exact", head: true })
        .eq("client_status", "active"),
      // App users = registered customers: profiles whose roles array holds 'client'.
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .contains("roles", ["client"]),
      supabase
        .from("booking_fees")
        .select("salon_id, commission_amount")
        .is("invoice_id", null)
        .returns<FeeSumRow[]>(),
      supabase
        .from("salon_invoices")
        .select(
          "id, salon_id, period_start, period_end, subtotal_amount, status, sent_at, salons(name)",
        )
        .order("created_at", { ascending: false })
        .limit(6)
        .returns<RecentInvoiceRow[]>(),
    ]);

  if (salonCountRes.error)
    throw new Error(`salons count: ${salonCountRes.error.message}`);
  if (activeCountRes.error)
    throw new Error(`active count: ${activeCountRes.error.message}`);
  if (appUserCountRes.error)
    throw new Error(`profiles count: ${appUserCountRes.error.message}`);

  const fees = unwrap(feesRes, "booking_fees");
  const uninvoiced = fees.reduce((sum, f) => sum + toEuros(f.commission_amount), 0);

  const recentInvoices = unwrap(recentRes, "salon_invoices").map((row) => {
    const salon = Array.isArray(row.salons) ? row.salons[0] : row.salons;
    return {
      id: row.id,
      reference: invoiceReference(row.id),
      salonId: row.salon_id,
      salonName: salon?.name ?? "",
      periodStart: row.period_start,
      periodEnd: row.period_end,
      subtotal: toEuros(row.subtotal_amount),
      status: deriveInvoiceStatus(row.status, row.sent_at),
    };
  });

  return {
    salonCount: salonCountRes.count ?? 0,
    activeCount: activeCountRes.count ?? 0,
    appUserCount: appUserCountRes.count ?? 0,
    uninvoiced,
    recentInvoices,
  };
}
