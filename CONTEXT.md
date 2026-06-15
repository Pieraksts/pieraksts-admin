# Pieraksts Admin — Context

Internal back office for **Pieraksts** (the supplier) to manage its salon clients:
commercial status, contracts, marketplace visibility, and **usage-based commission
billing**. Server-rendered Next.js 16 app, Supabase (service-role, server-only)
behind a superadmin auth gate. Money is euros (`numeric(12,2)`) end-to-end.

> Authoritative "why": [docs/product-decisions.md](docs/product-decisions.md) ·
> auth: [docs/auth-and-access.md](docs/auth-and-access.md) · schema lives in the
> sibling **Pieraksts** repo (`supabase/migrations/`).

## What the panel can do today

**Salons**
- [x] List every registered salon with client status + marketplace visibility
- [x] Salon detail: status, visibility, legal profile, contracts, fees, invoices
- [x] Set **client status** (`new → active → paused → terminated`), with a
      cascade prompt on terminate (also end contract? also hide?)
- [x] Toggle **marketplace visibility** (`is_public`) — admin override of the
      owner's own toggle
- [ ] No "add salon" — salons self-register in the app; admin only controls them

**Contracts** (versioned, never overwritten)
- [x] Draft a new versioned contract (commission rate, start/end), gated on a
      complete legal profile
- [x] **Activate** (auto-terminates the prior active one) / **Terminate**, each
      behind a confirm dialog naming the exact effect
- [x] Billing is gated entirely by an **active** contract — no active contract,
      no fee, even on completed bookings
- [ ] Draft/signed PDF + signed-upload — later (PDF track)

**Billing & invoices** (commission on completed bookings)
- [x] Booking fees accrue automatically (DB trigger) when a booking completes
      under an active contract
- [x] **Generate a monthly invoice**: month picker (defaults to last month),
      live preview "N fees, €net + €VAT = €total", confirm — no €0 invoices
- [x] **Gapless `PR-YYYY-NNNN`** numbering, assigned atomically on creation
- [x] **VAT** stored per invoice (rate / amount / total), driven by the supplier
      config flag (21% when registered, dropped + "not VAT liable" when not)
- [x] Lifecycle: **draft → sent → paid**; **overdue derived** (sent + 14d);
      **cancel** releases fees back to uninvoiced and is re-invoiceable
- [x] **Breakdown view** per invoice: frozen line items + totals
- [x] Cross-salon `/invoices`: all invoices + uninvoiced fees grouped by
      salon/month (stragglers stay visible)
- [ ] Invoice/contract **PDF** generation (`@react-pdf/renderer`, Latvian) — later
- [ ] UI polish pass — see [handoffs/step-4-invoice-ui-polish.md](handoffs/step-4-invoice-ui-polish.md)

**Overview**
- [x] Cards (total / active salons, app users, uninvoiced fees) + recent invoices

**Access**
- [x] Email/password login; every data accessor + action calls
      `requireSuperadmin()`; non-admins → `/403`, no session → `/login`

## Domain language

- **Salon** — the business; Pieraksts's commercial client (`salons`).
- **Client status** — CRM state (`salon_admin_profiles.client_status`).
- **Contract** — versioned billing agreement; an **active** one is the billing
  switch (`salon_contracts`).
- **Booking fee** — commission on one completed booking (`booking_fees`).
- **Invoice** — a month's fees, frozen into lines, numbered, VAT-applied
  (`salon_invoices` + `salon_invoice_lines`).
- **Supplier** — Pieraksts itself; identity/VAT terms in
  [src/lib/config/supplier.ts](src/lib/config/supplier.ts) (⚠️ `TODO` placeholders
  to fill before go-live).

## How it's built

- **Reads**: `src/lib/data/salons.ts` — server-only, service-role, euros.
- **Writes**: `src/lib/actions/*.ts` — `'use server'`, `requireSuperadmin()`,
  `revalidatePath`, confirm dialogs that name every effect (no silent changes).
- **Invoice numbers/VAT/totals are owned by the DB** RPC `generate_salon_invoice`
  (one transaction: number + lines + fee-marking).
- Data pages are `force-dynamic`. Primitives in `src/components/ui/`
  (shadcn-style); monochrome + rose design system in `src/app/globals.css`.

## Gotchas

- DB schema/migrations live in the sibling **Pieraksts** repo and are applied
  **manually via the Supabase dashboard** (no CLI/connection string).
- Build/dev/preview need **Node ≥ 20.9** (`.nvmrc` pins 22; default `node` is 18).
- `npm install` needs `--legacy-peer-deps`.
- Open design question: a straggler fee in an already-invoiced (non-cancelled)
  month can't be re-invoiced (unique-period index) until the original is cancelled.
