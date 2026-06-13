# Pieraksts Admin Plan

## Purpose

Pieraksts Admin is an internal back office for managing salon client contracts,
commission billing, contract files, and monthly invoices. It is separate from
the Expo app and the public presentation website.

Commission data must not be exposed in the client booking app. Pieraksts owners
need full access in this admin panel. Salon owners may later receive a limited
billing/admin surface, but that should be explicitly designed and permissioned.

## Progress Tracker

- [x] Create separate `pieraksts-admin` Next.js project.
- [x] Add Tailwind, TypeScript, and shadcn/ui foundation.
- [x] Add initial admin shell placeholder.
- [x] Write product/database plan.
- [x] Draft contract and billing Supabase migration.
- [x] Add rollback SQL for the contract and billing migration.
- [x] Apply contract and billing migration in Supabase SQL Editor.
- [x] Verify core billing tables exist:
  - `salon_contracts`
  - `booking_fees`
  - `salon_invoices`
  - `salon_invoice_lines`
- [x] Verify booking billing snapshot columns exist:
  - `bookings.booking_price_amount`
  - `bookings.service_name_snapshot`
- [x] Verify booking billing triggers exist:
  - `booking_service_terms_snapshot`
  - `booking_fee_after_completion`
- [ ] Connect `pieraksts-admin` to Supabase from server-only code.
- [ ] Build read-only salon list from real Supabase data.
- [ ] Build read-only salon detail page.
- [ ] Add legal profile editing.
- [ ] Add contract create/edit/versioning.
- [ ] Add booking fee list.
- [ ] Add monthly invoice generation.
- [ ] Add invoice PDF generation/download flow.
- [ ] Add admin authentication and authorization hardening.

Current next step: connect `pieraksts-admin` to Supabase server-side and build
the read-only `/admin/salons` page.

## Initial Product Flow

1. Admin opens a list of all salon clients.
2. Admin clicks a salon to view details.
3. Admin edits legal profile details and commercial terms.
4. Admin creates a new contract version when commission rate or active dates
   change.
5. Admin generates a contract PDF from the active contract data.
6. Admin uploads or stores signed contract PDFs.
7. Admin sees completed bookings that produced booking fees.
8. Admin generates invoices by salon and month.
9. Admin tracks invoice status and downloads invoice PDFs.

## Core Pages

- `/admin/salons`
  - Salon client list.
  - Status, current contract rate, active dates, uninvoiced amount, latest
    invoice status.
- `/admin/salons/[salonId]`
  - Salon details.
  - Legal profile form.
  - Contract version history.
  - Generate contract action.
  - Booking fee list.
  - Invoice list.
- `/admin/invoices`
  - Cross-salon invoice tracking.
  - Filter by month, status, salon.
- `/admin/contracts`
  - Optional later view for expiring, pending, and unsigned contracts.

## Database Foundation

Add the billing domain to the existing Supabase project before building real UI.

Initial migration:

- `Pieraksts/supabase/migrations/20260614120000_contract_billing_admin_foundation.sql`

### Admin Profile

`salon_admin_profiles`

- `salon_id`
- `client_status`: `lead`, `negotiating`, `active`, `paused`, `terminated`
- `notes`
- `created_at`
- `updated_at`

This status is separate from `salons.is_public`. Public marketplace visibility
and Pieraksts commercial status are different concepts.

### Legal Profile

`salon_legal_profiles`

- `salon_id`
- `company_name`
- `registration_number`
- `vat_number`
- `legal_address`
- `contact_person`
- `billing_email`
- `billing_phone`
- `created_at`
- `updated_at`

### Contracts

`salon_contracts`

- `id`
- `salon_id`
- `version`
- `commission_rate_bps`
- `start_date`
- `end_date`
- `status`: `draft`, `pending_signature`, `signed`, `active`, `terminated`
- `created_at`
- `updated_at`

Contracts are versioned and should not be overwritten when commercial terms
change. End the old contract and create a new version.

### Contract Files

`salon_contract_files`

- `id`
- `contract_id`
- `file_type`: `draft`, `signed`
- `storage_path`
- `created_at`

Store files in a private Supabase Storage bucket, for example
`contract-documents`.

### Contract Events

`salon_contract_events`

- `id`
- `contract_id`
- `event_type`
- `description`
- `created_by`
- `created_at`

### Booking Fees

`booking_fees`

- `id`
- `booking_id` unique
- `salon_id`
- `contract_id`
- `booking_gross_amount`
- `commission_rate_bps`
- `commission_amount`
- `invoice_id`
- `created_at`

Create a fee exactly once when a booking transitions to `completed`. Do not
recalculate old fees from the current contract.

The current mobile app has `services.price`, but bookings do not appear to store
a price snapshot. Billing must snapshot the booking amount at completion or
booking creation so service price changes cannot corrupt historical invoices.

### Invoices

`salon_invoices`

- `id`
- `salon_id`
- `period_start`
- `period_end`
- `subtotal_amount`
- `status`: `draft`, `sent`, `paid`, `overdue`, `cancelled`
- `pdf_storage_path`
- `created_at`
- `sent_at`
- `paid_at`

`salon_invoice_lines`

- `id`
- `invoice_id`
- `booking_fee_id` unique
- `booking_id`
- `booking_date`
- `service_name_snapshot`
- `booking_gross_amount`
- `commission_rate_bps`
- `commission_amount`

Invoice lines freeze what was invoiced, even if booking or service data changes
later.

## Access Control

MVP access model:

- Keep commission and invoice tables out of Expo app queries.
- Use Next.js server-only code or route handlers for admin data access.
- Use the Supabase service role only on the server.
- Use private Storage buckets for contracts and invoices.
- Return signed download URLs only after admin authorization.

Later salon-owner billing access should use a separate permission model and
show only that salon owner's own commercial data.

## Implementation Phases

- [x] Supabase migration for admin, legal, contract, booking fee, and invoice
  tables.
- [x] DB functions for active-contract lookup, fee creation on booking
  completion, and invoice generation.
- [ ] Admin authentication and authorization.
- [ ] Salon list and salon detail read-only pages.
- [ ] Legal profile and contract editing.
- [ ] Contract PDF generation and signed PDF upload.
- [ ] Booking fee list and monthly invoice generation.
- [ ] Invoice PDF generation, status tracking, and downloads.

## Non-Goals For MVP

- Electronic signatures.
- Online payment collection.
- Accounting integrations.
- Salon-owner self-service billing portal.
- Automatic invoice sending.
