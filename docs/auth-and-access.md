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

## Implementation plan (build order)

Concrete wiring for this Next 16 App Router app. Each step is small; the order
matters because later steps depend on earlier ones.

**Two Supabase clients, two jobs** (keep them separate):

- **SSR auth client** — new. `@supabase/ssr`, **anon key**, cookie-based. Answers
  *"who is this user?"* (the session). Used by middleware, the login flow, and
  `requireSuperadmin()`.
- **Service-role client** — existing (`src/lib/supabase/server.ts`,
  `getSupabaseAdmin()`), server-only. Answers *"is this user allowed?"* (the
  `admin_users` lookup) and runs the privileged billing queries. **Never shipped
  to the browser.**

**Steps:**

1. **`admin_users` table** — new migration in the `Pieraksts` repo, RLS-locked to
   `service_role` exactly like the billing tables (include rollback SQL):

   ```sql
   create table public.admin_users (
     user_id uuid primary key references auth.users(id) on delete cascade,
     internal_role text not null
       check (internal_role in ('superadmin', 'admin')),
     created_at timestamptz not null default now()
   );
   alter table public.admin_users enable row level security;
   revoke all on public.admin_users from anon, authenticated;
   grant all on public.admin_users to service_role;
   ```

2. **SSR auth client** — `npm i @supabase/ssr --legacy-peer-deps`. Add a
   cookie-based server client (for server components / route handlers / actions)
   and a browser client (for the login form). Leave `getSupabaseAdmin()` as-is.

3. **`requireSuperadmin()`** — server-only helper (e.g.
   `src/lib/auth/require-superadmin.ts`). This is the **authoritative wall**:
   1. resolve the user via the SSR client; no session → `redirect("/login")`.
   2. look up `admin_users` by `user.id` via the **service-role** client (the
      table is RLS-locked); no row → 403.
   3. return `{ userId, email, role }`.
   Call it at the **top of every data accessor** in `src/lib/data/salons.ts`
   **and every server action** in `src/lib/actions/salons.ts`. This closes the
   "server renders billing data unconditionally" leak regardless of route.

4. **Middleware** (`src/middleware.ts`) — refresh the Supabase session cookie on
   each request and redirect requests with **no session** to `/login`. This is a
   UX convenience only; it is **not** the authz wall (that's step 3, per Next's
   data-security guidance — never trust middleware alone for authorization).

5. **`/login` route** — Supabase Auth sign-in (email+password or magic-link/OTP —
   see "Open choice" below). On success → redirect to `/`.

6. **`/403` (no-access) page** — for users who authenticate but have no
   `admin_users` row (e.g. a salon owner who signed in).

7. **Topbar** — replace the placeholder "Owner" chip with the real signed-in user
   (email) + a **sign-out** action (`supabase.auth.signOut()`, clear cookies,
   redirect `/login`).

8. **Audit attribution** — thread the resolved `userId` from `requireSuperadmin()`
   into the contract/invoice actions and write it to `salon_contract_events.created_by`
   (currently nullable).

9. **Retire the interim Basic Auth stopgap** (below) once this is in.

**Request flow once built:**

```
request → middleware (refresh session; no session → /login)
        → requireSuperadmin()
             1. SSR client: who is this user?      (no user → /login)
             2. service-role: row in admin_users?  (none → 403)
        → only then: service-role billing queries / actions
```

**Open choice (decide at build time):** sign-in method — email+password (you
manage credentials) vs magic-link/OTP (no passwords, needs Supabase email
delivery configured). Lean OTP for a tiny internal team; either is easy.

**Build notes (resolved):**

- **Sign-in method:** email+password, via a server action
  (`src/lib/actions/auth.ts → signIn`) using the SSR cookie client. Chosen
  because it matches the provisioning flow below (Dashboard *Add user* sets an
  email+password), needs no Supabase email-delivery setup, and keeps the anon
  key server-side (no `NEXT_PUBLIC_*` browser client). Switching to OTP later is
  a localized change to that action + the login form.
- **Middleware is `src/proxy.ts`:** Next 16 renamed the `middleware` file
  convention to `proxy` (same feature, now Node.js runtime by default). The
  function is exported as `proxy`; session-refresh logic lives in
  `src/lib/supabase/proxy-session.ts`.
- **No Basic Auth stopgap exists** in this repo, so step 9 (retire it) is a
  no-op — the real gate landed directly.

## Provisioning superadmins

Authentication ≠ authorization: a superadmin needs **both** a Supabase account
**and** an `admin_users` row. An account without the row can sign in but gets 403.
The superadmin marking lives in `admin_users` — **never** in `profiles.roles`
(see "The role trap").

Per superadmin, once the phase above is built:

1. **Create the account** — Supabase Dashboard → Authentication → Users → *Add
   user* (email + password), or invite. Prefer **dedicated internal emails**
   (e.g. `you@pieraksts.lv`), not a personal client/owner account.
2. **Copy the user UID** from the dashboard.
3. **Promote** — one insert in the SQL editor:
   ```sql
   insert into public.admin_users (user_id, internal_role)
   values ('<their-auth-uid>', 'superadmin');
   ```
4. They sign in at `/login`; `requireSuperadmin()` finds the row → access granted.

- **Bootstrap:** the *first* superadmin is added by manual SQL (no UI yet) — same
  dashboard workflow used elsewhere in this project. The `admin` (limited) role is
  set the same way (`internal_role = 'admin'`), gated per-action on `superadmin`
  for config/destructive operations.
- **Optional later:** a superadmin-only "Team" screen in the panel to manage
  `admin_users` without touching SQL.
- **Simpler alternative** for a fixed pair that never changes: skip the table and
  use an env allowlist (`ADMIN_SUPERADMINS=a@x.lv,b@x.lv`) checked in
  `requireSuperadmin()`. No SQL, but changing the set needs a redeploy and it
  can't express the `admin` role or audit attribution — prefer the table.

## Interim stopgap (optional, only if a staging URL is needed sooner)

Edge **Basic Auth** with a single shared password in an env var. Crude, no
per-user identity, but keeps commission data off the open internet until real
auth lands. Not a substitute for the role-based model above.

## Acceptance criteria for this phase

- [x] No billing data is reachable without an authenticated, allowlisted user.
      (`requireSuperadmin()` at the top of every accessor in `data/salons.ts`
      and every action in `actions/salons.ts`.)
- [x] Salon owners (`profiles.roles = owner`) cannot access the back office.
      (Authorization gates on `admin_users`, not `profiles.roles`; an
      authenticated non-allowlisted user is redirected to `/403`.)
- [x] Internal roles enforced (`superadmin` at minimum). (`admin` rows are
      accepted by the table but currently still redirected to `/403` until a
      limited role is wired up.)
- [x] Topbar shows the real user and a working sign-out.
- [x] Contract/invoice actions record `created_by` where the schema supports it:
      contract create/activate/terminate write `salon_contract_events.created_by`.
      Invoice actions (`actions/invoices.ts`) are all gated by
      `requireSuperadmin()`, but `salon_invoices` has no `created_by` column, so
      there is no per-invoice attribution to write.
- [x] Service-role key is never exposed to the browser (`server-only` on
      `supabase/server.ts`; SSR client uses the public anon key only).

> Verified locally for the unauthenticated path (proxy redirect → `/login`,
> login renders, `/403` reachable, bad-credentials rejected). The authorized
> path requires the `admin_users` migration applied and a provisioned account
> (steps below) — do that before deploy to confirm end-to-end.
