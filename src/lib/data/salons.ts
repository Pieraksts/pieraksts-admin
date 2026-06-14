/**
 * Mock salon/contract/billing data.
 *
 * This is the single swap-point for Supabase. The accessor functions are async
 * and shaped like the eventual server-only queries, so wiring real data later
 * means replacing the bodies here — not touching any page.
 *
 * Field names mirror the migration tables documented in PLAN.md:
 * salon_admin_profiles, salon_legal_profiles, salon_contracts, booking_fees,
 * salon_invoices.
 */

export type ClientStatus =
  | "lead"
  | "negotiating"
  | "active"
  | "paused"
  | "terminated";

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
  grossAmountCents: number;
  commissionRateBps: number;
  commissionAmountCents: number;
  invoiced: boolean;
};

export type Invoice = {
  id: string;
  reference: string;
  periodStart: string;
  periodEnd: string;
  subtotalCents: number;
  status: InvoiceStatus;
};

export type SalonSummary = {
  id: string;
  name: string;
  city: string;
  clientStatus: ClientStatus;
  activeContract: Contract | null;
  uninvoicedCents: number;
  latestInvoiceStatus: InvoiceStatus | null;
};

export type SalonDetail = SalonSummary & {
  legalProfile: LegalProfile | null;
  contracts: Contract[];
  bookingFees: BookingFee[];
  invoices: Invoice[];
};

const SALONS: SalonDetail[] = [
  {
    id: "beauty-studio-riga",
    name: "Beauty Studio Riga",
    city: "Rīga",
    clientStatus: "active",
    uninvoicedCents: 6200,
    latestInvoiceStatus: "paid",
    activeContract: {
      id: "c-bsr-2",
      version: 2,
      commissionRateBps: 500,
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      status: "active",
    },
    legalProfile: {
      companyName: "Beauty Studio Riga SIA",
      registrationNumber: "40003123456",
      vatNumber: "LV40003123456",
      legalAddress: "Brīvības iela 42, Rīga, LV-1010",
      contactPerson: "Anna Bērziņa",
      billingEmail: "billing@beautystudio.lv",
      billingPhone: "+371 20 123 456",
    },
    contracts: [
      {
        id: "c-bsr-2",
        version: 2,
        commissionRateBps: 500,
        startDate: "2026-01-01",
        endDate: "2026-12-31",
        status: "active",
      },
      {
        id: "c-bsr-1",
        version: 1,
        commissionRateBps: 700,
        startDate: "2025-01-01",
        endDate: "2025-12-31",
        status: "terminated",
      },
    ],
    bookingFees: [
      {
        id: "f-1",
        bookingDate: "2026-06-02",
        serviceName: "Gel manicure",
        grossAmountCents: 4500,
        commissionRateBps: 500,
        commissionAmountCents: 225,
        invoiced: false,
      },
      {
        id: "f-2",
        bookingDate: "2026-06-05",
        serviceName: "Haircut & styling",
        grossAmountCents: 7900,
        commissionRateBps: 500,
        commissionAmountCents: 395,
        invoiced: false,
      },
    ],
    invoices: [
      {
        id: "i-1",
        reference: "PR-2026-05-001",
        periodStart: "2026-05-01",
        periodEnd: "2026-05-31",
        subtotalCents: 5400,
        status: "paid",
      },
    ],
  },
  {
    id: "nails-and-co",
    name: "Nails & Co",
    city: "Jūrmala",
    clientStatus: "negotiating",
    uninvoicedCents: 0,
    latestInvoiceStatus: null,
    activeContract: null,
    legalProfile: {
      companyName: "Nails and Co SIA",
      registrationNumber: "40103987654",
      vatNumber: null,
      legalAddress: "Jomas iela 5, Jūrmala, LV-2015",
      contactPerson: "Līga Kalniņa",
      billingEmail: "liga@nailsco.lv",
      billingPhone: null,
    },
    contracts: [
      {
        id: "c-nc-1",
        version: 1,
        commissionRateBps: 600,
        startDate: "2026-07-01",
        endDate: null,
        status: "draft",
      },
    ],
    bookingFees: [],
    invoices: [],
  },
  {
    id: "studio-lapa",
    name: "Studio Lapa",
    city: "Liepāja",
    clientStatus: "paused",
    uninvoicedCents: 1850,
    latestInvoiceStatus: "overdue",
    activeContract: {
      id: "c-sl-1",
      version: 1,
      commissionRateBps: 800,
      startDate: "2027-01-01",
      endDate: null,
      status: "signed",
    },
    legalProfile: null,
    contracts: [
      {
        id: "c-sl-1",
        version: 1,
        commissionRateBps: 800,
        startDate: "2027-01-01",
        endDate: null,
        status: "signed",
      },
    ],
    bookingFees: [
      {
        id: "f-3",
        bookingDate: "2026-04-18",
        serviceName: "Lash extensions",
        grossAmountCents: 6166,
        commissionRateBps: 300,
        commissionAmountCents: 185,
        invoiced: false,
      },
    ],
    invoices: [
      {
        id: "i-2",
        reference: "PR-2026-03-004",
        periodStart: "2026-03-01",
        periodEnd: "2026-03-31",
        subtotalCents: 2100,
        status: "overdue",
      },
    ],
  },
];

export async function getSalons(): Promise<SalonSummary[]> {
  return SALONS.map((s) => toSummary(s));
}

export async function getSalon(id: string): Promise<SalonDetail | null> {
  return SALONS.find((s) => s.id === id) ?? null;
}

export type AdminOverview = {
  salonCount: number;
  activeCount: number;
  uninvoicedCents: number;
  openContractCount: number;
  attention: { salonId: string; salonName: string; reason: string }[];
};

export async function getOverview(): Promise<AdminOverview> {
  const attention: AdminOverview["attention"] = [];
  let uninvoicedCents = 0;
  let activeCount = 0;
  let openContractCount = 0;

  for (const s of SALONS) {
    uninvoicedCents += s.uninvoicedCents;
    if (s.clientStatus === "active") activeCount += 1;
    openContractCount += s.contracts.filter(
      (c) => c.status === "draft" || c.status === "pending_signature",
    ).length;

    if (s.latestInvoiceStatus === "overdue") {
      attention.push({
        salonId: s.id,
        salonName: s.name,
        reason: "Invoice overdue",
      });
    }
    if (!s.legalProfile) {
      attention.push({
        salonId: s.id,
        salonName: s.name,
        reason: "Legal profile missing",
      });
    }
    if (s.contracts.some((c) => c.status === "draft")) {
      attention.push({
        salonId: s.id,
        salonName: s.name,
        reason: "Contract draft awaiting signature",
      });
    }
  }

  return {
    salonCount: SALONS.length,
    activeCount,
    uninvoicedCents,
    openContractCount,
    attention,
  };
}

function toSummary(s: SalonDetail): SalonSummary {
  return {
    id: s.id,
    name: s.name,
    city: s.city,
    clientStatus: s.clientStatus,
    activeContract: s.activeContract,
    uninvoicedCents: s.uninvoicedCents,
    latestInvoiceStatus: s.latestInvoiceStatus,
  };
}
