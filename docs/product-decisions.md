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
  (`new → active → paused → terminated`). Commercial/CRM only.
  **Revised 2026-06-14:** `lead` renamed to `new` (it's the auto-default for every
  self-registered salon, not a qualified sales lead), and `negotiating` was
  **dropped** (the contract lifecycle — `draft`/`pending_signature` — already
  represents an in-progress deal). Schema migration + admin type/badge update
  still pending; see "Going live" below.
- **Contract status** — `salon_contracts.status`
  (`draft → pending_signature → signed → active → terminated`). Drives billing.
- **Marketplace visibility** — **derived**, never a stored writable flag
  (`RDY-1`). The `public.salon_visibility` view computes it from owner
  publication intent + Publication Readiness + entitlement + Moderation
  Suspension. Separate from client status. See "Marketplace visibility
  (derived)" below.
- **Publication Readiness** — the server-computed check that a salon is
  complete enough to be public (profile, services, working hours, specialists,
  legal/billing details, marketplace terms, entitlement). Zero blockers = ready.
- **Moderation Suspension** — Pieraksts's own exceptional override (fraud,
  safety, legal, marketplace policy). The only visibility-related control Admin
  holds.

## Salon list

- Lists **all salons** (every salon registered in the app), left-joined to its
  admin profile. Salons with no admin-profile row show as **New** (the table
  default).
- **No "Add salon" action.** Salons self-register in the app; the admin only
  *controls* a salon's status, contracts, invoices, and moderation — it never
  creates salons. (The stubbed "Add salon" button is removed.)
- Whole row is clickable → salon detail.
- Columns include a **derived visibility indicator** (Public / Hidden by owner /
  Setup incomplete / No subscription / Suspended) — read-only.
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
  — never silent. **Revised by `RDY-1`:** the companion "Also hide this salon
  from the app?" prompt is **gone**. Terminating a client is a commercial
  decision, not a moderation action, and Admin no longer has a publication
  write to perform. If a salon must come off the marketplace, that is a
  Moderation Suspension with a recorded reason.

## Marketplace visibility (derived)

**Revised by `RDY-1`** (backend migration
`pieraksts-backend/supabase/migrations/20260804120000_rdy_1_setup_home_readiness_visibility_development_access.sql`).
The writable `salons.is_public` switch is **dropped**. Visibility is no longer
something anyone sets — it is *computed* from four durable facts:

1. **Owner publication intent** — `salon_publication_states.owner_intent`
   (`published` / `hidden`). Only the salon owner sets this, through the
   business app; Admin has no write path to it.
2. **Publication Readiness** — zero blockers from `salon_readiness_blockers()`
   (display name, location, public contact phone, a bookable service, a full
   week of salon working hours, a specialist with a service assignment and a
   bookable window, complete legal/billing details, accepted marketplace terms,
   and an entitlement).
3. **Entitlement** — a `salon_entitlements` row that is `trialing` or `active`
   and not revoked.
4. **Moderation Suspension** — an open `salon_moderation_suspensions` row.

`public.salon_visibility` is the single canonical definition every public
projection and RLS policy consults. It resolves to one of **five states**, in
this precedence order:

| State | Meaning |
| --- | --- |
| `suspended` | Pieraksts moderation has suspended the salon. Overrides everything below — readiness and payment cannot lift it. |
| `owner-hidden` | Ready and entitled, but the owner chose not to publish. |
| `no-entitlement` | No trialing/active entitlement. |
| `not-ready` | Publication Readiness has outstanding blockers. |
| `published` | Owner intends to publish, readiness is satisfied, no suspension. Marketplace-visible. |

(Entitlement is also one of the readiness blockers — `entitlement_missing` —
so `not-ready` and `no-entitlement` overlap in the data. The state machine
reports the entitlement case separately because it's the one the owner fixes
by paying rather than by finishing setup.)

### What Admin does with it

- **Admin has no publication switch.** The old Public/Hidden toggle and its
  `setVisibility` direct write are gone. `setVisibility` is replaced by
  `suspendSalonModeration` / `releaseSalonModeration`, which call the
  `suspend_salon_moderation` / `release_salon_moderation` RPCs — the only
  visibility-adjacent writes Admin is granted.
- The derived state is **read-only** in the UI: the salon detail header and the
  list column render the label for `visibility.state`, plus the underlying
  `isReady` / `isEntitled` / `isModerationSuspended` facts. Admin reads them
  through one call, `get_admin_salon_visibility` — never a raw flag.
- **Suspend** requires a reason, recorded for audit
  (`salon_moderation_suspensions.reason` + `suspended_by_user_id`). The salon
  drops off every public surface until released; existing bookings are
  unaffected.
- **Release restores the derived state — it does not publish.** After a
  release the salon returns to whatever the other three facts say; a salon
  that is owner-hidden, unready, or unentitled stays hidden.
- This replaces the old "admin override, last writer wins" model *and* the
  deferred `admin_hidden` hard-lock idea: suspension **is** the hard lock, and
  no owner action can override it.

## Going live (visibility gate)

**Superseded by `RDY-1`.** The gate is now **entitlement + readiness**, not an
active contract. A salon goes live when the owner publishes it, Publication
Readiness has no blockers, and a `trialing`/`active` entitlement exists. Both a
trial and a paid subscription therefore satisfy the gate, so the trial no longer
has to be layered on top of a contract check.

- A newly self-registered salon is **registered but hidden** until it finishes
  setup and holds an entitlement. Readiness blockers each carry a `destination`
  (`salon-profile`, `services`, `working-hours`, `specialists`, `activation`) so
  the business app can route the owner to the exact thing to fix.
- The gate is enforced **server-side in `public.salon_visibility`**, which every
  public query and RLS policy consults. There is no client-writable flag to
  bypass, which is what the original "don't put the gate in `is_public` alone"
  concern was reaching for.
- **Contracts still gate billing, not visibility.** `resolve_active_salon_contract`
  remains the switch for whether a completed booking accrues a commission fee —
  see "Client status ↔ billing". A salon can be publicly visible on a trial with
  no active contract; it simply generates no fees.
- **Development Access** (`grant_salon_development_access` /
  `revoke_salon_development_access`) is the test-only, **per-salon** entitlement
  source. There is deliberately no global "billing disabled" or "all salons
  active" switch anywhere in the schema.
- **Relationship to client status:** `client_status` stays commercial/CRM and is
  hand-set; it is **not** an input to visibility. The earlier idea of deriving
  `new → active` from contract state is unrelated to the visibility gate now.
- **Cross-repo:** the derivation, the owner-facing publication RPCs, and the
  in-app readiness messaging live in the **Pieraksts** / **pieraksts-backend**
  repos. Admin only consumes `get_admin_salon_visibility` and the two moderation
  RPCs.

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

**MVP (build against real data):** salon list (all salons, status, derived
visibility), overview (4 cards + recent invoices + salons), salon detail,
client-status dropdown, derived-visibility display + moderation
suspend/release, legal-profile edit, contract draft+versioning+PDF, contract
activate/terminate with confirms, signed-PDF upload/download, monthly invoice
generate (preview, VAT, numbering) + breakdown + PDF + sent/paid.

**Later:** auth (separate phase — its own doc), "this month" booking stats on
detail, contract events timeline, salon notes (`salon_admin_profiles.notes`),
list search/filter, active-bookers analytics, surfacing the per-salon
`readiness_blockers` list in Admin (the RPC already returns it; the UI only
shows the summary state).

The old "hard-lock visibility (`admin_hidden`)" item is **dropped** — `RDY-1`
delivered it as Moderation Suspension.

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
