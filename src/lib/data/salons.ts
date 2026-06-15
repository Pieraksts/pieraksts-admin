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
import { requireSuperadmin } from "@/lib/auth/require-superadmin";
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
  /** Assigned `PR-YYYY-NNNN` once generated; falls back to an id prefix. */
  reference: string;
  invoiceNumber: string | null;
  periodStart: string;
  periodEnd: string;
  /** Net commission sum. */
  subtotal: number;
  vatRateBps: number;
  vatAmount: number;
  /** subtotal + VAT — the amount due. */
  total: number;
  status: InvoiceStatus;
  sentAt: string | null;
  paidAt: string | null;
  /** Derived: sent_at + payment term; null until sent. */
  dueDate: string | null;
};

export type InvoiceLine = {
  id: string;
  bookingDate: string;
  serviceName: string;
  grossAmount: number;
  commissionRateBps: number;
  commissionAmount: number;
};

export type InvoiceDetail = Invoice & {
  salonId: string;
  salonName: string;
  lines: InvoiceLine[];
};

/** A salon's uninvoiced fees collapsed to one month (YYYY-MM). */
export type UninvoicedMonth = {
  month: string;
  feeCount: number;
  net: number;
};

export type InvoiceListItem = Invoice & {
  salonId: string;
  salonName: string;
};

/** A salon with uninvoiced fees, grouped by month — drives the /invoices page. */
export type SalonUninvoiced = {
  salonId: string;
  salonName: string;
  months: UninvoicedMonth[];
  net: number;
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

export type AdminOverview = {
  salonCount: number;
  activeCount: number;
  appUserCount: number;
  uninvoiced: number;
  recentInvoices: InvoiceListItem[];
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
  invoice_number: string | null;
  period_start: string;
  period_end: string;
  subtotal_amount: Numeric;
  vat_rate_bps: number | null;
  vat_amount: Numeric | null;
  total_amount: Numeric | null;
  status: string;
  sent_at: string | null;
  paid_at: string | null;
};

type RecentInvoiceRow = InvoiceRow & {
  salons: { name: string } | { name: string }[] | null;
};

type InvoiceLineRow = {
  id: string;
  booking_date: string;
  service_name_snapshot: string;
  booking_gross_amount: Numeric;
  commission_rate_bps: number;
  commission_amount: Numeric;
};

// Columns selected wherever an invoice is read (keep in sync with InvoiceRow).
const INVOICE_COLUMNS =
  "id, salon_id, invoice_number, period_start, period_end, subtotal_amount, vat_rate_bps, vat_amount, total_amount, status, sent_at, paid_at";

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

/** Human reference: the assigned `PR-YYYY-NNNN`, or a short id prefix as a
 * fallback for any legacy row that predates numbering. */
function invoiceReference(invoiceNumber: string | null, id: string): string {
  return invoiceNumber ?? id.slice(0, 8).toUpperCase();
}

/** Payment due date (YYYY-MM-DD) = sent_at + term; null until sent. */
function dueDateFor(sentAt: string | null): string | null {
  if (!sentAt) return null;
  const due = new Date(sentAt);
  due.setDate(due.getDate() + PAYMENT_TERM_DAYS);
  return due.toISOString().slice(0, 10);
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

/** Month key (YYYY-MM) of an ISO date. */
function monthOf(iso: string): string {
  return iso.slice(0, 7);
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
  const subtotal = toEuros(row.subtotal_amount);
  return {
    id: row.id,
    reference: invoiceReference(row.invoice_number, row.id),
    invoiceNumber: row.invoice_number,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    subtotal,
    vatRateBps: row.vat_rate_bps ?? 0,
    vatAmount: toEuros(row.vat_amount),
    // Legacy rows predating the VAT columns fall back to the net subtotal.
    total: row.total_amount == null ? subtotal : toEuros(row.total_amount),
    status: deriveInvoiceStatus(row.status, row.sent_at),
    sentAt: row.sent_at,
    paidAt: row.paid_at,
    dueDate: dueDateFor(row.sent_at),
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
  await requireSuperadmin();
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
        .select(INVOICE_COLUMNS)
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
  await requireSuperadmin();
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
        .select(INVOICE_COLUMNS)
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
  await requireSuperadmin();
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
        .select(`${INVOICE_COLUMNS}, salons(name)`)
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
      ...mapInvoice(row),
      salonId: row.salon_id,
      salonName: salon?.name ?? "",
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

/** A single invoice with its frozen line items — the breakdown view. */
export async function getInvoice(id: string): Promise<InvoiceDetail | null> {
  await requireSuperadmin();
  const supabase = getSupabaseAdmin();

  const [invoiceRes, linesRes] = await Promise.all([
    supabase
      .from("salon_invoices")
      .select(`${INVOICE_COLUMNS}, salons(name)`)
      .eq("id", id)
      .maybeSingle()
      .returns<RecentInvoiceRow>(),
    supabase
      .from("salon_invoice_lines")
      .select(
        "id, booking_date, service_name_snapshot, booking_gross_amount, commission_rate_bps, commission_amount",
      )
      .eq("invoice_id", id)
      .order("booking_date", { ascending: true })
      .returns<InvoiceLineRow[]>(),
  ]);

  if (invoiceRes.error)
    throw new Error(`salon_invoices: ${invoiceRes.error.message}`);
  const row = invoiceRes.data;
  if (!row) return null;

  const salon = Array.isArray(row.salons) ? row.salons[0] : row.salons;
  const lines = unwrap(linesRes, "salon_invoice_lines").map((l) => ({
    id: l.id,
    bookingDate: l.booking_date,
    serviceName: l.service_name_snapshot,
    grossAmount: toEuros(l.booking_gross_amount),
    commissionRateBps: l.commission_rate_bps,
    commissionAmount: toEuros(l.commission_amount),
  }));

  return {
    ...mapInvoice(row),
    salonId: row.salon_id,
    salonName: salon?.name ?? "",
    lines,
  };
}

/** Every invoice (newest first) + uninvoiced fees grouped by salon and month —
 * the cross-salon /invoices view. Stray older fees stay visible per the
 * stragglers note (docs/product-decisions.md → Invoices). */
export async function getInvoicesPage(): Promise<{
  invoices: InvoiceListItem[];
  uninvoiced: SalonUninvoiced[];
}> {
  await requireSuperadmin();
  const supabase = getSupabaseAdmin();

  type UninvoicedFeeRow = {
    salon_id: string;
    booking_date: string;
    commission_amount: Numeric;
    salons: { name: string } | { name: string }[] | null;
  };

  const [invoicesRes, feesRes] = await Promise.all([
    supabase
      .from("salon_invoices")
      .select(`${INVOICE_COLUMNS}, salons(name)`)
      .order("created_at", { ascending: false })
      .returns<RecentInvoiceRow[]>(),
    supabase
      .from("booking_fees")
      .select("salon_id, booking_date, commission_amount, salons(name)")
      .is("invoice_id", null)
      .order("booking_date", { ascending: false })
      .returns<UninvoicedFeeRow[]>(),
  ]);

  const invoices = unwrap(invoicesRes, "salon_invoices").map((row) => {
    const salon = Array.isArray(row.salons) ? row.salons[0] : row.salons;
    return {
      ...mapInvoice(row),
      salonId: row.salon_id,
      salonName: salon?.name ?? "",
    };
  });

  // Group uninvoiced fees: salon -> month -> {count, net}.
  const bySalon = new Map<
    string,
    { name: string; months: Map<string, { feeCount: number; net: number }> }
  >();
  for (const fee of unwrap(feesRes, "booking_fees")) {
    const salon = Array.isArray(fee.salons) ? fee.salons[0] : fee.salons;
    const entry =
      bySalon.get(fee.salon_id) ??
      { name: salon?.name ?? "", months: new Map() };
    const month = monthOf(fee.booking_date);
    const m = entry.months.get(month) ?? { feeCount: 0, net: 0 };
    m.feeCount += 1;
    m.net += toEuros(fee.commission_amount);
    entry.months.set(month, m);
    bySalon.set(fee.salon_id, entry);
  }

  const uninvoiced: SalonUninvoiced[] = [...bySalon.entries()]
    .map(([salonId, { name, months }]) => {
      const monthList = [...months.entries()]
        .map(([month, v]) => ({ month, ...v }))
        .sort((a, b) => (a.month < b.month ? 1 : -1));
      return {
        salonId,
        salonName: name,
        months: monthList,
        net: monthList.reduce((s, m) => s + m.net, 0),
      };
    })
    .sort((a, b) => b.net - a.net);

  return { invoices, uninvoiced };
}
