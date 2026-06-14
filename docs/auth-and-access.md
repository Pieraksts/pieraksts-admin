# Auth & Access — Separate Phase (must land before any deploy)

This is a standalone phase. The admin app can be built and run **locally** with
real Supabase data **before** this phase exists. What this phase gates is
**public/shared deployment** — not local development, and not wiring real data.

See also: access notes in [PLAN.md](../PLAN.md) and the RLS posture in the
migration `Pieraksts/supabase/migrations/20260614120000_contract_billing_admin_foundation.sql`.

## Why this is mandatory before deploy

The billing tables (`salon_admin_profiles`, `salon_legal_profiles`,
`salon_contracts`, `salon_contract_files`, `salon_contract_events`,
`booking_fees`, `salon_invoices`, `salon_invoice_lines`) have **RLS enabled with
no anon/authenticated policies**. Only `service_role` can read them. The admin
app therefore queries them **server-side with the service key**.

Consequence: the instant this is deployed without a login, **anyone with the URL
sees every salon's commission data**, because the server renders it
unconditionally. Locally this is fine; on a public URL it is a data leak.

## The role trap

`public.profiles.roles` only contains:

- `client` — a booking customer (end user).
- `owner` — a **salon** owner.

There is **no "Pieraksts staff" role**. Therefore auth must **not** gate on
"is authenticated" or "has role `owner`" — that would let any salon owner into
the back office. Access requires an **explicit allowlist of Pieraksts internal
people**, independent of the existing role system.

## Roles this phase introduces (Pieraksts-internal)

A separate internal-role concept, distinct from `profiles.roles`:

- `superadmin` — full access: salons, statuses, contracts, invoices, config.
- `admin` (optional later) — operational access without destructive/config
  actions (e.g. cannot change the supplier/VAT config or delete records).
- `salon_owner_scoped` (future, explicitly out of scope now) — a *salon* owner
  granted read-only access to **their own** commercial/billing data only. This
  needs its own permission model and per-salon row scoping; do not fold it into
  the internal allowlist.

Recommended storage: a small `admin_users` table (`user_id → internal_role`),
or, as a minimal first cut, an env allowlist of emails mapped to `superadmin`.

## Target implementation

1. **Supabase Auth** for sign-in (email/OTP or password).
2. **Middleware gate**: resolve the session, look up the internal role from the
   allowlist/`admin_users`. No internal role → 403, regardless of `profiles`.
3. **Server-only service-role usage stays as-is.** Auth decides *whether* a
   request reaches the server data layer; the service key is still never shipped
   to the client.
4. **Replace the placeholder "Owner" chip** in the topbar with the real signed-in
   user + sign-out.
5. **Audit attribution**: once there are real users, write `created_by` on
   `salon_contract_events` (currently nullable) so contract/invoice actions are
   attributable.

## Interim stopgap (optional, only if a staging URL is needed sooner)

Edge **Basic Auth** with a single shared password in an env var. Crude, no
per-user identity, but keeps commission data off the open internet until real
auth lands. Not a substitute for the role-based model above.

## Acceptance criteria for this phase

- [ ] No billing data is reachable without an authenticated, allowlisted user.
- [ ] Salon owners (`profiles.roles = owner`) cannot access the back office.
- [ ] Internal roles enforced (`superadmin` at minimum).
- [ ] Topbar shows the real user and a working sign-out.
- [ ] Contract/invoice actions record `created_by`.
- [ ] Service-role key is never exposed to the browser.
