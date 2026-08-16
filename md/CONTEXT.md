# Restaurant Management SaaS — Context (Merged)

> This file merges MASTER_PROMPT.md, PROJECT_BRIEF.md, DATABASE_BRIEF.md, and SKILL.md
> into a single source of truth. Read this before doing any work.
> Last reconciled against actual codebase state: 2026-08-16.

---

## 1. Role & Process

Act as: Principal Software Architect, Senior Full Stack Engineer, Database Architect, SaaS Engineer, Security Engineer.

Do not act as a tutorial generator or beginner mentor. Think like a senior engineer working on a real commercial product.

**Before writing code, always:**
1. **Analyze** — requirements, existing implementation, affected modules, dependencies.
2. **Design** — architecture, data flow, security implications, realtime implications, scalability.
3. **Validate** — consistency with project architecture, database architecture, existing patterns.
4. **Implement** — only after the above. Keep it tight for straightforward fixes/bugs — don't over-process simple work.

**Response format for feature requests:**
Analyze existing implementation → identify affected files → explain architecture → explain DB changes (if any) → explain realtime implications (if any) → implement.

**Existing codebase rules:**
- Reuse existing types, services, hooks, utilities, patterns, abstractions.
- Do not introduce competing architectures or duplicate systems.
- Do not rewrite working code unless necessary. Prefer evolution over replacement.

**Zakir's standing preferences (strict, apply always):**
- Keep explanations brief, plain language. No over-explaining, no long paragraphs.
- Code edits as Before/After find-and-replace blocks, ready to paste, always specify which file.
- Ask for all needed files at once, in one block, raw PowerShell/commands only — no comments, nothing decorative.
- Run `npx tsc --noEmit` after every code change — hard blocker before proceeding.
- PowerShell only, Windows, VS Code integrated terminal.
- When something breaks, ask for exact file/command output rather than guessing blindly.

---

## 2. Product Overview

Production-grade Restaurant Management SaaS, sold to multiple restaurants as a subscription product. Central operational platform supporting realtime collaboration between staff.

Not a demo, tutorial, or portfolio project. Every decision prioritizes: scalability, maintainability, reliability, performance, security, production readiness.

### Business Model & Tenancy

Deployed **per-tenant**: each restaurant gets its own dedicated server and its own dedicated database. No shared infrastructure between restaurants. Physical isolation is the tenant-separation mechanism, not row-level filtering.

`tenant_id` still exists on every major entity and must still be used consistently in every query, for:
- Multi-brand/multi-entity restaurant groups that may eventually share infrastructure.
- Portability if the deployment model ever changes.
- Reporting/export tooling that expects `tenant_id` to be present.

Since only one tenant's data exists per database, the security priority is **role separation within that one restaurant** (e.g. a RIDER must never read staff salary data or tenant settings), not cross-tenant isolation.

### Roles

**Super Admin** — manage staff, riders, attendance, menu, tables, orders, settings; view dashboard analytics (all branches or one); access reports, audit logs, POS.

**Staff** — access POS, create orders, manage tables, assign riders, view/update orders, print receipts/kitchen tickets, mark menu item availability. Cannot manage staff, access settings, access audit logs.

**Rider** — view assigned deliveries and details, update delivery status, mark delivered/cancelled, view delivery history. Cannot access POS, menu management, or settings.

### Core Modules & Status

| Module | Status |
|---|---|
| Marketing Website | ✅ Built |
| Online Ordering | ✅ Built |
| Dashboard (analytics & reporting) | ✅ Built |
| POS | ✅ Built |
| Orders | ✅ Built |
| Tables | ✅ Built |
| Menu Management | ✅ Built |
| Receipt Printing UI | ✅ Built |
| Staff Management UI | ✅ Built |
| Rider Management UI | ✅ Built |
| Attendance | ✅ Built |
| Notifications (branch-scoped, 10 types, realtime) | ✅ Built |
| Reports | ✅ Built (page exists) |
| Settings | ✅ Built |
| Audit Logs | ✅ Built |

### Real-Time Requirements

When one user updates **Orders, Tables, Riders, Menu Availability, Attendance, or Notifications**, all connected users of the same tenant/branch must receive updates immediately.

> Corrected: original brief omitted **Notifications** — added this session via `broadcastChange(branchId, "notifications")`, part of the `RealtimeResource` union in `src/lib/realtime/channels.ts`.

Channels are scoped to the restaurant's tenant/branch (kept for consistency and forward compatibility, even in a single-tenant-per-database model).

### Offline Requirements

POS must operate without internet. Offline-created orders synchronize automatically once connectivity returns.

**Current state (confirmed):**
- `offlineOrderQueue.ts` — built and tested. Handles offline order creation and sync-on-reconnect.
- IndexedDB-backed TanStack Query persister (`src/app/providers.tsx`) — deliberately scoped to **menu categories/items only** (stable reference data). Does NOT persist tables/riders/orders/customers — that data changes in real time, and serving a stale cached copy while offline is considered more dangerous than showing nothing (e.g. a table could appear free when another terminal just seated it).
- Design is offline-first for POS specifically, not for the whole app.

---

## 3. Database

**Stack:** PostgreSQL, Drizzle ORM, Supabase (Auth + Realtime + Storage).

### Database Philosophy

Each tenant gets its own dedicated database — no shared database between restaurants. `tenant_id` is retained on every major entity for the reasons listed in §2, even though cross-tenant leakage isn't the threat model in a single-tenant DB.

### Current Live Schema (29 tables, confirmed via `drizzle-kit generate`, 2026-08-16)

> Corrected: original brief listed only ~9 entities (`tenants`, `users`, `attendance`, `menu_categories`, `menu_items`, `tables`, `orders`, `order_items`, `audit_logs`). Actual schema is substantially larger:

```
attendance, audit_logs, branch_settings, branch_delivery_areas, branches,
deliveries, tenants, staff, menu_categories, menu_item_variants, menu_items,
modifier_groups, modifier_options, restaurant_tables, table_sections,
table_reservations, coupon_branch_allocations, coupons, order_counters,
order_discounts, order_items, orders, payments, tenant_settings,
reservation_counters, push_subscriptions, notification_reads,
notifications, notification_clears
```

Note: `users` role is implemented as **`staff`** table — `staff.id` deliberately equals `auth.users.id` (1:1). Supabase Auth handles authentication ("who are you"); the `staff` table handles authorization ("what can you do") — tenant, branch, role. Staff also have a 4-digit POS PIN for fast in-store auth, separate from their Supabase password.

### Core Entity Notes (original, still accurate unless noted)

**tables (`restaurant_tables`)** — statuses: `available`, `occupied`, `reserved`, `out_of_service`.
- Automatic status changes (order placed/completed/cancelled against a table) are covered by the order audit trail — no separate log needed.
- Manual changes (create/edit/delete a table, manual status override) are direct mutations and **must** be logged via `logAudit` with resource `table`.

**orders** — types: `dine_in`, `takeaway`, `delivery`. Statuses: `pending`, `confirmed`, `preparing`, `ready`, `out_for_delivery`, `completed`, `cancelled`.

**audit_logs** — stores actor, `actor_name` (denormalized snapshot), resource, resource_id, action, old_value, new_value, description, timestamp.

**notifications system** (added this session) — `notifications`, `notification_reads` (per-staff read tracking), `notification_clears` (per-staff "clear point"; actual DB deletion only happens once every active staff member in the branch has cleared past a shared timestamp). Branch-scoped, visible to all staff+admin in that branch. 10 notification types covering order/reservation lifecycle, attendance, delivery status, staff/rider creation, and audit overrides.

### Migration Tooling

Drizzle migrations live in `src/db/migrations/`, tracked via `src/db/migrations/meta/_journal.json` and the `drizzle.__drizzle_migrations` bookkeeping table.

> **Resolved 2026-08-16:** the bookkeeping table was previously out of sync with the actual schema (only 1 of 18 migrations was recorded, due to the Tokyo→Mumbai migration restoring schema via raw `pg_dump`/`psql` rather than `drizzle-kit migrate`). Ledger has been reconciled — all 19 migrations (0000–0018) are now correctly recorded with matching hashes/timestamps. `npm run db:generate` confirms "No schema changes, nothing to migrate."
>
> **Going forward:** always run `npm run db:generate` after schema changes and confirm it reflects only the intended diff before running `db:migrate`. If a table is ever created manually via raw SQL again, its migration must be registered in the ledger the same way (hash + timestamp insert) to keep tooling reliable.

### Security & Access Model

**Supabase client architecture (confirmed 2026-08-16):**
- `getSupabaseServerClient()` / `getSupabaseBrowserClient()` — use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Scoped, RLS-respecting, tied to the calling user's session. Used in the large majority of server actions and all client-side realtime subscriptions.
- `supabaseAdmin` (`src/lib/supabase/admin.ts`) — uses `SUPABASE_SECRET_KEY`. This is the elevated, RLS-bypassing client. Used deliberately and narrowly for: inviting/updating/deleting Supabase auth users (`staff/actions.ts`, `admins/actions.ts`), storage uploads (`uploads/actions.ts`), and realtime broadcast (`lib/realtime/broadcast.ts`).

> **Important:** RLS protection only applies to the scoped-client code paths. Every `supabaseAdmin` call site must have its own explicit application-level role check *before* reaching the admin call (e.g. confirm caller is `super_admin` before inviting a new staff member) — RLS will not catch a bug in these specific paths since the admin key bypasses it by design. This has not been independently audited call-by-call; worth a dedicated pass before production launch.

> **RLS status — CONFIRMED INERT, decision made 2026-08-16:** All real app data access goes through Drizzle ORM directly via `DATABASE_URL` (`db.query.staff.findFirst`, etc. — confirmed across `admins/actions.ts`, dashboard pages, etc.), not through Supabase's PostgREST layer. RLS policies are only enforced on the PostgREST path, so **RLS currently provides zero protection** — authorization is enforced entirely by application-code role checks (e.g. `currentStaffRow` lookups before privileged actions).
>
> **Decision:** ship v1 on app-code-only enforcement. Implement real RLS (switch Drizzle to a scoped non-bypass Postgres role + write per-table policies + retest every action) as dedicated v2 work, not squeezed into v1. Until then, every new action must include its own explicit role check — there is no DB-level safety net.

**Security requirements (from original brief, still binding):**
- RBAC enforced in application code.
- Server-side validation on every write.
- RLS scoped to role-based permission boundaries within a single restaurant's database.
- Never trust client-side data.

### Realtime

Supabase Realtime. Entities: Orders, Tables, Attendance, Riders, Menu Availability, **Notifications**. Channels scoped to tenant/branch.

### Storage

> **Note (2026-08-16):** Tokyo project (previous DB region, now migrated to Mumbai/`ap-south-1`) has been fully deleted. 7 image references (4 menu items, 3 staff) that pointed to Tokyo's storage bucket were nulled out prior to deletion — those records currently show placeholder UI (all image render sites in the codebase are confirmed null-safe, ternary-gated on `image ?`). Images need to be re-uploaded via the UI when convenient; not urgent.

### Performance

Use indexes, foreign keys, constraints, transactions. Optimize for order queries, dashboard queries, realtime updates.

---

## 4. Engineering Standards

### TypeScript
Strict typing, no `any`, reusable interfaces/types, type-safe APIs.

### Frontend
Next.js, TypeScript, Tailwind, shadcn/ui. Prioritize responsiveness, accessibility, UX quality, performance.

### Backend
PostgreSQL, Drizzle ORM, Supabase Auth, Supabase Realtime. Prioritize security, scalability, tenant isolation, validation.

### Code Quality
Generate modular, strongly-typed, maintainable, scalable, production-grade code. Avoid tutorial code, duplicated logic, giant files, weak typing, unnecessary abstractions. Never generate demo-quality code.

### Database
Always think about relationships, indexes, constraints, query efficiency, future growth. Design schemas before implementation.

### Security
Always implement validation, authorization, protected routes, RLS, tenant isolation. Never trust client input.

### Realtime
When data changes: update all connected users, scope events to tenant/branch, avoid unnecessary subscriptions.

---

## 5. Standing Open Items

> Carry forward in every session summary until resolved.

🔒 **GitHub Actions secrets (`APP_URL`, `CRON_SECRET`) — blocked on deployment.**
Cannot be added because the app hasn't been deployed to Vercel yet (local dev only). Not a bug — just blocked. **Once Zakir mentions a live URL/deployment, immediately flag this as unblocked and walk him through adding the secrets.**

⚠️ **`supabaseAdmin` call-site audit — not yet done.**
Confirm every use of the RLS-bypassing admin client has a preceding application-level role check. Listed call sites as of 2026-08-16: `admins/actions.ts`, `staff/actions.ts`, `uploads/actions.ts`, `lib/realtime/broadcast.ts`.

🔴 **RLS not implemented — deferred to v2 by decision.**
Confirmed RLS is currently inert (all real queries go through Drizzle direct-to-Postgres, bypassing PostgREST/RLS entirely). v1 ships on app-code-only role enforcement. v2 scope: switch Drizzle connection to a scoped non-bypass role, write per-table RLS policies, retest every action. Until v2, every new feature MUST include explicit role checks in code — there is no DB-level backstop.

✅ **App-code authorization audit — completed 2026-08-16, no gaps found.**
Every exported function across all 22 `actions.ts`/`pushActions.ts` files was checked for a real auth signal (`getCurrentStaff`, `hasPermission`, `getAuthorizedActor`, local `requirePageAccess`/`requireCrudAccess` guards, or inline `.role ===` checks). Result: every sensitive write/read is gated, either directly or via delegation (e.g. report exports call an already-gated report-data action). The only ungated functions are correctly public by design: `loginAction`/`logoutAction`/`forgotPasswordAction` (pre-authentication), all `online-ordering` public actions (customer-facing storefront, scoped by `tenantId` + own validation), and `createNotification` (internal fire-and-forget helper, never client-callable directly). This is the real reason v1 can ship safely without RLS — the app-code layer is currently sound. Re-run this audit after any batch of new actions is added, since it's what's substituting for a DB-level backstop until v2.

✅ **Rate limiting — implemented and verified 2026-08-16.**
Added `src/lib/rate-limit.ts` (Upstash Redis + `@upstash/ratelimit`, serverless-compatible — chosen specifically because deploy target, Vercel vs DigitalOcean, wasn't decided yet, ruling out in-memory limiting). Covers the 4 unauthenticated/public-facing entry points: `loginAction` (5/60s, keyed by email), `forgotPasswordAction` (3/hour, keyed by email), `createPublicOrderAction` (10/10min, keyed by IP), and the `/api/cron/check-notifications` route (20/min, backstop behind `CRON_SECRET`). Live-tested via Upstash Data Browser counters + real UI lockouts on login and forgot-password. Everything else sits behind login already, so this covers the actual exposed attack surface for v1 — broader per-action rate limiting (e.g. against a compromised staff account) is a reasonable v1.x/v2 addition, not a launch blocker.

✅ **Sentry error tracking + monitoring — implemented and verified 2026-08-16.**
Full Next.js SDK setup via wizard: browser-through-server tunneling (avoids ad blockers), performance tracing, log forwarding, source maps via CI. Session Replay deliberately left OFF (real customer PII on screen — POS/order data; revisit only after reviewing Sentry's masking controls properly). Verified live with real captured frontend + backend test errors, then test page removed. `SENTRY_AUTH_TOKEN` added locally; still needs adding as a GitHub Actions secret once deployed (bundle with `APP_URL`/`CRON_SECRET` — see GitHub Actions item above).

🔐 **Secrets exposed in chat during setup — rotate before/at launch.**
`CRON_SECRET` and the Sentry `SENTRY_AUTH_TOKEN` were both pasted in plaintext during this session's terminal output. Neither caused actual harm (chat isn't public), but rotate both as a clean-hygiene step before going live. Also confirmed and fixed this session: `full_dump.sql`/`schema.sql` (real migrated customer/staff data) were sitting untracked in the repo root, now moved outside the repo entirely and `*.sql` added to `.gitignore` permanently.

📌 **Massive commit backlog — resolved 2026-08-16.**
Discovered the entire project (hundreds of files, going back through most of V1's features) had never been committed to git — a real data-loss risk with zero backup. Fixed: cleaned `.gitignore` (added `*.sql`, `supabase/.temp/`), committed and pushed everything in two clean commits. Going forward, commit regularly — don't let this backlog rebuild.

---

## 7. Product Roadmap — V1 vs Future

> Full detailed roadmap doc provided by Zakir, condensed here to what matters for prioritization. Core principle across all versions: security → reliability → performance → UX → real customer demand → business value, never feature count for its own sake. POS staff must never be burdened with admin-level work (inventory, purchasing, recipes, analytics) during service.

**V1 — current, in progress, must ship first.** Restaurant website, multi-branch, reservations, full RBAC (Super Admin/Admin/Staff/Rider), dashboard analytics, POS (dine-in/takeaway/delivery, offline-first with IndexedDB queue + duplicate protection), coupons, orders, attendance, staff management, audit logs, menu + table management, realtime, notifications, reports/printing, subscription blocking, security (RLS deferred, see §5), backups, **deployment/control plane** (see below).

**Deployment/Control Plane — Zakir's own internal tool, build after V1 ships, likely alongside V2 start.** Not customer-facing. A central dashboard for Zakir to manage the whole DB-per-tenant fleet: list of every restaurant deployment, their DB/connection details, version/health status, and (per this session's plan) **surfacing Sentry errors from every deployment in one place** rather than checking each project separately in Sentry's own UI. This becomes the actual "run the business" tool once there are multiple restaurants live.

**V2 — Inventory & Business Management.** Full ingredient/stock system (units, conversions, min/max levels, alerts), stock receiving workflow, stock adjustments (wastage/damage/theft, fully audited), multi-branch stock transfers, **recipe/BOM management** (menu item sold → ingredients auto-deducted, staff never touches inventory manually), food costing (margin, cost %, profitability reports), supplier/purchasing + auto-reorder suggestions, wastage tracking, expense tracking, profitability reporting (revenue − COGS − expenses). Also: CRM (customer profiles, segmentation, loyalty points/tiers, feedback/ratings, marketing campaigns with opt-in/out).

**V2/V3 — Payments.** Abstract provider-adapter architecture (never one hardcoded provider) — cash, card, wallets, QR, payment links, per-country provider selection. Payment status lifecycle (pending/authorized/paid/failed/refunded), webhook-driven (never trust frontend confirmation alone), refunds with permission control, reconciliation (POS vs provider vs cash), cash drawer/shift tracking, configurable multi-jurisdiction tax engine.

**Internationalization — layered architecture, activated per-country, not built all at once.** i18n via translation keys (incl. RTL support for Arabic/Urdu), multi-currency, per-branch timezone (never assume server timezone), localized date/number/address/phone formats, country-configuration layer (language + currency + tax + payment providers bundled per country), localized receipts/invoices. Rollout order: Pakistan (prove product) → Australia (initial focus + case studies) → then France/Spain/Germany etc. Never claim compliance without verifying current local tax/legal requirements first.

**V3 — Advanced Analytics & Intelligence.** Forecasting (demand/staffing/busy-periods — always shown with confidence/uncertainty, never as guarantees), smart inventory (predictive reorder), menu intelligence (popularity × profitability quadrant analysis), staff analytics (privacy-conscious). Advanced operations: KDS, delivery zone/driver optimization, waitlists/table optimization, QR/table ordering with split bills, advanced reservation rules (deposits, no-show tracking). Expanded online ordering (scheduled orders, customer accounts, order tracking). Third-party integrations via adapter pattern (accounting, delivery platforms, WhatsApp/SMS, hardware) — never hardcoded per-provider into core.

**Business strategy notes (non-technical, for reference):** founding-customer discount strategy (reduced entry, free months, migration bundled) for early adopters only, not permanent pricing. Migration/switching program scoped to what old systems can actually export — never promise universal migration. Case studies must use only real measured metrics. Feedback triage: Critical (security/data-loss) → High (multi-restaurant requested) → Medium → Low → Reject/defer (doesn't fit direction).

📷 **Menu/staff images not re-uploaded.**
4 menu item images + 3 staff images need re-upload via UI after Tokyo deletion (see §3 Storage note). Not urgent, placeholders render correctly in the meantime.

---

## 6. Recently Completed (this session, 2026-08-16)

- Fixed cron endpoint auth bug (was a copy-paste placeholder issue, not a real bug).
- Reverted `STUCK_ORDER_MINUTES` / `RESERVATION_UPCOMING_MINUTES` test values back to 15/30.
- Reconciled Drizzle migration ledger (`__drizzle_migrations`) with actual schema — all 19 migrations now correctly recorded.
- Confirmed Tokyo project fully deleted; nulled 7 dangling image URLs beforehand.
- Replaced all 18 `alert()` calls across 5 files with a shared `AlertModalProvider` (`useAlertModal()` hook, shadcn `AlertDialog`-based modal), per Zakir's preference for blocking modal dialogs over toasts.
- Merged `MASTER_PROMPT.md`, `PROJECT_BRIEF.md`, `DATABASE_BRIEF.md`, `SKILL.md` into this single `CONTEXT.md`, correcting stale schema/realtime/security documentation in the process.