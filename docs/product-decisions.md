# Product Decisions — Pieraksts Admin

Resolved decisions from the design grilling session (2026-06-14). This is the
authoritative "why" for the admin panel's behaviour. Pairs with:

- [PLAN.md](../PLAN.md) — checklist / progress.
- [docs/auth-and-access.md](auth-and-access.md) — the auth phase (separate).
- Original PRD: `Pieraksts/docs/prd/contract-management.md`.
- Schema source of truth: `Pieraksts/supabase/migrations/20260614120000_contract_billing_admin_foundation.sql`.

## Terminology (locked)

- **Salon** — the business; Pieraksts's commercial client. Lives in `salons`.
- **User / customer** — the end user who books in the app. `profiles.roles` has
  `client` (customer) and `owner` (salon owner). There is **no Pieraksts-staff
  role** — see the auth doc.
- **Client status** — `salon_admin_profiles.client_status`
  (`lead → negotiating → active → paused → terminated`). Commercial/CRM only.
- **Contract status** — `salon_contracts.status`
  (`draft → pending_signature → signed → active → terminated`). Drives billing.
- **Marketplace visibility** — `salons.is_public`. Whether the salon shows in the
  booking app. Separate from client status.

## Salon list

- Lists **all salons** (every salon registered in the app), left-joined to its
  admin profile. Salons with no admin-profile row show as **Lead** (the table
  default).
- **No "Add salon" action.** Salons self-register in the app; the admin only
  *controls* a salon's status, contracts, invoices, visibility — it never
  creates salons. (The stubbed "Add salon" button is removed.)
- Whole row is clickable → salon detail.
- Columns include a **visibility indicator** (Public / Hidden).
- Search / status filter: **later** (trivial at current volume).

## Overview

Four **co-equal** cards:

1. **Total salons** — `count(salons)`.
2. **Active salons** — `client_status = 'active'`.
3. **App users** — registered customers: `count(profiles where 'client' = any(roles))`.
   (Not "active bookers" — that's an engagement metric for a future analytics view.)
4. **Uninvoiced fees** — `sum(booking_fees.commission_amount where invoice_id is null)`, in €.

Body below the cards = **two panels**, replacing the old "Needs attention":

- **Recent invoices** — reference · salon · period · amount · status.
- **Salons** — latest few with a small status pill, link to the full list.

## Client status ↔ billing

- Billing is **usage-based only** — commission on completed bookings. **No
  recurring/subscription fees.**
- Billing is gated **entirely by contract status**: `resolve_active_salon_contract`
  only generates a fee when a contract is `active`. **No active contract → no
  fee**, even if a booking completes. So a terminated/paused salon cannot be
  accidentally billed.
- `client_status` is therefore **informational/CRM**; the **contract is the
  billing switch**.
- When terminating a client, **prompt**: "Also terminate the active contract?"
  and "Also hide this salon from the app?" — never silent.

## Marketplace visibility (is_public)

- This panel **does** control visibility. `salons.is_public` is
  `boolean not null default true` and is the real gate the app's public queries
  read.
- **Public / Hidden toggle** on the salon detail header; indicator on the list.
- **Caveat (surface in UI):** `is_public` is also the salon owner's own control,
  so admin toggling is an **override** — last writer wins; an owner could
  re-publish. A hard lock (owner *cannot* re-show) would be a separate
  `admin_hidden` flag — **future, not now**.

## Contracts

- **Versioned, never overwritten** (per PRD/migration `unique(salon_id, version)`).
- **Activation is manual** — an "Activate" action on detail. No auto-activation
  on signing. Turning on billing is a deliberate click.
- **Exactly one active contract per salon** is an **app-level invariant** (the DB
  allows more; the resolver picks latest, which is ambiguous). Activating a new
  contract **auto-terminates the prior active one**: set it `terminated` and, if
  its `end_date` is open, set it to the day before the new contract's start.
- Activation **allowed from any state**, but `signed` is the suggested path (no
  e-signature yet; admin is trusted). Buttons guide; they don't lock.
- **All state changes get a confirm dialog naming the exact effect**
  (e.g. "Activating v2 terminates v1, effective 31 Dec 2026"). No silent changes.
- **Contract files (MVP):** Download draft PDF; **Upload signed PDF**
  (`salon_contract_files`, `file_type='signed'`, private `contract-documents`
  bucket); download signed.
- **Contract events timeline:** later — most useful after auth gives a real
  `created_by`.

## PDF generation

- Stack: **`@react-pdf/renderer`** (pure JS, renders in a Node route handler — no
  headless Chromium). Same library for contracts and invoices.
- **Template-as-code** (React-PDF components in the repo, versioned in git), not
  an uploaded `.docx`/`.pdf` with placeholder strings.
- **"Draw contract"** = create the `salon_contracts` row **and** generate the
  draft PDF in one action. Re-generating overwrites the draft file, not the row.
- **Legal-profile gate:** generation is **blocked until the legal profile is
  complete** (company name, reg. number, legal address, contact). Show which
  fields are missing with a link to fill them.
- **Language: Latvian** for contracts and invoices (LV legal documents).

## Invoices

- **Monthly only.** "Generate invoice" uses a month picker defaulting to **last
  month**. Arbitrary date ranges are not exposed (keeps the unique-period index
  meaningful; matches `generate_salon_invoice`).
- **Preview before commit** — "March 2026: 28 fees, €62.00 net + €13.02 VAT =
  €75.02" → confirm. Generating creates a `draft` invoice, attaches frozen lines,
  marks fees invoiced, produces the PDF.
- **No €0 invoices** — `generate_salon_invoice` raises `INVOICE_NO_FEES` with zero
  eligible fees. The action is **disabled** when the month has no uninvoiced fees,
  with a clear message.
- **Lifecycle:** `draft → sent → paid`. **Mark as sent** stamps `sent_at`;
  **Mark as paid** stamps `paid_at`. **Overdue is derived** (status `sent` and
  today past due), not a button. Cancelling releases fees back to uninvoiced.
- **Payment term: 14 days** default (`paymentTermDays` in supplier config). Due =
  `sent_at + 14d`.
- **Invoice breakdown view (MVP):** click an invoice → frozen line items
  (date · service · gross · commission) + totals + Download PDF.
- **Stragglers:** a late booking dated in an already-invoiced month is grabbed by
  any later generation for that month; surface uninvoiced fees grouped by month so
  stray older fees stay visible. No special handling beyond visibility now.

### VAT & supplier identity

- Pieraksts will be a **SIA** and we build for **VAT-registered at 21%**.
  - **Caveat:** SIA ≠ automatically VAT-registered (PVN). Registration is
    separate (mandatory above ~€50k turnover, else voluntary). So VAT is a
    **config flag** (`vatRegistered: true`, `vatRateBps: 2100`): if not actually
    registered at launch, flipping it drops the VAT line and adds a "not VAT
    liable" note.
  - Store `vat_rate_bps`, `vat_amount`, `total_amount` per invoice so historical
    invoices keep their own VAT treatment if the rate/status changes.
- **Supplier details** (Pieraksts legal name, reg. no., VAT no., legal address,
  IBAN/bank) live as a **single config constant** in this repo, scaffolded with
  clearly-marked `TODO` placeholders to fill before going live (one supplier,
  rarely changes — no DB table).
- **Sequential invoice number** — LV requires an unbroken sequence. `PR-YYYY-NNNN`,
  global per year, advancing **only on successful invoice creation** (not per
  salon, not per client join). **Requires a schema addition** — see below.

## Money representation

- `services.price` is **integer euros**; `bookings.booking_price_amount` and all
  billing amounts are **`numeric(12,2)` euros** (not cents).
- The current mock layer (`src/lib/data/salons.ts`, `src/lib/format.ts`) uses
  integer **cents** — **revise to euros (`numeric`)** when wiring real data so it
  matches the DB. Display with 2 decimals; `€` prefix.

## MVP scope vs later

**MVP (build against real data):** salon list (all salons, status, visibility),
overview (4 cards + recent invoices + salons), salon detail, client-status
dropdown, visibility toggle, legal-profile edit, contract draft+versioning+PDF,
contract activate/terminate with confirms, signed-PDF upload/download, monthly
invoice generate (preview, VAT, numbering) + breakdown + PDF + sent/paid.

**Later:** auth (separate phase — its own doc), "this month" booking stats on
detail, contract events timeline, salon notes (`salon_admin_profiles.notes`),
list search/filter, hard-lock visibility (`admin_hidden`), active-bookers
analytics.

## Required schema additions (in the `Pieraksts` repo)

A follow-up migration is needed before invoices are compliant:

1. **`salon_invoices.invoice_number`** — text/unique, backed by a per-year
   gapless sequence/counter, formatted `PR-YYYY-NNNN`, assigned on creation.
2. **VAT columns on `salon_invoices`** — `vat_rate_bps int`, `vat_amount
   numeric(12,2)`, `total_amount numeric(12,2)` (subtotal stays the net
   commission sum).
3. `generate_salon_invoice` updated to assign the number and compute VAT/total
   from the config rate.

These are **not built yet** — documented here so a future agent writes them in
the Pieraksts repo (with rollback SQL) before the invoice flow goes live.
