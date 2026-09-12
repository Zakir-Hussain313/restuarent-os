# Rice n Spice (Zaiqa) — Context

Single source of truth for the project. Contains architecture, database schema, engineering standards, design system, coding guidelines, and roadmap. Session-by-session change logs and bug-fix narratives are intentionally excluded — that history lives in chat summaries between sessions, not here.

---

## 1. Role & Process

Act as: Principal Software Architect, Senior Full Stack Engineer, Database Architect, SaaS Engineer, Security Engineer. Not a tutorial generator.

Before writing code: Analyze → Design → Validate (consistency with existing architecture/patterns) → Implement. Keep it tight for simple fixes — don't over-process.

**Standing preferences (strict, always apply):**

- Brief, plain-language explanations. No long paragraphs. No over-explaining.
- Code edits as Before/After paste-and-diff blocks. For a single small edit, one file at a time, wait for Zakir to apply and report back before the next diff. If several edits are each small, batch 2-3 files' diffs into one response — but keep large/complex diffs to one file at a time. Full exact path on every single block. No direct file access.
- Ask for all needed files at once, raw PowerShell/commands only, no comments. When multiple Get-Content/Get-ChildItem calls are needed at once, give them as ONE combined multi-line code block, not separate messages.
- `npx tsc --noEmit` is the hard gate for correctness, but Zakir runs it on his own schedule — don't demand it after every single diff, and don't proactively ask whether it came back clean; he'll flag errors himself when they occur.
- File operations: PowerShell only (Get-Content, Get-ChildItem -Recurse -Include, Select-String) — never bash. `**` glob does NOT recurse in PowerShell. Paths with parentheses (e.g. `src\app\(dashboard)\...`) MUST be quoted in PowerShell or the command fails.
- Faster alternative for heavy file-reading sessions (e.g. a full module trace): Zakir can upload a zip of `src\` (excluding node_modules) instead of pasting files one at a time via PowerShell. Unzip into scratch space and read directly. This does NOT change the diff workflow — all code changes are still given as Before/After diffs, one file at a time, for Zakir to paste into his real repo. Still use live PowerShell commands against Zakir's real repo whenever something needs verifying.
- DB migrations: hand-written SQL run in Supabase SQL editor only — never `drizzle-kit push` (previously dropped ~50 live RLS policies). After running hand-written SQL, run `npm run db:generate` to reconcile the ledger and confirm the generated file matches exactly; do NOT run `db:migrate` for these.
- Middleware lives at `src/proxy.ts`, not `middleware.ts`.
- Always verify file paths via PowerShell before writing diffs; flag explicitly when a path/value is a guess. Never assume a file's contents or a prop signature — always ask for the file first, even if confident.
- Before declaring any file "dead code," verify with a repo-wide grep AND a check for barrel-export re-exports — only call something dead after both checks come back empty.
- Production builds: `next build --webpack` (required for Serwist/service worker). Dev: `npm run dev` (Turbopack).
- Reuse existing types/services/hooks/patterns. Don't introduce competing architectures or rewrite working code unnecessarily.
- Give changes as diffs only — never full file rewrites, even when many changes hit one file (exception: this context.md document itself, which is not code). Diffs must be exact Before/After blocks (full replaced text, copy-pasteable) — NOT unified-diff +/- notation. When an entire file is being replaced rather than patched, skip the before/after pair — just give the full replacement content and say "replace your current <filename> with this".
- Zakir wants explanations kept as simple and short as possible — this applies to every response, not just code diffs.
- When Zakir flags that a stated conclusion is wrong, don't just soften the wording — actually revisit and fix the underlying issue, and be direct about having been wrong.
- "What's done/remaining" and "deployment checklist" are different questions. §14 (Deployment Checklist) is shown only when explicitly asked for by name. General status questions ("what's remaining", "what's left") get a fresh synthesized answer from the whole doc — don't paste §14 content into those answers just because it overlaps.

- "What's done/remaining" and "deployment checklist" are different questions. §14 (Deployment Checklist) is shown only when explicitly asked for by name. General status questions ("what's remaining", "what's left") get a fresh synthesized answer from the whole doc — don't paste §14 content into those answers just because it overlaps.

---

## 2. Product Overview

Production-grade Restaurant Management SaaS, sold to multiple restaurants as a subscription product. Central operational platform for realtime staff collaboration. Not a demo/tutorial.

**Tenancy:** Deployed per-tenant — each restaurant gets its own dedicated server and dedicated database. Physical isolation, not row-level filtering. `tenant_id` still present on every entity for portability/reporting.

**Roles:**
- **Super Admin** — full access: staff, riders, attendance, menu, tables, orders, settings, all-branch analytics, reports, audit logs, POS. Exactly one per tenant (enforced at the application layer).
- **Admin** — same as Super Admin but branch-scoped.
- **Staff** — POS, orders, tables, rider assignment, receipts/kitchen tickets, menu availability. No staff management, no settings, no audit logs.
- **Rider** — assigned deliveries only, status updates, delivery history. No POS/menu/settings access.

**Core modules — all built:** Marketing website, online ordering, dashboard analytics, POS (offline-first), orders, tables, menu management, receipt printing, staff management, rider management, attendance + clock-in/out (device-approval based, not geofenced), notifications (branch-scoped, 11 types, realtime), reports, settings, audit logs, coupons, permanent staff/admin delete (with historical name-snapshot preservation), payments (manual + PayFast).

Login is always email + password — there is no 4-digit PIN login anywhere. Zakir plans to give staff a desktop `.bat` shortcut that opens the login page directly; this is not an in-app feature.

---

## 3. Database

**Stack:** PostgreSQL, Drizzle ORM, Supabase (Auth + Realtime + Storage). One dedicated DB per tenant.

**32 live tables:** attendance, audit_logs, branch_settings, branch_delivery_areas, branches, branch_devices, deliveries, tenants, staff, menu_categories, menu_item_variants, menu_items, modifier_groups, modifier_options, restaurant_tables, table_sections, table_reservations, coupon_branch_allocations, coupons, order_counters, order_discounts, order_items, orders, payments, payment_refunds, tenant_settings, reservation_counters, push_subscriptions, notification_reads, notifications, notification_clears, staff_biometric_enrollments.

`staff.id = auth.users.id` (1:1). Supabase Auth = authentication; `staff` table = authorization (tenant, branch, role). `staff.pinHash` column exists in schema but is NOT used anywhere — login is email+password only.

**Key entity notes:**

- `restaurant_tables` statuses: available, occupied, reserved, out_of_service.
- `orders` types: dine_in, takeaway, delivery. `orders.status` enum: pending, confirmed, ready_for_delivery, out_for_delivery, delivered, completed, cancelled. Delivery workflow: confirmed → ready_for_delivery (rider assigned, bill auto-opens for print) → out_for_delivery (rider starts delivery) → delivered (rider marks delivered, Complete Order button enables) → completed (staff/system completes payment). `deliveries.status` is a separate, mirrored enum (unassigned/assigned/out_for_delivery/delivered/cancelled) — `updateDeliveryStatusAction` keeps both tables in step. `canPrintBill`/`canCompleteBill` key off `order.status` directly, not `deliveryStatus`.
- `audit_logs` stores actor + actor_name (denormalized snapshot). The "set null FK + name snapshot" permanent-delete pattern (see §6) is extended across `orders.staffId`, `orderDiscounts.appliedBy`, `payments.processedBy`, `coupons.createdBy`, `attendance.staffId`, `attendance.loggedBy`.
- Notifications system: `notifications` + `notification_reads` (per-staff read tracking) + `notification_clears` (per-staff clear point). Branch-scoped, 11 types covering order/reservation lifecycle, attendance, delivery status, staff/rider creation, audit overrides, device approval.
- `coupons` — discountType (percentage/fixed), discountValue, maxUses (null = unlimited), branchIds (null = all branches), menuItemIds/categoryIds (null = whole order), validFrom/validTo (nullable dates), isActive. Structural fields locked from editing once a coupon has real usage on any branch. Offline design: equal split of maxUses across branches at creation time (`coupon_branch_allocations`), never recalculated — no Realtime token sync, no weighted splits, no reconciliation/overshoot logic (structurally impossible to overshoot by design).
- `branch_devices` — id, tenantId, branchId, deviceToken, status (pending/approved), label, requestedBy, approvedBy, timestamps. Powers the staff/rider clock-in system: branch-level device approval (not per-staff) since restaurants commonly share one POS terminal. An approved device works from anywhere, not just the restaurant — deliberate simplification.
- `payments` — branchId, provider (nullable text: "manual" or a real gateway id like "payfast"), status (paymentStatusLifecycleEnum: pending/processing/paid/failed/cancelled/expired/refunded/partially_refunded/requires_verification — distinct from the order-level `paymentStatus` enum which tracks the ORDER's aggregate state), providerTransactionId (unique partial index), merchantTransactionId, clientPaymentId (unique partial index, offline-sync dedup), terminalId, currency (default PKR), metadata (jsonb), initiated/verified/failedAt timestamps. CHECK amount >= 0 (not > 0 — a legitimate $0 complimentary-order payment exists).
- `payment_refunds` — id, tenantId, paymentId (FK cascade), amount, reason, status, providerRefundId, createdBy/createdByName (staff attribution, set-null pattern).

**Migrations:** `src/db/migrations/`, tracked via `_journal.json` + `drizzle.__drizzle_migrations`. Always run `npm run db:generate` after schema changes and confirm the diff before `db:migrate` (or, for hand-written SQL already run directly in Supabase, confirm generate's output matches exactly and do NOT run `db:migrate`).

**Ledger reconciliation fix pattern** (if a migration seems to vanish or generate reports no changes unexpectedly): compare (a) `_journal.json` entries, (b) actual `.sql` files on disk, and (c) actual `meta/*_snapshot.json` files on disk — all three must agree. Also watch for constraint-name drift: a hand-run migration's FK constraint name in the live DB must exactly match what drizzle-kit generate expects (standard pattern: `{table}_{column}_{ref_table}_fk`), or the ledger will silently record a name the live DB doesn't actually have — rename the live constraint to match rather than letting this drift.

**A hand-run Postgres migration recorded only in `_journal.json`** (not via db:generate) leaves drizzle-kit's snapshot metadata unaware of the change, so the NEXT real `db:generate` run will re-detect and re-emit that same change as if it were new. Fix: manually strip the duplicate/already-applied statement from the newly generated file before treating it as the historical record — never re-run a duplicate `ALTER TYPE ADD VALUE`, Postgres will error.

**A live-DB foreign key constraint can drift from what schema.ts declares** even without any code change flagging it. Standard verification query: `SELECT conname, conrelid::regclass, confdeltype FROM pg_constraint WHERE confrelid = 'staff'::regclass AND contype = 'f';` — run this whenever a delete/FK-dependent action fails unexpectedly, don't trust schema.ts alone.

**Security & access model:**
- `getSupabaseServerClient()` / `getSupabaseBrowserClient()` — scoped, RLS-respecting, used in the large majority of server actions and all client-side realtime.
- `supabaseAdmin` (`src/lib/supabase/admin.ts`) — RLS-bypassing, used narrowly in admins/actions.ts, staff/actions.ts, uploads/actions.ts, lib/realtime/broadcast.ts.
- RLS is currently inert — all real queries go through Drizzle direct-to-Postgres (via `DATABASE_POOL_URL`, a direct pooled connection), bypassing PostgREST entirely. Authorization is enforced entirely by application-code role checks. Real RLS is dedicated V2 work. Every new action must include its own explicit role check. Note: a hand-added RLS policy CAN still silently block writes with zero rows affected if the query runs through an RLS-respecting client — before assuming RLS is a blocker, check which Postgres client/connection path the actual write goes through.
- `hasPermission(role, permission)` in `src/types/staff.ts` is the central RBAC check.

---

## 4. Engineering Standards

- TypeScript: strict, no `any`, reusable interfaces/types.
- Frontend: Next.js (App Router, Turbopack dev), Tailwind, shadcn/ui. Prioritize responsiveness, accessibility, UX, performance.
- Backend: PostgreSQL, Drizzle ORM, Supabase Auth/Realtime. Prioritize security, scalability, tenant isolation, validation.
- Code quality: modular, strongly-typed, production-grade. No tutorial code, duplicated logic, giant files, weak typing, unnecessary abstractions.
- Security: validation, authorization, protected routes, tenant isolation on every write. Never trust client input.

---

## 5. Codebase Reference

**Stack:** Next.js (App Router, Turbopack), TypeScript strict, Tailwind, shadcn/ui, @base-ui/react primitives (Select, Popover, Dialog, AlertDialog), Drizzle ORM, PostgreSQL (Supabase), Supabase Auth + Realtime + Storage, Zustand, TanStack Query (IndexedDB-persisted for offline POS), idb-keyval, Zod, react-hook-form + zodResolver. `better-sqlite3` (menu migration tool only, not app runtime — see §12). Windows dev, PowerShell only, VS Code integrated terminal.

**Folder structure (feature-based):**

```
src/
  app/ — App Router pages: (auth), (dashboard), (website), api/
  features/<name>/
    actions.ts — server actions (main pattern)
    public-actions.ts — customer-facing, no auth (online ordering, booking)
    pushActions.ts — push-notification actions, where present
    schemas.ts, components/, hooks/, lib/
  db/
    schema/ — one file per table
    migrations/ — SQL + meta/_journal.json
    index.ts — Drizzle client (DATABASE_POOL_URL, pooled)
    relations.ts — single file at src/db/relations.ts, NOT src/db/schema/relations.ts
  lib/
    supabase/{server,client,admin}.ts
    realtime/{channels,broadcast,useBranchChannel,channelRegistry}.ts
    payments/ — PaymentService, PaymentProvider interface, provider adapters (service-layer code lives here, NOT in features/payments/ — see below)
    rate-limit.ts, env.ts, audit.ts, tenant.ts, deviceToken.ts, offlinePaymentQueue.ts, offlineOrderQueue.ts, withTimeout.ts
  components/
    ui/ — shadcn primitives + date-picker.tsx, time-picker.tsx
    providers/AlertModalProvider.tsx — showAlert/showConfirm, z-index 300 (above notification panel's z-200)
  instrumentation.ts — Sentry init + env validation, runs at server boot
  types/staff.ts — hasPermission(role, permission), core RBAC helper
```

**Folder convention:** `src/lib/<name>/` is for service layers with no UI attachment (PaymentService, provider adapters, realtime broadcast, Supabase clients) — matches the pattern of `src/lib/supabase/`, `src/lib/realtime/`. `features/<name>/` is reserved for actions.ts, components/, hooks/, and feature-specific Zod schemas.ts — never DB schema (always `src/db/schema/`) and never generic service/provider logic.

**Core server-action pattern** (used across ~22+ actions.ts files):

```typescript
export async function someAction(input: SomeInput) {
  const parsed = someSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const currentStaffRow = await db.query.staff.findFirst({ where: eq(staff.id, user.id) });
  if (!currentStaffRow || !hasPermission(currentStaffRow.role, "some_permission")) {
    return { error: "You don't have permission to..." };
  }

  await logAudit(db, currentStaffRow, "resource_type", resourceId, "create", { newValue: {...} });
  return { success: true, data: result };
}
```

ADMIN role adds branch-scoping on top of this.

**Permanent-delete pattern:** for any FK to `staff.id` that must survive a permanent delete, use `onDelete: "set null"` + a paired `*Name` text column populated at INSERT time by every action that creates that row. Before actually deleting a staff row: run a backfill `UPDATE ... SET xName = '<name>' WHERE xId = '<id>' AND xName IS NULL` across every affected table (inside a transaction), THEN delete the Supabase Auth user, THEN delete the staff row — Postgres auto-nulls the FK once the row is gone. In the UI, whenever a live-linked ID is null but a name snapshot exists, render the snapshot name plus a "Deleted" badge instead of trying to join to a live row. Any query that resolves "who is this" by starting from the live `staff` table (inner join, or listing staff and left-joining) will silently drop permanently-deleted people from history — needs either a leftJoin instead of innerJoin, or a second explicit query for the `*staffId IS NULL*` rows merged in separately.

Deleting an external resource (e.g. Supabase Auth user) and a DB row are two non-transactional steps (can't share a Postgres transaction with Supabase Auth) — treat "not found" on the external-delete step as already-done, not as a blocking error, so retries can complete cleanly.

**Self-edit permission pattern:** server actions gated on a `manage_*` permission must separately allow the acting user to edit their OWN row even without that permission — otherwise STAFF/RIDER can never save their own profile. Pattern: check `targetId === user.id` and let self-edits bypass the `hasPermission()` gate, while all other checks (role-change blocks, branch-scoping) still apply normally.

**Client-side data pattern:** React Query hooks wrap server actions. Mutation hooks call `queryClient.invalidateQueries({ queryKey })` in `onSuccess`; `revalidatePath` in the server action affects Next's server cache only, client-side React Query cache always needs its own explicit invalidation. `invalidateQueries({ queryKey })` uses partial-prefix matching — every element in the provided key array must match the cached query's key at that position, INCLUDING `undefined`. Invalidate with the shortest reliable prefix (e.g. `["orders"]` alone) so it matches every variant of that query regardless of filter params, rather than including literal `undefined` placeholders that may not match the real cached key shape.

**Auth/permission system:** Roles SUPER_ADMIN, ADMIN (branch-scoped), STAFF, RIDER. `hasPermission()` in `src/types/staff.ts` is the central RBAC check.

**Multi-tenancy:** one dedicated Postgres DB per restaurant. `getTenantId()` in `src/lib/tenant.ts` reads `TENANT_ID` env var, throws loudly if missing.

**Monitoring/protection in place:** Sentry (`tracesSampleRate` 0.1 in production — never 1/100%, huge Lighthouse hit), rate limiting (Upstash Redis) on login/forgot-password/public order creation/public reservations/cron, env validation at server boot, health check endpoint, `useBranchChannel.ts` shared realtime hook delegating to a ref-counted `channelRegistry.ts` (prevents duplicate/overlapping channel subscriptions to the same topic causing reconnect-handler stack overflows), pm2 graceful shutdown.

**Realtime:** Supabase Realtime (broadcast-only, empty-signal pattern). `useBranchChannel(branchId, ...)` silently no-ops whenever `branchId` is falsy — any hook built on top of it that derives `branchId` from `currentStaff?.branchId` will silently never receive realtime updates for SUPER_ADMIN accounts (branchId = null by design, not scoped to one branch). Confirmed/accepted limitation — SUPER_ADMIN does not get live realtime; would need an explicit branchId param sourced from whatever branch context they're currently viewing if ever needed.

**Offline POS:** enqueue-on-failure pattern, `OfflineSyncManager.tsx` (sequential resync, stop-on-throw), kitchen ticket iframe printing. Offline cash payments get a queue (`offlinePaymentQueue.ts`, mirrors `offlineOrderQueue.ts`) — payments sync AFTER orders (an order must exist server-side before any payment against it can succeed). Card/JazzCash/Easypaisa/bank transfer explicitly do NOT get offline sync — disabled in the UI while offline, full stop (Zakir's explicit decision, since non-cash payment verification requires a live connection). Split/partial payments also don't get an offline fallback — the queue's replay shape doesn't carry an amount, only full-balance cash payments queue. Any TanStack Query mutation that needs to run its own custom offline handling (timeout, queue, retry) MUST set `networkMode: "always"` — the library's default online-only mode silently pauses/intercepts the mutation while offline before custom logic ever runs, with zero error or log to indicate why.

**Service worker (Serwist):** registered only inside the `(dashboard)` route tree, never at the root layout. Authenticated/protected page HTML should never be cache-eligible in a service worker (use NetworkOnly + a dedicated `/offline` fallback page) — only public/static content should be cacheable, otherwise an offline refresh can serve stale cached HTML (e.g. an old login page) instead of a real offline state.

**Payments architecture:** provider-agnostic `PaymentService` + `PaymentProvider` adapter interface (`src/lib/payments/`), never hardcoded to one gateway. `ManualProvider` (Phase 1, no external API — staff records cash/card/bank, recording = considered paid immediately) and `PayFastProvider` (Phase 3, PayFast's hosted Web Checkout — see §8) both implement the same `initiate`/`verify`/`refund` interface, all accepting an optional `dbClient` param so they can run inside an existing transaction. `completeBillAction` calls `PaymentService.initiate()` inside its own `db.transaction()`, keeping the payment insert atomic with the order-status update. Split payments: `completeBillAction` accepts an optional `amount` param (defaults to remaining balance); table frees on ANY payment, partial or full; `order.status` only flips to `"completed"` once `totalPaid >= total`.

**Split Payment (multi-method, `recordSplitPaymentAction`):** records one or more payment lines (different methods) against an order in a single transaction, updating `totalPaid`/`balance`/`paymentStatus` only — it deliberately NEVER flips `order.status` to `"completed"`, even if the lines sum to the exact remaining balance. Completing the order (and printing the final bill) is always a separate, explicit step via Complete Order / Print Bill, same as an already-fully-paid PayFast order still needing an explicit complete. `SplitPaymentModal` shows any already-recorded payment lines ("Already recorded") when reopened on a partially-paid order. `canSplitPayment` requires `order.status` to be past `"pending"` (i.e. `"confirmed"` or later) and not `"completed"`/`"cancelled"`.

---

## 6. Design System (Dashboard/POS/Admin only)

**Scope:** Dashboard/POS/admin only. Storefront stays on the existing orange brand (#e8570e) — out of scope until Zakir decides otherwise.

**Reference:** "BISTRO - Restaurant Food Dashboard" — matched exactly.

**Palette:** Primary deep violet #5B21B6 (default action color throughout). Coral #F97362 — sparing accent only (`variant="cta"`), not the default action color. Background off-white #F8F7FC, cards white. Generous border radius (rounded-2xl/3xl/full). Font Plus Jakarta Sans.

**Design tokens** (`src/app/globals.css`):
- `--primary: #5b21b6`, `--coral: #f97362` (separate from `--accent`, which stays a soft violet hover-tint — deliberate, to avoid breaking existing soft-hover-tint usage across ~100 components).
- Radius scale via `@theme` block (Tailwind v4: `--radius-sm` through `--radius-3xl`). `@theme` is valid v4 syntax — VS Code's CSS linter will false-positive flag it as unknown; silenced via `.vscode/settings.json`.
- Sidebar tokens: violet-on-violet (`--sidebar-bg: #5b21b6`, white/lilac text).
- Button `variant="cta"` (coral) — sparing use. Badge variants `chip-violet`, `chip-coral`, `chip-blue`, `chip-green`.
- No `--success`/`--warning` tokens exist. Raw emerald/amber colors used for paid/discount/warning-type UI are intentional, not oversights.
- `destructive`/`destructive-foreground` — real token, used for cancel/danger/unpaid states. Prefer this over raw red wherever applicable.
- Global button cursor rule: `button:not(:disabled), [role="button"]:not(:disabled) { cursor: pointer; }` in globals.css, alongside `a { cursor: pointer }`.
- Checkboxes use inline `style={{ accentColor: "var(--primary)" }}`, not the `accent-*` Tailwind utility (unreliable on native checkboxes). Switch/toggle computes checked state in JS with literal colors via ternary, not data-attribute Tailwind variants (Base-UI Switch's data-checked/data-unchecked attribute-selector classes are unreliable).

**Glassmorphism:** removed entirely from dashboard/POS scope (no `backdrop-blur-*` on overlays — dialog.tsx, alert-dialog.tsx, sheet.tsx, per-feature modals). Overlay dim uses `bg-black/50` (not `bg-foreground/50`, which silently compiles to nothing). Storefront decorative blur usages intentionally left alone — out of scope.

All native `confirm()`/`alert()` replaced with `showConfirm()`/`showAlert()` from `AlertModalProvider` (Promise-based `showConfirm()`; `showAlert(message, title)` takes a plain string title, NOT an options object, and is NOT async/Promise-returning).

**Checkbox groups matching Select theme:** outer container `rounded-xl border border-input bg-background p-2`, each row `rounded-lg px-2 py-1.5 hover:bg-primary-light hover:text-primary transition-colors`. Keeps native multi-select checkboxes (not a fake dropdown) but gives them Select's visual polish.

**Favicon:** `src/app/icon.svg` — violet circle (#5B21B6) with a white flame glyph, matching the sidebar's flame-in-circle motif.

**Z-index layers:** notification panel portal = z-200; AlertDialog (showAlert/showConfirm) = z-300, intentionally above the notification panel.

**Deleted-person badge convention:** a small pill, `text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive`, reading "Deleted", shown next to any name that comes from a `*Name` snapshot column where the live ID is null. For payment attribution specifically: a null `processedBy` on a PayFast payment means "no staff involved" (customer paid directly), NOT a deleted staff member — render "Online Customer" instead of the Deleted badge in that case.

---

## 7. Known Technical Gotchas (check these first)

1. Missing manual utility class — grep globals.css before assuming a deeper bug.
2. Service worker caches stale JS independently of `.next` cache — check DevTools → Application → Service Workers.
3. Native `<select>`/`<input type="time"|"date">` must be replaced with themed Select/TimePicker/DatePicker. DatePicker's value is `Date | null`, always pass `null` not `undefined` when empty.
4. Garbled terminal-paste characters are a display artifact only — files are correct UTF-8, do not "fix."
5. `branchId` must come from the `branchId` prop threaded down, not from `currentStaff`/`useAuthStore` — breaks silently for SUPER_ADMIN.
6. PowerShell `**` glob does not recurse — always use `Get-ChildItem -Recurse -Include`. Paths with parentheses need quotes.
7. PowerShell regex ≠ JS regex — no `\u{...}` brace syntax; use .NET-style ranges.
8. "Dead code" needs two-part verification (direct grep + barrel-export check), not one grep. Grep results can look scary but be benign — a match on a similarly-named-but-different file doesn't mean it's part of a dead-code chain; check the actual file path and folder.
9. `@base-ui/react/select`'s SelectValue doesn't resolve labels for pre-populated values on first render — always pass an explicit children function.
10. Never use `date.toISOString().slice(0,10)` for a Date→YYYY-MM-DD string — use `toDateKey`/`fromDateKey` helpers.
11. `accent-primary`/`accent-*` Tailwind utility doesn't reliably apply the custom violet token to native checkboxes — use inline `accentColor` style.
12. `drizzle-kit generate` can silently report "no changes" even when DB/schema differ — see §3 ledger reconciliation note. Also watch for FK constraint NAME drift between live DB and what drizzle expects.
13. Resizing a canvas-style container with absolutely-positioned pixel-coordinate children does not scale children — use CSS `transform:scale()` on a wrapper, divide pointer-drag deltas by the scale factor.
14. Base-UI Switch's data-checked/data-unchecked attribute-selector classes are unreliable — compute checked state in JS with literal colors instead.
15. A dashboard/admin component can be accidentally left on old storefront orange brand — grep for raw hex literals when something looks off-brand.
16. Service worker (Serwist) must be registered only inside the `(dashboard)` route tree, never at the root layout.
17. Sentry `tracesSampleRate` should not be 1 (100%) in production — huge Lighthouse hit, use 0.1.
18. Duplicate/overlapping realtime channel subscriptions to the same topic (e.g. two components both mounting `useBranchChannel(branchId, "tables", ...)` simultaneously) can re-enter the reconnect handler before the stack unwinds, causing a RangeError. Fix pattern: a shared, ref-counted channel registry keyed by topic string, with `useBranchChannel` as a thin wrapper delegating to it — exactly one real channel + one reconnect loop per topic regardless of subscriber count.
19. Any customer-facing/public action path (e.g. public order creation) should be checked for the same realtime/notification calls as its staff-facing equivalent — easy to build the staff path with broadcasts and forget the public one.
20. A hand-written migration index not mirrored in `schema.ts` is invisible to normal code review — check `pg_indexes` directly when a constraint's behavior seems wrong.
21. A query that resolves "who is this" by starting from the live staff table (inner-joining or left-joining FROM staff) will silently drop permanently-deleted people from history, even though their `*Name` snapshot data still exists. Fix: leftJoin instead of innerJoin, or a second explicit query for the `*staffId IS NULL*` rows merged in separately.
22. An async action guarded by a ref (e.g. `isSubmittingRef.current = true` to block double-submit) must reset that ref on EVERY exit path, including early-return validation failures — not just in a try/finally around the main logic.
23. A store action's TypeScript interface can declare more parameters than its implementation destructures, and this compiles cleanly with no error — object shorthand silently uses whatever name the shorter param list gave it. Always cross-check an interface's param count against its arrow-function implementation's destructured param count.
24. Calling `setState` synchronously inside a `useEffect` body triggers React's "cascading renders" warning even when functionally correct. Fix: compute the "should this be open/active" condition as a plain derived value at render time instead of an effect, and pass that directly as a prop — no `useEffect`, no setState-in-effect.
25. A component's own internal side-effect prop (e.g. `autoPrint` on a modal) can fire unwanted behavior at the same time a parent auto-opens that component for an unrelated reason. These are separate concerns and must be controlled by separate props/values, not conflated.
26. A Postgres enum column (`pgEnum`) requires a hand-written `ALTER TYPE ... ADD VALUE ... AFTER '...'` SQL migration run directly in Supabase SQL editor to add a new value (not drizzle-kit push), then reconciling both `enums.ts` and the migration ledger. Always check whether a status/type field is a real DB enum (grep `schema/enums.ts`) before assuming a TypeScript-only type change is sufficient.
27. `next/font/google`'s `display: "optional"` shows the custom font ONLY if it's already cached/loaded before first paint — otherwise it permanently falls back to a system font for that entire page load with no later swap. Use `display: "swap"` instead to guarantee the font eventually renders.
28. RLS being "inert" is not absolute — a hand-added RLS policy CAN still silently block a write with zero rows affected and no thrown error, IF the query runs through an RLS-respecting client. Before assuming RLS is the blocker, check which Postgres client/connection path the actual write goes through (a direct pooled connection bypasses RLS regardless of policies).
29. A form gated on a combined `isLoading || isProcessing`-style boolean re-enables once processing finishes, even if processing finished BECAUSE of a fatal error — "processing finished" and "processing succeeded" are different states and must never be conflated for enabling a destructive form action. Track fatal/invalid state as its own separate boolean and fully hide/disable the form when true, with a defensive early-return in the submit handler too.
30. Recent Chrome versions on Windows render scrollbars using native "Fluent Scrollbars" and completely ignore all `::-webkit-scrollbar-*` CSS. Firefox is unaffected. Any custom-scrollbar styling must not rely on `::-webkit-scrollbar-*` alone — accept the native look, use `.scrollbar-hide` + a JS-drawn thumb, or test explicitly in current Chrome.
31. A flex child constrained by `max-h-*` (not a fixed `h-*`) can collapse to zero height when a sibling inside it uses `flex-1` — the `flex-1` element has nothing concrete to grow into. Switch the container to a fixed `h-*` instead.
32. Setting `overflow-y-auto` with no explicit `overflow-x` computes `overflow-x` to `auto` too per spec, silently creating a horizontal scrollbar. Always pair `overflow-y-auto` with an explicit `overflow-x-hidden` unless horizontal scroll is actually wanted.
33. Supabase's implicit-flow link verification redirects back with `#error=...&error_code=...` when an invite/reset link is expired or invalid — NOT with `#access_token=...`. Any client-side hash-parsing effect must check for `error`/`error_code` in the hash first, before checking for `access_token`.
34. `supabaseAdmin.auth.admin.inviteUserByEmail()` ALWAYS uses Supabase's implicit/hash-fragment flow, never PKCE — this is a Supabase platform limitation. Hash fragments never reach the server, so a PKCE-based `/auth/callback` route can never process an invite link. Point invite `redirectTo` directly at the destination page instead, and add a client-side effect there that reads `window.location.hash` and calls `supabase.auth.setSession()`. `resetPasswordForEmail` is a DIFFERENT method that DOES support PKCE and correctly uses `/auth/callback` — don't change that path to match the invite fix.
35. Supabase's own Auth dashboard "Site URL" setting can override the app's `redirectTo` parameter entirely for implicit-flow methods. This is separate from `NEXT_PUBLIC_APP_URL`. If invite/magic links go to the wrong URL despite a correct env var, check Site URL in Supabase directly.
36. Deleting an external resource (e.g. Supabase Auth user) and a DB row in two non-transactional steps means a failure between the two steps leaves partial state on retry — treat "not found" on the external-delete step as already-done, not a blocking error.
37. A component gating its own render/unmount on derived "can-do-X" flags (e.g. `hasActions`) can self-unmount mid-flow when an action's success flips every flag to false in the same render (e.g. an order completing removes every action). Track "is any modal currently open" as its own condition and keep the component mounted whenever true, regardless of whether new actions are available.
38. Action-availability flags like `canSplitPayment` must explicitly exclude every status where the action shouldn't yet be possible (e.g. `pending`), not just the terminal states where it's clearly over (`completed`/`cancelled`) — excluding only the terminal states leaves earlier invalid states wrongly enabled.
39. A persisted, cross-session React Query cache (IndexedDB, global `staleTime`) can serve stale data on mount to a page that wasn't subscribed to realtime when a change happened elsewhere (e.g. POS creates an order while Active Orders wasn't mounted to receive the broadcast). Any operationally-critical list query needs its own `staleTime: 0` + `refetchOnMount: "always"` override — don't rely on a shared dashboard-wide default.
40. PowerShell's `Get-Content`/terminal output re-encodes an em dash (—) as garbled bytes like `â€”` in what gets pasted back. This is a display/copy artifact only (see gotcha #4) — the real file on disk has a normal dash. When writing NEW code or comments (not editing existing ones), never copy a garbled sequence like `â€”` verbatim into a diff — always write a plain hyphen/em dash directly instead.
41. A hand-written text/SQL parser that uses a naive `indexOf(delimiter)` to find a boundary (e.g. end-of-statement `;`) will misfire if that same delimiter character can legitimately appear inside a quoted value (e.g. a variant string like `Half:500;Full:900`). Any boundary search inside hand-rolled parsing must track quoted-string state (and paren depth, where relevant) and only match the delimiter outside of it.

---

## 8. Payment Gateway — PayFast (Pakistan)

Chosen provider: PayFast (gopayfast.com), an SBP-licensed PSP, as a single aggregator bundling JazzCash, Easypaisa, cards (Visa/Mastercard/UnionPay/PayPak), and Raast under one merchant account/API per restaurant. Each restaurant owner signs up for their own PayFast merchant account (individuals/unregistered businesses supported, not just registered companies) at https://getstarted.apps.net.pk/signup, gets Merchant ID + Merchant Key + Passphrase, set as that restaurant's env vars — zero core code changes per restaurant. Merchant sign-up requires CNIC, NTN, and a utility bill copy. Sandbox credentials are issued only after signup review (no instant self-serve sandbox). Contact: info@gopayfast.com / +92 21 37132793.

Typical MDR: wallets ~1.5-3%, cards ~2.5-3.5%, Raast usually <1%, no setup/monthly fee, settlement T+1.

**Integration approach:** PayFast's hosted "Web Checkout" flow — customer's browser is auto-submitted (HTML form POST) to PayFast's own payment page, our server never touches card data (keeps out of PCI-DSS scope). A "pending" payment row is inserted BEFORE redirecting the customer, so an abandoned/failed checkout still leaves a reconcilable record. `verify()` always re-checks status directly against PayFast's server — never trusts the browser redirect alone.

**IMPORTANT — field verification status (checked against PayFast's real official docs at gopayfast.com/docs):**
- **Confirmed correct:** Get Access Token flow (`POST /token` with merchant_id/secured_key/grant_type/customer_ip), refund endpoint (`POST /transaction/refund/<transaction_id>` with txnamt/refund_reason), Get Transaction Status by basket_id (`GET /transaction/basket_id/<basket_id>?order_date=...`), success status_code `"00"` = Processed OK.
- **Still unverified — do not trust without checking with PayFast directly:** the Web Checkout redirect flow (`SUCCESS_URL`, `FAILURE_URL` fields, the `Ecommerce/api/Transaction/PostTransaction` endpoint path) is NOT present in PayFast's own official API docs — only in an unofficial third-party wrapper and a PayFast Google Pay–specific PDF. PayFast's official docs actually describe a **Direct API** integration (server collects card/account details directly and calls PayFast, handling OTP itself) rather than a pure hosted-redirect flow. Before trusting the current Web Checkout implementation, confirm directly with PayFast support whether hosted Web Checkout is available for a food/restaurant merchant, or whether Direct API (which would require rethinking the "never touch card data" approach) is required instead.

Real end-to-end verification is blocked until a real restaurant client signs up for their own PayFast account with real CNIC/NTN. A fake local dev simulator exists at `src/app/api/dev/fake-payfast/` (auto-disabled in production via NODE_ENV check) to test the integration's logic end-to-end without real credentials — swap `PAYFAST_BASE_URL` back to the real PayFast base URL once real credentials exist, no other code changes needed.

Architecture decision: CNIC/NTN and gateway API keys are meant to be stored as encrypted columns in the tenant's own DB, never in `.env` files, once multi-tenant onboarding is real (currently still using `.env` per the single dev tenant).

**Current status:** Manual/cash payments (single and split, across methods) are fully built and tested end-to-end, including refunds on split-paid orders. PayFast is intentionally parked — no PayFast merchant account exists yet (needs a real restaurant's CNIC/NTN). Zakir's plan: create the merchant account once an actual paying customer signs up, then do real end-to-end PayFast testing at that point, including resolving the Web Checkout vs. Direct API question above with PayFast support directly.

---

## 9. Compliance — FBR (Pakistan)

FBR POS integration is currently only legally mandatory for large "Tier 1" retailers/restaurants (multi-outlet chains, high turnover, mall locations) — NOT small/medium restaurants, which are Zakir's actual target customers (see §11 pricing tiers). A draft FBR notification proposes expanding this to restaurants more broadly, but it is not yet law. Explicit decision: do not build FBR integration now — build it only if/when a real client's restaurant size actually requires it. If ever built: requires the restaurant's own FBR POS Integration registration, a live invoicing API call per sale returning a QR code for the receipt, per-tenant sandbox→production credentials, new DB fields for invoice/response/sync/retry. Rough estimate 2-4 weeks.

---

## 10. Database Backups & Infrastructure

**Current setup (dev tenant, built this session):** A custom pg_dump-based backup pipeline, not dependent on any paid plan. GitHub Actions workflow (`.github/workflows/backup-tenant-dbs.yml`, daily at 22:00 UTC / 3am PKT, plus manual `workflow_dispatch` trigger) loops over tenants defined in the `TENANT_DB_URLS` secret (JSON: `{"tenant-slug": "postgres-url", ...}`). For each tenant it runs `pg_dump -Fc --no-owner --no-privileges` (custom format, matched to PostgreSQL 17 client via PGDG repo — Supabase's server is 17.6, and a client/server major-version mismatch causes `pg_dump` to refuse to run), then commits the resulting `.dump` file into a separate **private** GitHub repo (`Zakir-Hussain313/restaurant-data-backups`), one subfolder per tenant slug. After each successful dump, the script (`scripts/backup-tenant-db.sh`) prunes that tenant's folder to the 7 most recent files. On any pg_dump/upload failure, the partial file is deleted and the job exits non-zero, triggering GitHub's built-in failure-notification email — one tenant failing does not block others in the same run, since the loop continues and commits whatever succeeded before failing the overall job at the end.

No cost, no external storage service, no card required — uses only GitHub (already in use for the app repo) via a fine-grained Personal Access Token (`BACKUP_REPO_TOKEN` secret, Contents: Read and write, scoped only to the backups repo).

Use the **direct/session connection string** (`DATABASE_URL`, port 5432) for `TENANT_DB_URLS`, not the pooled/pgbouncer one (`DATABASE_POOL_URL`, port 6543, `pgbouncer=true`) — pg_dump needs session-level behavior the transaction-mode pooler doesn't reliably support.

**For real paying customers:** the plan is **Supabase Pro plan** ($25/month per tenant) — includes automatic daily backups (7-day rolling retention) with no custom code needed, since each restaurant gets its own dedicated Supabase project. This remains the default plan for any real production tenant. The custom pg_dump pipeline above serves as a second, self-controlled layer of protection that works regardless of Supabase plan tier (including free-tier dev/demo tenants, which have zero backup coverage from Supabase itself) — not a replacement for Pro on real tenants, but insurance underneath it.

Self-hosting Supabase (Docker, own VPS) was evaluated as an alternative — real option, ~$14-43/month fixed cost regardless of usage, full control over compute/storage. Trade-off: loses Supabase's managed daily backups, managed email delivery (would need own SMTP provider like Resend/SendGrid), and managed uptime/patching — all become Zakir's own operational responsibility (~1-2 hrs/month maintenance minimum). Decision: stick with managed Supabase Pro per-tenant for now; revisit self-hosting only if per-tenant costs become a real problem at meaningful scale.

---

## 10a. Backup Restore Procedure

Restore is intentionally manual, not automated — a human must decide when/how to restore, not a script.

**Restore steps:**

1. Get the dump file from `restaurant-data-backups/<tenant-slug>/<timestamp>.dump` (download directly from GitHub, or clone the repo).
2. Identify the target DB — same Supabase project (if only data is corrupted/deleted) or a new Supabase project (if the whole project is gone).
3. Run, from a machine with the PostgreSQL 17 client installed (matches server version 17.6 — a version mismatch here fails the same way it does for backups):

pg_restore --no-owner --no-privileges --clean --if-exists \
  -d "<target DATABASE_URL, port 5432, not the 6543 pgbouncer one>" \
  ./<timestamp>.dump

   - `--clean --if-exists` drops existing objects first, so it fully replaces current state (safe even against a partially-corrupted target).
   - `--no-owner --no-privileges` skips recreating original role/ownership, which won't match a fresh Supabase project anyway.
4. Verify: spot-check row counts on key tables (`staff`, `orders`, `menu_items`) and confirm the app functions correctly against the restored tenant.

**Caveats:**
- Restore reflects state as of that backup's timestamp — anything after is lost. With daily backups, worst case is up to ~24h of data.
- 7 days of rollback points exist (oldest kept backup) in case corruption isn't noticed immediately.
- This procedure should be dry-run once against a throwaway Supabase project before ever being needed for real, so it isn't being learned live during an actual incident.

---

## 11. Business Plan — Quetta Launch

Selling door-to-door via hired sales agents. Pricing framework: Small Cafe (1 branch) PKR 90k-130k upfront / 6k-8k monthly; Medium Restaurant PKR 130k-190k / 8k-11k; Large/High-Volume PKR 190k-260k / 11k-15k; Medium Multi-Branch (2-3) PKR 220k-300k / 14k-18k; Large Multi-Branch (4+) PKR 320k-450k+ / 20k-28k+.

Sales positioning: dedicated per-tenant infrastructure + ongoing service model (installation, onboarding, training, maintenance, monitoring) as differentiators.

Deliverables wanted from a future session (non-engineering): full user manual, finalized pricing sheet, Zaiqa-to-restaurant service contract, Zaiqa-to-sales-agent contract, sales training material — need real lawyer review before use.

Founding-customer discounts are for early adopters only, not permanent pricing. Migration/import program is scoped to what a given old system can actually export (see §12) — not a universal guarantee.

Feedback triage priority: Critical (security/data-loss) → High (multi-restaurant demand) → Medium → Low → Reject/defer.

---

## 12. Data Migration / Import Tooling

General-purpose menu migrator for onboarding restaurants off a prior system. Built as a standalone Node script (run locally via `node migrate-menu.mjs <file> --branch=<id> [--commit]`), not an in-app feature — matches the project's existing script pattern (`seed-load-test-staff.mjs`, `load-test-pos.mjs`). A GUI version is planned later as part of a future internal control-panel/deployment-dashboard tool (V2+), reusing the same core logic — not built as a separate feature now.

**Architecture:** every source format (CSV, Excel, SQLite, SQL dump, etc.) gets converted by a format-specific "reader" into ONE common shape (`{ categories: [{ name, items: [...] }] }`, matching Zaiqa's own menu structure — items carry variants and modifier groups). This common shape feeds one shared, format-independent import engine that writes to the DB inside a single transaction (all-or-nothing), skips items that already exist by name (safe to re-run), and always supports a dry-run preview before any write. Adding support for a new source format later means writing one new reader — the validation/preview/transaction/dedup logic never needs to change.

**Files:**
- `migrate-menu.mjs` (project root) — entry point, CLI args, dry-run/--commit flow, confirmation prompt.
- `migrators/lib/rows-to-menu.mjs` — converts flat row objects into the common categories/items shape, with row-level validation and error collection. Any new format that can be normalized into flat rows should reuse this rather than duplicating grouping logic.
- `migrators/lib/parse-variants.mjs` — parses `Half:500;Full:900` style variant strings.
- `migrators/lib/parse-modifiers.mjs` — parses `GroupName(min-max): Option:+adj, Option:+adj | AnotherGroup(...)` style modifier strings.
- `migrators/lib/csv-reader.mjs` — CSV format reader (columns: `category, item_name, description, price, variants, modifiers, image_url`).
- `migrators/lib/importer.mjs` — `buildPreview()` (dry-run summary) and `importMenu()` (the shared transaction-safe write engine, format-independent).

**Format coverage:**
- CSV — done, fully tested.
- Excel (.xlsx) — done (`migrators/lib/excel-reader.mjs`, via `exceljs`), same column layout as CSV.
- SQLite (.sqlite/.sqlite3/.db) — done (`migrators/lib/sqlite-reader.mjs`, via `better-sqlite3`), config-driven (table + column-name mapping passed via `--config=<path.json>`, not hardcoded) so it works against any actual old-POS SQLite schema. Not yet tested against a real old-POS export — only smoke-tested with a hand-made file.
- SQL dump (.sql, raw `INSERT INTO` statements) — done (`migrators/lib/sql-dump-reader.mjs`), same config-driven mapping approach, plus an optional `columnOrder` for dumps whose INSERT statements omit explicit column names. Hand-written character-scan parser (not a full SQL parser) — built for typical MySQL/SQLite dump syntax; review the dry-run preview carefully on a real dump before `--commit`, unusual escaping/dialects may not parse perfectly. Statement-end detection (`findStatementEnd`) must scan respecting quoted-string state, not a naive `indexOf(";")` — a value can legitimately contain a semicolon (e.g. a variant string like `Half:500;Full:900`), which would otherwise cut the INSERT statement off mid-way and silently corrupt/drop every row after it. Caught and fixed via a full 4-format fixture test (`migrators/create-test-fixtures.mjs`) before any real use.
- Config file shape documented in `migrators/config.example.json`.
- MS Access (.mdb/.accdb) — deliberately not building a native parser (poor Node support, low likelihood of need); plan is to convert Access → SQLite or CSV using an external tool first, then reuse the SQLite/CSV readers.
- Manual entry (notebook, photos, PDFs, WhatsApp/Google catalog listings) — not a code path at all, just staff/Zakir typing directly into Menu Management during onboarding.

Non-menu data (staff, past order history, customer records) is intentionally out of scope for this migrator — staff need new logins regardless (passwords never transfer), and historical order/customer data from prior systems is high-effort/low-value to import reliably; only build case-by-case if a specific real client's situation demands it.

---

## 13. Roadmap (condensed)

Priority order across all versions: security → reliability → performance → UX → real customer demand → business value. POS staff must never be burdened with admin-level work (inventory, purchasing, analytics) during service.

**V1 (current):** website, multi-branch, reservations, full RBAC, dashboard analytics, POS (offline-first), coupons, orders, attendance + clock-in/device-approval, permanent staff/admin delete, staff mgmt, audit logs, menu/table mgmt, realtime, notifications, reports/printing, subscription blocking, security (RLS deferred), backups (custom pg_dump pipeline for dev, Supabase Pro for real tenants — see §10), deployment/control plane, FBR (deferred) + payment gateways (Pakistan launch).

**V2 — Inventory & Business Mgmt:** ingredient/stock system, receiving/adjustments/transfers, recipe/BOM auto-deduction, food costing, supplier/purchasing, wastage/expense tracking, profitability reporting, CRM (profiles, loyalty, feedback, campaigns).

**V2 — Payments:** provider-adapter architecture (never hardcoded), full payment status lifecycle, webhook-driven, refunds, reconciliation, cash drawer/shift tracking, multi-jurisdiction tax engine, per-country local payment gateway integrations.

**International readiness (V2, full scope)** — Pakistan, Australia, France, Spain, Germany all targeted, rollout order Pakistan → Australia → France/Spain/Germany:
- i18n: translation keys, RTL where applicable, locale formatting (dates/numbers/currency).
- Multi-jurisdiction tax engine: correct tax rules per country/region.
- Local currency handling.
- Locally-compliant receipt/invoice formats.
- Local payment gateway support.
- Legal/data-residency/privacy compliance per country (e.g. GDPR for France/Spain/Germany) — requires explicit legal research per country, not just engineering work.
- Business licensing/registration requirements per country — informational only, verified with local counsel/authorities, not something the app can "build."
- Never claim a country is compliance-ready without verifying current local legal/tax/licensing requirements at build time.

**Legal eligibility gate (non-engineering, must be done by Zakir before operating in a given country):**
1. GDPR-compliant Privacy Policy + Terms of Service drafted (lawyer or compliance service, e.g. Termly/iubenda).
2. Business entity registered in home country; local business/tax registration (VAT/GST) completed per country once trading there.
3. Payment provider application approved for each target country.
4. Data export + account deletion features built once policy requirements are known.

Only once all four are done for a given country should Zaiqa be described as eligible to operate there — engineering readiness alone is NOT sufficient.

**V3 — Analytics/Intelligence:** forecasting (always with confidence intervals), smart inventory, menu intelligence, staff analytics (privacy-conscious), KDS, delivery optimization, waitlists, QR/table ordering, third-party integrations via adapter pattern.

**V2 deferred infra:** Redis caching (current perf numbers don't justify invalidation-bug risk yet), own/dedicated Supabase instance sizing per tenant (upgrade from Free/Nano to Pro + adequate compute BEFORE onboarding any restaurant with many concurrent terminals — re-run load testing at their expected concurrency before go-live).

---

## 14. Deployment Checklist (running list, not yet formalized as a document)

- Database backups — custom pg_dump-to-GitHub pipeline built and confirmed working for the dev tenant (see §10); Supabase Pro plan remains the plan for real production tenants, with the pg_dump pipeline as an extra layer of protection regardless of tier. Restore procedure documented (see §10a) but not yet dry-run end-to-end against a throwaway project — do this before it's ever needed for real.
- Migration/import script from prior POS systems — CSV, Excel, SQLite, and SQL-dump readers all done (see §12). SQLite reader only smoke-tested on a hand-made file, not a real old-POS export yet.
- Professional branded emails via Resend SMTP — deferred on purpose, not yet built.
- Payment gateway (PayFast) — integration built and complete. Remaining: per-restaurant merchant account creation (owner signs up themselves with their CNIC/NTN) and setting the resulting credentials as that tenant's env vars (see §8). Blocked until a real customer signs up.
- Privacy Policy (GDPR-compliant, covering payment data handling — "never store card numbers/CVV/PINs/OTPs") — required before going live with any payment processing, not yet drafted.
- Staging environment — needed before real load/stress testing at scale.
- Before onboarding any restaurant with many concurrent terminals: upgrade that tenant's Supabase instance to Pro + adequate compute size, then re-run load testing at their expected concurrency.
- Fingerprint attendance (scanner-based clock-in) — code complete and verified via simulated API punches; blocked on real ZKTeco-class hardware for final verification. Once the client's scanner arrives: (1) `npm install node-zklib` and set up `sync-config.json` (from `sync-config.example.json`) on a machine on the scanner's local network; (2) run `sync-fingerprint-attendance.mjs --inspect` against the real device first and fix `extractPunch()`'s field mapping if the raw output doesn't match `deviceUserId`/`recordTime`; (3) register the scanner and enroll a real staff member via the Attendance page's Scanner tab; (4) run `--once` for a first real punch before leaving the continuous poll loop running; (5) watch for node-zklib's known inconsistent-record-count issue on `getAttendances()` during real testing — `zkteco-js` is a fallback if it proves problematic.

---

## 15. Fingerprint Attendance (code-complete, pending real-hardware verification)

**Architecture:** Fingerprint scanner (ZKTeco-class hardware) is an additional, parallel attendance input — NOT a replacement for the existing browser self-service clock-in (device-approval based), which stays fully intact for branches without a scanner. GPS-gating and WiFi-IP-gating were both considered and explicitly rejected as the "no scanner" safeguard; the decision is "get a scanner if you don't want attendance conflicts," not a software workaround. Riders never use the scanner — their self-clock-in is unaffected regardless of branch scanner status.

Scanner does all fingerprint matching on-device; Zaiqa only ever receives `{ externalUserId, timestamp }` — no biometric data stored. A local sync script polls the unit and POSTs punch batches to Zaiqa.

**UI behavior:** a branch with an *approved* fingerprint scanner shows a "Scanner" tab on the Attendance page (replacing "Devices") and hides the POS `ClockButton`. A branch without one keeps both exactly as before.

**Schema (live, migration 0031 applied):**
- `branch_devices`: `deviceType` ('browser'|'fingerprint_scanner', default 'browser'), `externalDeviceId`; `deviceToken` nullable (browsers only). A scanner's `deviceToken` doubles as its sync-auth secret, server-generated at registration, stored plaintext (not hashed) so an admin can view it again anytime — no one-time-reveal UX.
- `attendance`: `source` ('manual'|'self_service'|'biometric', default 'manual') for reporting only, no behavior differs by source.
- New table `staff_biometric_enrollments`: maps staffId ↔ (branchDeviceId, externalUserId), unique per (branchDeviceId, externalUserId).

**Backend (done):** `biometricActions.ts` (registerFingerprintScannerAction, enrollStaffBiometricAction — with a branch-match check preventing SUPER_ADMIN cross-enrolling staff onto the wrong branch's scanner, processBiometricPunchBatch), the sync API route (`/api/attendance/biometric-sync`, per-device-secret auth via `crypto.timingSafeEqual`, rate-limited, max 500 punches/request), and `devices/actions.ts` additions (getBranchAttendanceMethodAction, getBranchScannerDevicesAction, getScannerEnrollmentsAction, unenrollStaffBiometricAction). `processBiometricPunchBatch` is batch-efficient — O(1) lookups per batch, single transaction, bulk audit insert, one realtime broadcast per batch, notifications suppressed for punches older than ~10 minutes.

**UI (done):** `AttendanceTabs.tsx` swaps Devices↔Scanner. `ScannerPanel.tsx` — register-scanner dialog (shows/re-shows the sync secret), per-scanner card (label, enrolled count, masked secret with show/copy, delete-with-confirm), enroll-staff dialog (staff dropdown filtered client-side to the branch), enrollment list with remove. `ClockButton.tsx` hides on POS whenever `getBranchAttendanceMethodAction` returns `hasApprovedScanner: true`.

**Local sync script (done, code-side):** `sync-fingerprint-attendance.mjs` (project root) + `sync-config.example.json`, using `node-zklib`. Modes: `--inspect` (dumps raw scanner records so the field mapping can be confirmed/fixed against real hardware before trusting it), `--once` (single poll-and-sync, for a first real test), and continuous polling (for a long-running process via pm2/Task Scheduler on a machine on the scanner's local network). Tracks last-synced timestamp in a local state file so re-polling the device's full log never double-sends. Setup requires `npm install node-zklib`.

**Verification status:** everything except the physical scanner connection has been tested — via simulated punches sent directly to `/api/attendance/biometric-sync` with `Invoke-RestMethod` (register scanner → enroll staff → simulated punch correctly clocks in/out with `source: 'biometric'`, realtime updates the Attendance table live). **Not yet verified:** `node-zklib`'s actual field names (`deviceUserId`/`recordTime` are best-guess fallbacks — node-zklib's shape isn't reliably documented across firmware versions) and a known upstream GitHub issue where `getAttendances()` can return an inconsistent record count between calls. Blocked on the client's real ZKTeco-class hardware — see deployment checklist for the exact steps to run once it arrives.

**Fixed along the way (unrelated to this feature):** the duplicated RIDER `isAvailable: true` block in `clockInAction` was collapsed to one statement. `todayInTenantTz`/`dayRange` were moved out of `actions.ts` (a `"use server"` file, which can only export async functions) into a new plain file `src/features/attendance/dateUtils.ts`, since they'd been exported as sync helpers for reuse in `biometricActions.ts` and were silently breaking the Turbopack build.

**Dev-DB gotcha hit during this feature (add to gotchas list §7 if it recurs):** migration 0031 had been marked applied in a prior session but had genuinely never run against the DB the dev server was actually pointed at — `source`, `device_type`, and `staff_biometric_enrollments` were all missing despite the ledger looking clean. Verify with `information_schema.columns`/`pg_type` directly rather than trusting a prior session's "migration applied" claim, especially across a session gap.

**Infrastructure note — flag for whenever the business (referenced as "primeGlow" when this note was requested — name doesn't match "Zaiqa" used elsewhere in this doc, worth confirming which name is correct) gets its first real paying customers' money in:** at that point, search for and switch to the closest-but-cheapest available VPS option for hosting, rather than defaulting to whatever was used during dev — minimize infra cost once real revenue exists, don't over-provision on assumption.