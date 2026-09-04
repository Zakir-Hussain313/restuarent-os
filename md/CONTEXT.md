Rice n Spice (Zaiqa) — Context

Single source of truth. Supersedes all prior MASTER_PROMPT/PROJECT_BRIEF/DATABASE_BRIEF/SKILL/session-summary docs.
Last reconciled: 2026-08-29 (session: single-SUPER_ADMIN enforcement, profile-photo self-upload fix, notification scrollbar fix — see §29/§30 bug patterns and §16). Also reconciled later same day: functional testing pass begun — see §18. Further reconciled same day: POS module fully tested and closed, see §18 and Bug Patterns #35-40. Reconciled again 2026-09-01: POS init bundle refactor + production load/scalability testing — see §19. Bug Pattern #40 investigation started, not yet resolved. Reconciled again 2026-09-04: Bug Pattern #40 confirmed obsolete/resolved (online-ordering side also uses real category icons, no hardcoded map found anywhere); full delivery flow rebuilt (auto-print/auto-open bug, orders.status now includes "delivered" as a real DB enum value, realtime gap for SUPER_ADMIN diagnosed, font-loading fix) — see §20. Payment gateway architecture decision made (PayFast, Pakistan) — see §11 update and §21 (new deployment checklist section). Payments DB schema (Phase 1) built same day — payment_status_lifecycle enum, payments table expanded (branchId, provider, status, providerTransactionId, merchantTransactionId, clientPaymentId, terminalId, currency, metadata, initiated/verified/failedAt), new payment_refunds table, migration 0029 — see §22. PaymentService/PaymentProvider/ManualProvider adapter layer NOT yet built — next task. Reconciled again 2026-09-04 (later same-day session): PaymentService/PaymentProvider/ManualProvider code layer BUILT at src/lib/payments/ (not features/payments/ — see §1 folder convention), completeBillAction wired to it with transactional dbClient support, offline cash-payment queueing built (offlinePaymentQueue.ts + OfflineSyncManager.tsx extended, cash-only per Zakir's explicit decision — no offline sync for card/JazzCash/Easypaisa/bank transfer), service worker offline-fallback bug found and fixed (stale cached login page served on offline refresh — see Bug Pattern #48). OPEN, UNRESOLVED at session end: Complete Bill still hangs indefinitely offline despite a 15s withTimeout wrapper — see Bug Pattern #49 and §23. This is the immediate next task for the next session.

1. Role & Process

Act as: Principal Software Architect, Senior Full Stack Engineer, Database Architect, SaaS Engineer, Security Engineer. Not a tutorial generator.

Before writing code: Analyze → Design → Validate (consistency with existing architecture/patterns) → Implement. Keep it tight for simple fixes — don't over-process.

Standing preferences (strict, always apply):

Brief, plain-language explanations. No long paragraphs. No over-explaining.
Code edits as Before/After paste-and-diff blocks, STRICTLY one file at a time — give the diff, stop, wait for Zakir to apply it and report back before giving the next file's diff. Never batch multiple files' diffs into a single response, even for a single cohesive feature that touches several files. Full exact path on every single block. No direct file access.
Ask for all needed files at once, raw PowerShell/commands only, no comments. When multiple Get-Content/Get-ChildItem calls are needed at once, give them as ONE combined multi-line code block, not separate messages.
npx tsc --noEmit is the hard gate for correctness, but Zakir runs it on his own schedule — don't demand it after every single diff; he'll paste the result when he wants to.
File operations: PowerShell only (Get-Content, Get-ChildItem -Recurse -Include, Select-String) — never bash. ** glob does NOT recurse in PowerShell. Paths with parentheses (e.g. "src\app\(dashboard)\...") MUST be quoted in PowerShell or the command fails.
Faster alternative for heavy file-reading sessions (e.g. a full module trace): Zakir can upload a zip of src\ (excluding node_modules) instead of pasting files one at a time via PowerShell. Unzip into scratch space and read directly (cat/grep/find) — this costs no extra tokens for listing/browsing, only for content actually viewed, same as normal. This does NOT change the diff workflow: all code changes are still given as Before/After diffs, one file at a time, for Zakir to paste into his real repo — the zip is a read-only reference copy, never edited directly. Still use live PowerShell commands against Zakir's real repo whenever something needs verifying (confirming current file content before a diff, dead-code grep checks, post-edit confirmation).
DB migrations: hand-written SQL run in Supabase SQL editor only — never drizzle-kit push (previously dropped ~50 live RLS policies). After running hand-written SQL, run npm run db:generate to reconcile the ledger and confirm the generated file matches exactly; do NOT run db:migrate for these.
Middleware lives at src/proxy.ts, not middleware.ts.
Always verify file paths via PowerShell before writing diffs; flag explicitly when a path/value is a guess. Never assume a file's contents or a prop signature — always ask for the file first, even if confident.
Before declaring any file "dead code," verify with a repo-wide grep AND a check for barrel-export re-exports — only call something dead after both checks come back empty.
Production builds: next build --webpack (required for Serwist/service worker). Dev: npm run dev (Turbopack).
Reuse existing types/services/hooks/patterns. Don't introduce competing architectures or rewrite working code unnecessarily.
Give changes as diffs only — never full file rewrites, even when many changes hit one file (exception: this context.md document itself, which is not code). Diffs must be exact Before/After blocks (full replaced text, copy-pasteable) — NOT unified-diff +/- notation. When an entire file is being replaced rather than patched, skip the before/after pair — just give the full replacement content and say "replace your current <filename> with this".
Zakir wants explanations kept as simple and short as possible — this applies to every response, not just code diffs.
When Zakir flags that a stated conclusion is wrong (e.g. "it's not fine, we need it fixed"), don't just soften the wording — actually revisit and fix the underlying issue, and be direct about having been wrong.

2. Product Overview

Production-grade Restaurant Management SaaS, sold to multiple restaurants as a subscription product. Central operational platform for realtime staff collaboration. Not a demo/tutorial.

Tenancy: Deployed per-tenant — each restaurant gets its own dedicated server and dedicated database. Physical isolation, not row-level filtering. tenant_id still present on every entity for portability/reporting.

Roles:

Super Admin — full access: staff, riders, attendance, menu, tables, orders, settings, all-branch analytics, reports, audit logs, POS.
Admin — same as Super Admin but branch-scoped.
Staff — POS, orders, tables, rider assignment, receipts/kitchen tickets, menu availability. No staff management, no settings, no audit logs.
Rider — assigned deliveries only, status updates, delivery history. No POS/menu/settings access.

Core modules — all built: Marketing website, online ordering, dashboard analytics, POS, orders, tables, menu management, receipt printing, staff management, rider management, attendance + clock-in/out, notifications (branch-scoped, 11 types, realtime), reports, settings, audit logs.

Login is always email + password — there is no 4-digit PIN login anywhere. Zakir plans to give staff a desktop .bat shortcut that opens the login page directly; this is not an in-app feature.

3. Database

Stack: PostgreSQL, Drizzle ORM, Supabase (Auth + Realtime + Storage). One dedicated DB per tenant.

31 live tables: attendance, audit_logs, branch_settings, branch_delivery_areas, branches, branch_devices, deliveries, tenants, staff, menu_categories, menu_item_variants, menu_items, modifier_groups, modifier_options, restaurant_tables, table_sections, table_reservations, coupon_branch_allocations, coupons, order_counters, order_discounts, order_items, orders, payments, tenant_settings, reservation_counters, push_subscriptions, notification_reads, notifications, notification_clears.

staff.id = auth.users.id (1:1). Supabase Auth = authentication; staff table = authorization (tenant, branch, role). staff.pinHash column exists in the schema but is NOT used anywhere in the app — login is email+password only, confirmed by Zakir directly.

Key entity notes:

restaurant_tables statuses: available, occupied, reserved, out_of_service.
orders types: dine_in, takeaway, delivery. orders.status enum (migration 0028, 2026-09-04) is now: pending, confirmed, ready_for_delivery, out_for_delivery, delivered, completed, cancelled. Full delivery workflow: confirmed → ready_for_delivery (rider assigned, bill auto-opens for print) → out_for_delivery (rider starts delivery) → delivered (rider marks delivered, Complete Order button enables) → completed (staff completes payment). deliveries.status is a separate, mirrored enum (unassigned/assigned/out_for_delivery/delivered/cancelled) — updateDeliveryStatusAction (features/deliveries/actions.ts) keeps both tables in step on every rider-driven transition. canPrintBill/canCompleteBill in useOrderDetail.ts key off order.status directly, not deliveryStatus, as of this session.
audit_logs stores actor, actor_name (denormalized snapshot). This "set null FK + name snapshot" pattern has now been fully extended across orders.staffId, orderDiscounts.appliedBy, payments.processedBy, coupons.createdBy, attendance.staffId, attendance.loggedBy — see §14 for the full permanent-delete feature this powers.
Notifications system: notifications + notification_reads (per-staff read tracking) + notification_clears (per-staff clear point). Branch-scoped, 11 types covering order/reservation lifecycle, attendance, delivery status, staff/rider creation, audit overrides, device approval.
coupons — discountType (percentage/fixed), discountValue, maxUses (null = unlimited), branchIds (null = all branches), menuItemIds/categoryIds (null = whole order), validFrom/validTo (nullable dates), isActive. Structural fields locked from editing once a coupon has real usage on any branch.
branch_devices — id, tenantId, branchId, deviceToken, status (pending/approved), label, requestedBy, approvedBy, timestamps. Powers the staff/rider clock-in system (see §13).

Migrations: src/db/migrations/, tracked via _journal.json + drizzle.__drizzle_migrations. Latest migrations: 0022 (missing indexes), 0023 (branch_devices + device_status enum), 0024 (branches.latitude/longitude — DEAD/unused, geofencing was cancelled), 0025 (permanent-delete FK/name-snapshot changes — see §14). Always run npm run db:generate after schema changes and confirm the diff before db:migrate (or, for hand-written SQL already run directly in Supabase, confirm generate's output matches exactly and do NOT run db:migrate).

Ledger reconciliation fix pattern (if a migration seems to vanish or generate reports no changes unexpectedly): compare (a) _journal.json entries, (b) actual .sql files on disk, and (c) actual meta/*_snapshot.json files on disk — all three must agree. Also watch for constraint-name drift: a hand-run migration's FK constraint name in the live DB must exactly match what drizzle-kit generate expects (standard pattern: {table}_{column}_{ref_table}_fk), or the ledger will silently record a name the live DB doesn't actually have — rename the live constraint to match rather than letting this drift (hit this on coupons_created_by_fkey vs coupons_created_by_staff_id_fk in migration 0025).

Security & access model:

getSupabaseServerClient() / getSupabaseBrowserClient() — scoped, RLS-respecting, used in the large majority of server actions and all client-side realtime.
supabaseAdmin (src/lib/supabase/admin.ts) — RLS-bypassing, used narrowly in admins/actions.ts, staff/actions.ts, uploads/actions.ts, lib/realtime/broadcast.ts.
RLS is currently inert — all real queries go through Drizzle direct-to-Postgres, bypassing PostgREST entirely. Authorization is enforced entirely by application-code role checks. Real RLS is dedicated V2 work. Every new action must include its own explicit role check.
hasPermission(role, permission) in src/types/staff.ts is the central RBAC check.

4. Engineering Standards

TypeScript: strict, no any, reusable interfaces/types.
Frontend: Next.js (App Router, Turbopack dev), Tailwind, shadcn/ui. Prioritize responsiveness, accessibility, UX, performance.
Backend: PostgreSQL, Drizzle ORM, Supabase Auth/Realtime. Prioritize security, scalability, tenant isolation, validation.
Code quality: modular, strongly-typed, production-grade. No tutorial code, duplicated logic, giant files, weak typing, unnecessary abstractions.
Security: validation, authorization, protected routes, tenant isolation on every write. Never trust client input.

5. Codebase Reference

Stack: Next.js (App Router, Turbopack), TypeScript strict, Tailwind, shadcn/ui, @base-ui/react primitives (Select, Popover, Dialog, AlertDialog), Drizzle ORM, PostgreSQL (Supabase), Supabase Auth + Realtime + Storage, Zustand, TanStack Query (IndexedDB-persisted for offline POS), idb-keyval, Zod, react-hook-form + zodResolver. Windows dev, PowerShell only, VS Code integrated terminal.

Folder structure (feature-based):

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
    relations.ts — NOTE: this is src/db/relations.ts, a single file, NOT src/db/schema/relations.ts
  lib/
    supabase/{server,client,admin}.ts
    realtime/{channels,broadcast,useBranchChannel,channelRegistry}.ts
    rate-limit.ts, env.ts, audit.ts, tenant.ts, deviceToken.ts
  components/
    ui/ — shadcn primitives + date-picker.tsx, time-picker.tsx
    providers/AlertModalProvider.tsx — showAlert/showConfirm, z-index 300 (above notification panel's z-200)
  instrumentation.ts — Sentry init + env validation, runs at server boot
  types/staff.ts — hasPermission(role, permission), core RBAC helper

Core server-action pattern (used across ~22+ actions.ts files):

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

Permanent-delete pattern (new, established this session — see §14 for full detail): for any FK to staff.id that must survive a permanent delete, use onDelete: "set null" + a paired *Name text column populated at INSERT time by every action that creates that row. Before actually deleting a staff row, run a backfill UPDATE ... SET xName = '<name>' WHERE xId = '<id>' AND xName IS NULL across every affected table (inside a transaction), THEN delete the Supabase Auth user, THEN delete the staff row — Postgres auto-nulls the FK once the row is gone. In the UI, whenever a live-linked ID is null but a name snapshot exists, render the snapshot name plus a "Deleted" badge instead of trying to join to a live row. Any query that starts from the live staff table (rather than from the record itself) needs a second query for staffId IS NULL rows merged in, or deleted people's history silently vanishes — this was a real bug caught and fixed in getAttendanceForDateAction and attendanceQueries.ts this session.

Self-edit permission pattern: server actions gated on a manage_* permission (updateStaffAction, updateAdminAction) must separately allow the acting user to edit their OWN row even without that permission — otherwise STAFF/RIDER can never save their own profile via ProfileModal.tsx. Pattern: check `targetId === user.id` and let self-edits bypass the hasPermission() gate, while all other checks (role-change blocks, branch-scoping) still apply normally.

Client-side data pattern: React Query hooks wrap server actions. Mutation hooks call queryClient.invalidateQueries({ queryKey }) in onSuccess; revalidatePath in the server action affects Next's server cache only, client-side React Query cache always needs its own explicit invalidation.

Auth/permission system: Roles SUPER_ADMIN, ADMIN (branch-scoped), STAFF, RIDER. hasPermission() in src/types/staff.ts is the central RBAC check.

Multi-tenancy: one dedicated Postgres DB per restaurant. getTenantId() in src/lib/tenant.ts reads TENANT_ID env var, throws loudly if missing.

Monitoring/protection in place: Sentry (tracesSampleRate 0.1 in production), rate limiting (Upstash Redis) on login/forgot-password/public order creation/public reservations/cron, env validation at server boot, health check endpoint, useBranchChannel.ts shared realtime hook delegating to a ref-counted channelRegistry.ts, pm2 graceful shutdown.

6. Design System (Dashboard/POS/Admin only)

Scope: Dashboard/POS/admin only. Storefront stays on the existing orange brand (#e8570e) — out of scope until Zakir decides otherwise.

Reference: "BISTRO - Restaurant Food Dashboard" — matched exactly.

Primary: deep violet #5B21B6 (default action color throughout). Coral #F97362 — sparing accent only (variant="cta"), not the default action color. Background off-white #F8F7FC, cards white. Generous border radius (rounded-2xl/3xl/full). Font Plus Jakarta Sans.

Design tokens (src/app/globals.css):

--primary: #5b21b6, --coral: #f97362 (separate from --accent, which stays a soft violet hover-tint — deliberate, to avoid breaking existing soft-hover-tint usage across ~100 components).
Radius scale via @theme block (Tailwind v4: --radius-sm through --radius-3xl). @theme is valid v4 syntax — VS Code's CSS linter will false-positive flag it as unknown; silenced via .vscode/settings.json.
Sidebar tokens: violet-on-violet (--sidebar-bg: #5b21b6, white/lilac text).
Button variant variant="cta" (coral) — sparing use. Badge variants chip-violet, chip-coral, chip-blue, chip-green.
No --success/--warning tokens exist (confirmed via grep). Raw emerald/amber colors used for paid/discount/warning-type UI are intentional, not oversights — leave as-is unless Zakir wants these tokens formally added.
destructive/destructive-foreground — real token, used for cancel/danger/unpaid states. Prefer this over raw red wherever applicable.
Global button cursor rule: button:not(:disabled), [role="button"]:not(:disabled) { cursor: pointer; } in globals.css, alongside the pre-existing a { cursor: pointer } rule. Together these cover every real interactive element repo-wide — confirmed via grep, no fake-button <div onClick>/<span onClick> exist except 2 modal backdrop overlays (intentionally left without pointer cursor).
Checkboxes use inline style={{ accentColor: "var(--primary)" }}, not the accent-* Tailwind utility. Switch/toggle computes checked state in JS with literal colors via ternary, not data-attribute Tailwind variants.

Glassmorphism: removed entirely from dashboard/POS scope (backdrop-blur-* stripped from all overlays — dialog.tsx, alert-dialog.tsx, sheet.tsx, and per-feature modals). Overlay dim uses bg-black/50 (not bg-foreground/50, which silently compiled to nothing — see Bug Pattern #1). Storefront decorative blur usages (About badge, Hero badges, Navbar scroll blur) intentionally left alone — out of scope.

confirm()/alert() sweep: complete dashboard-wide. All native confirm()/alert() replaced with showConfirm()/showAlert() from AlertModalProvider (Promise-based showConfirm() added alongside existing showAlert()).

Checkbox groups matching Select theme: where a checkbox list needs to visually match the Select dropdown's design language (used in CouponFormModal.tsx's Branches and Applies-To dish lists), use: outer container rounded-xl border border-input bg-background p-2, each row rounded-lg px-2 py-1.5 hover:bg-primary-light hover:text-primary transition-colors. Keeps native multi-select checkboxes (not a fake dropdown) but gives them Select's visual polish.

Favicon: src/app/icon.svg — violet circle (#5B21B6) with a white flame glyph, matching the sidebar's flame-in-circle motif. Next.js App Router auto-serves this with no config needed.

Attendance auto-renew (src/features/attendance/actions.ts, markAttendanceAction): marking a staff member "present" while they have a genuinely open session from a PREVIOUS day now auto-closes that old session at 23:59:59.999 of its own date before opening today's fresh session, instead of throwing the attendance_one_open_session unique-constraint error. The error path itself was also quieted — pgError code 23505 is an expected/handled business case, not logged to console/Sentry anymore. NOTE: superseded in part by §13 — clockInAction now also uses this same auto-close pattern.

Z-index layers: notification panel portal = z-200; AlertDialog (showAlert/showConfirm) = z-300, intentionally above the notification panel.

Deleted-person badge convention: a small pill, text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive, reading "Deleted", shown next to any name that comes from a *Name snapshot column where the live ID is null. Used in OrderDetail.tsx, AttendanceTable.tsx, CouponRow.tsx.

7. Known Bug Patterns (check these first)

1. Missing manual utility class — grep globals.css before assuming a deeper bug.
2. Service worker caches stale JS independently of .next cache — check DevTools → Application → Service Workers.
3. Native <select>/<input type="time"|"date"> must be replaced with themed Select/TimePicker/DatePicker. DatePicker's value is Date | null, always pass null not undefined when empty.
4. Garbled terminal-paste characters are a display artifact only — files are correct UTF-8, do not "fix."
5. branchId must come from the branchId prop threaded down, not from currentStaff/useAuthStore — breaks silently for SUPER_ADMIN.
6. PowerShell ** glob does not recurse — always use Get-ChildItem -Recurse -Include. Paths with parentheses need quotes.
7. PowerShell regex ≠ JS regex — no \u{...} brace syntax; use .NET-style ranges.
8. "Dead code" needs two-part verification (direct grep + barrel-export check), not one grep.
8b. Grep results can look scary but be benign — a grep matching a similarly-named-but-different file (e.g. OrderListSkeleton.tsx matching an OrderList pattern search) does not mean that file is part of a dead-code chain. Check the actual file path and folder, not just that the pattern matched.
9. @base-ui/react/select's SelectValue doesn't resolve labels for pre-populated values on first render — always pass an explicit children function.
10. Never use date.toISOString().slice(0,10) for a Date→YYYY-MM-DD string — use toDateKey/fromDateKey helpers.
11. accent-primary/accent-* Tailwind utility doesn't reliably apply the custom violet token to native checkboxes — use inline accentColor style.
12. drizzle-kit generate can silently report "no changes" even when DB/schema differ — see §3 ledger reconciliation note. Also watch for FK constraint NAME drift between live DB and what drizzle expects (see §3).
13. Resizing a canvas-style container with absolutely-positioned pixel-coordinate children does not scale children — use CSS transform:scale() on a wrapper, divide pointer-drag deltas by the scale factor.
14. Base-UI Switch's data-checked/data-unchecked attribute-selector classes are unreliable — compute checked state in JS with literal colors instead.
15. A dashboard/admin component can be accidentally left on old storefront orange brand — grep for raw hex literals when something looks off-brand.
16. Service worker (Serwist) must be registered only inside the (dashboard) route tree, never at the root layout.
17. Sentry tracesSampleRate should not be 1 (100%) in production — huge Lighthouse hit, fixed to 0.1.
18. RESOLVED (2026-08-26, corrected/completed 2026-08-27): Runtime RangeError "Maximum call stack size exceeded" in useBranchChannel.ts was caused by duplicate/overlapping channel subscriptions to the same topic (e.g. Tables page + POS TableSelector both mounting useBranchChannel(branchId, "tables", ...) simultaneously) re-entering the reconnect handler before the stack unwound. A shared, ref-counted channel registry — src/lib/realtime/channelRegistry.ts — was created, keyed by topic string. CORRECTION: the 2026-08-26 fix created the registry but useBranchChannel.ts was NOT actually updated to use it — it still ran its own separate duplicate supabase.channel() + reconnect logic, leaving all 7 call sites (AttendanceTable.tsx, RiderDashboard.tsx, useMenu.ts, useNotifications.ts, useRealtimeOrders.ts, TableSelector.tsx, TablesPageClient.tsx) unprotected. Actually fixed 2026-08-27: useBranchChannel.ts rewritten as a thin wrapper delegating to subscribeBranchChannel() from the registry — same external signature, zero changes needed at any of the 7 call sites. Now there's exactly one real channel + one reconnect loop per topic regardless of how many components subscribe.
19. RESOLVED: duplicate restaurant table names within the same branch/section now blocked at the action layer.
20. RESOLVED: createPublicOrderAction never called broadcastChange()/createNotification(). General lesson: any customer-facing/public action path should be checked for the same realtime/notification calls as its staff-facing equivalent.
21. RESOLVED: attendance_one_open_session unique index only checked check_out IS NULL, not also check_in IS NOT NULL, blocking clock-in after an admin-marked absence. General lesson: a hand-written migration index not mirrored in schema.ts is invisible to normal review — check pg_indexes directly when a constraint's behavior seems wrong.
22. Give multiple PowerShell commands as ONE combined multi-line block, not separate messages.
23. NEW (2026-08-28): A query that resolves "who is this" by starting from the live staff table (e.g. inner-joining attendance to staff, or listing staff and left-joining attendance) will silently drop permanently-deleted people from history, even though their *Name snapshot data still exists. Any history/report view must be checked for this pattern — fix is either leftJoin instead of innerJoin, or a second explicit query for the *staffId IS NULL* rows merged in separately. Hit and fixed in getAttendanceForDateAction and attendanceQueries.ts.
24. OPEN, unconfirmed: two dine-in orders (ORD-0118, ORD-0119, Aug 27) have orders.table_id = null while older orders have it populated correctly. Full pipeline (TableSelector → usePosStore → usePosOrder → createOrderAction → getOrderByIdAction → OrderDetail.tsx) was traced and looks correct in current code — unclear if this was a real bug or staff simply not selecting a table those two times. Needs a fresh repro: place a dine-in order, definitely tap a table, check if OrderDetail.tsx (now showing "Placed by") also shows the table correctly.
25. NEW: A live-DB foreign key constraint can drift from what schema.ts declares even without any code change flagging it — audit_logs_actor_id_staff_id_fk was NO ACTION in the live DB while schema.ts said onDelete: "set null". Standard verification query: SELECT conname, conrelid::regclass, confdeltype FROM pg_constraint WHERE confrelid = 'staff'::regclass AND contype = 'f'; — run this whenever a delete/FK-dependent action fails unexpectedly, don't trust schema.ts alone.
26. NEW: Deleting an external resource (e.g. Supabase Auth user) and a DB row in two non-transactional steps means a failure between the two steps leaves partial state on retry. Pattern: treat "not found" on the external-delete step as already-done, not as a blocking error, so retries can complete. Applied to deleteStaffAction and deleteAdminAction.
27. NEW: supabaseAdmin.auth.admin.inviteUserByEmail() ALWAYS uses Supabase's implicit/hash-fragment flow (#access_token=...), never PKCE (?code=...) — this cannot be changed via client or server config, it's a Supabase platform limitation. Hash fragments never reach the server, so the existing PKCE-based /auth/callback route can never process an invite link. Fix: point invite redirectTo directly at /auth/reset-password (not through /auth/callback), and add a client-side effect there that reads window.location.hash, extracts tokens, and calls supabase.auth.setSession(). resetPasswordForEmail (forgot-password flow) is a DIFFERENT Supabase method that DOES support PKCE and correctly still uses /auth/callback — do not change that path to match the invite fix.
28. NEW: Supabase's own Auth dashboard Site URL setting (Authentication → URL Configuration) can override the app's redirectTo parameter entirely for implicit-flow methods like inviteUserByEmail. This is separate from the app's NEXT_PUBLIC_APP_URL env var — both must be correct independently. If invite/magic links go to localhost despite a correct env var, check Site URL in Supabase directly.
29. NEW (2026-08-29): Recent Chrome versions on Windows render scrollbars using native "Fluent Scrollbars" and completely IGNORE all ::-webkit-scrollbar-* CSS (width/color/border/track/thumb — none of it renders, even though DevTools shows the rules as declared and "active"). Confirmed by the flag no longer existing at chrome://flags/#fluent-scrollbars. Firefox is unaffected (uses scrollbar-width/scrollbar-color, which still works). Any future custom-scrollbar styling in this app must NOT rely on ::-webkit-scrollbar-* alone — either accept the native look, use .scrollbar-hide + a JS-drawn thumb (see NotificationBell.tsx for the reference implementation), or test explicitly in current Chrome before assuming a CSS-only fix works.
30. NEW (2026-08-29): A flex child constrained by max-h-* (not a fixed h-*) can collapse to zero height when a sibling inside it uses flex-1 — the flex-1 element has nothing concrete to grow into. If content mysteriously disappears after adding a flex-1 wrapper inside a max-h-*-capped container, switch the container to a fixed h-* instead.
31. NEW (2026-08-29, found during functional testing): Supabase's implicit-flow link verification redirects back with #error=...&error_code=...&error_description=... when an invite/reset link is expired or invalid — NOT with #access_token=.... Any client-side hash-parsing effect (e.g. reset-password page.tsx) that only checks for access_token will silently fall through on an expired link, showing a normal form instead of an error. Always check for error/error_code in the hash first, before checking for access_token.
32. NEW (2026-08-29, found during functional testing): Sidebar.tsx's avatar never actually rendered currentStaff.image at all — it unconditionally rendered initials only. Not a stale-cache bug (ProfileModal showed the photo fine via its own local state) — the sidebar simply never had the image-render branch built. Lesson: when a value updates in one place but not another, check whether the second place even has the render path before assuming it's a cache/invalidation issue.
33. NEW (2026-08-29, found during functional testing): Sidebar's <nav> had overflow-y-auto with no explicit overflow-x — per spec, setting overflow-y to anything but visible while overflow-x is left default computes overflow-x to auto too, silently creating a horizontal scrollbar. Always pair overflow-y-auto with an explicit overflow-x-hidden unless horizontal scroll is actually wanted.
34. RESOLVED (2026-08-29): TablesTab.tsx's "Reset to Default" (seating edit mode) didn't visually update the floor plan until Save was clicked. Root cause: TableFloorPlan.tsx's resolveChairLayout(table, ...) checked table.chairLayout (the server-stored value, unchanged by Reset) before falling back to getDefaultChairLayout — Reset only cleared the local seatOverrides state, so render fell through to the still-populated server value. Fixed: on resetSignal change, seatOverrides is now populated with the actual computed default layout per table (bypassing table.chairLayout entirely), so Reset shows true defaults immediately. Sofa-type tables excluded from this (their rendering already always computes the default directly).

35. NEW (2026-08-29, POS functional testing): An async action guarded by a ref (e.g. isSubmittingRef.current = true to block double-submit) must reset that ref on EVERY exit path, including early-return validation failures — not just in a try/finally around the main logic. usePosOrder.ts's placeOrder set isSubmittingRef.current = true, then returned early on delivery-validation failure without resetting it, permanently blocking all future submit attempts (silently — no loading state, no error) until page reload. General lesson: grep any isSubmittingRef.current = true assignment for every return path below it.

36. NEW (2026-08-29, POS functional testing): A store action's TypeScript interface can declare more parameters than its implementation destructures, and this compiles cleanly with no error — object shorthand silently uses whatever name the shorter param list gave it. usePosStore.ts's setCustomer: (id, name, phone) => void interface vs setCustomer: (customerId, customerPhone) => set({ customerId, customerPhone }) implementation meant name was always dropped and phone was never actually stored under the right field. Caught only because nothing currently calls it — would have been very hard to catch once a real caller existed. General lesson: always cross-check an interface's param count against its arrow-function implementation's destructured param count, especially for store actions.

37. NEW (2026-08-29, POS functional testing): React Query's invalidateQueries({ queryKey }) uses partial-prefix matching — every element in the provided key array must match the cached query's key at that position, INCLUDING undefined. If the real cached key is ["orders", scopeStatuses, dateFrom, dateTo] and scopeStatuses is an array (not undefined), invalidating with ["orders", undefined] silently matches nothing — no error, invalidation just no-ops. Fix: invalidate with the shortest reliable prefix (e.g. ["orders"] alone) so it matches every variant of that query regardless of filter params. Check this pattern anywhere a realtime handler calls invalidateQueries with a key that includes literal undefined placeholders.

38. NEW (2026-08-29, found live in production by Zakir): A form gated on isLoading || isProcessingInvite (or similar) re-enables once processing finishes, even if processing finished BECAUSE of a fatal error (e.g. expired/invalid invite link) — showing only a warning banner while inputs and submit stay fully interactive. This let a password-update submit go through using whatever session was already active in that browser (not the intended invited account), silently overwriting the wrong user's password. Fix: track invalid/fatal-error state as its own separate boolean, and fully hide/disable the form (not just show a warning) whenever it's true, with a defensive early-return at the top of the submit handler too. General lesson: "processing finished" and "processing succeeded" are different states — never conflate them for enabling a destructive form action.

39. RESOLVED (2026-08-29, POS functional testing — significant, app-wide): No variant or modifier selection UI existed anywhere in the app (POS or online ordering) — both MenuItemCard.tsx files called addItem(item) directly with no selectedVariant/selectedModifiers, despite MenuItem.variants and .modifierGroups existing on the type and being fully editable by admins. Effect: any item with priced variants always charged at item.basePrice (wrong price charged — a money bug), and modifier groups (e.g. "extra cheese") could never be applied from either surface. Fixed: built a shared features/menu/hooks/useItemOptions.ts hook (variant/modifier selection state, price calc treating variant.price as absolute — converted to a priceAdjustment via variant.price - item.basePrice to fit both cart stores' existing math, min/max-selection validation for required groups) plus two themed ItemOptionsModal.tsx components (POS: features/pos/components/MenuPanel/, violet theme; online ordering: features/online-ordering/components/, orange theme). Both MenuItemCard.tsx files now open the modal when item.variants.length > 0 || item.modifierGroups.length > 0, else add directly as before. Confirmed working on both surfaces.

40. RESOLVED 2026-09-04 — confirmed obsolete, not a real bug. Searches for CATEGORY_ICON and cat_00 returned zero matches anywhere in the codebase. The online-ordering side (order/page.tsx) builds categoryIconMap the same correct way as POS: new Map(categories.map((c) => [c.id, c.icon])), passed into MenuItemCard.tsx as categoryIcon. Both POS and online-ordering use real admin-entered category icons. No fix needed — original bug description no longer matched reality.

41. NEW (2026-09-04): Calling setState synchronously inside a useEffect body (e.g. to auto-open a modal once, tracked via a ref/state guard) triggers React's "cascading renders" warning even when functionally correct. Fix: compute the "should this be open" condition as a plain derived value at render time instead of an effect (e.g. const autoOpen = condition && dismissedFor !== id), and pass that directly to the component's open prop — no useEffect, no setState-in-effect. Applied to OrderActions.tsx's bill-auto-open logic.

42. NEW (2026-09-04): A component's own internal autoPrint effect (e.g. BillModal.tsx auto-printing on open when passed autoPrint=true) can fire unwanted side effects (opening a new print-preview tab) at the same time the parent auto-opens the modal for a different reason (letting the user review the bill first). These are two separate concerns — "should the modal open automatically" and "should printing fire automatically" — and must be controlled by two separate props/values, not conflated. Fixed by hardcoding autoPrint={false} on BillModal when only auto-open (not auto-print) was wanted.

43. NEW (2026-09-04): orders.status is a live Postgres enum (order_status via pgEnum) — adding a new value requires a hand-written ALTER TYPE ... ADD VALUE ... AFTER '...' SQL migration run directly in Supabase SQL editor (not drizzle-kit push), then reconciling both enums.ts and the migration ledger (_journal.json + a matching row in drizzle."__drizzle_migrations"). Added "delivered" this session (migration 0028) — see §20 for full detail. General lesson: always check whether a status/type field is a real DB enum (grep schema/enums.ts) before assuming a TypeScript-only type change is sufficient.

44. NEW (2026-09-04): useBranchChannel(branchId, ...) silently no-ops (does not subscribe, no error, no warning) whenever branchId is falsy. Any hook built on top of it (useRealtimeOrders.ts, useNotifications.ts) that derives branchId from currentStaff?.branchId will silently never receive realtime updates for SUPER_ADMIN accounts, since SUPER_ADMIN has branchId = null by design (not scoped to one branch). Confirmed working correctly for ADMIN/STAFF (real branchId present). Zakir's explicit call: SUPER_ADMIN does not need live notifications: NOT fixed, left as a known/accepted limitation. If SUPER_ADMIN-side realtime is ever needed, this hook would need an explicit branchId param sourced from whatever branch context SUPER_ADMIN is currently viewing, not from their own staff row.

45. NEW (2026-09-04): next/font/google's display: "optional" tells the browser to use the custom font ONLY if it's already cached/loaded before first paint — otherwise it permanently falls back to a system font for that entire page load with no later swap. This caused Plus Jakarta Sans to intermittently fail to render specifically for SUPER_ADMIN (whose pages tend to fetch more data, missing the narrow load window more often) while rendering fine for ADMIN. Fixed: changed both font configs in src/app/layout.tsx from display: "optional" to display: "swap", which shows a fallback font briefly then swaps in the real font once loaded, guaranteeing it always eventually renders.

46. NEW (2026-09-04): RLS being "inert" (per §3) is not absolute — a hand-added RLS policy CAN still silently block an UPDATE with zero rows affected and no thrown error, IF the query runs through a client that respects RLS. This was initially misdiagnosed as the cause of orders.status not persisting a rider's delivery-status change (added an RLS policy that turned out to be unnecessary, since src/db/index.ts's Drizzle client connects via a direct pooled Postgres connection, not through Supabase's RLS-respecting REST/client layer — confirmed via checking DATABASE_POOL_URL usage). The real root cause was simpler: the orders.status enum was still missing the "delivered" value entirely (see Bug Pattern #43) — the code was correct but the DB type didn't support the value being written. General lesson: before assuming RLS is the blocker, check which Postgres client/connection path the actual write goes through (service-role/direct connection bypasses RLS regardless of policies).

47. NEW (2026-09-04): A hand-run Postgres migration recorded only in _journal.json (not via db:generate) leaves drizzle-kit's snapshot metadata unaware of the change, so the NEXT real db:generate run will re-detect and re-emit that same change as if it were new (e.g. migration 0028's hand-run ALTER TYPE ... ADD VALUE 'delivered' resurfaced inside migration 0029's auto-generated file). Fix: manually strip the duplicate/already-applied statement from the newly generated file before treating it as the historical record — never re-run a duplicate ALTER TYPE ADD VALUE, Postgres will error. General lesson: after any hand-run SQL + journal entry, the NEXT db:generate should be checked line-by-line against what's actually already live, not assumed clean.

48. RESOLVED (2026-09-04): Serwist's defaultCache runtime caching, when a document/page fetch fails while genuinely offline, falls back to whatever HTML happens to be cached under a matching route — including a stale login page cached from before the user logged in. This looked like an app-level redirect to login (it wasn't — the request never reached src/proxy.ts middleware at all, since the service worker intercepted it first). Fixed in src/app/sw.ts: added a dedicated /offline fallback page (src/app/offline/page.tsx) via Serwist's fallbacks.entries + PrecacheFallbackPlugin, and forced every protected route (dashboard/pos/orders/tables/menu/staff/attendance/settings/audit-logs/admins/branches/riders/reports) to NetworkOnly so their HTML is never cached at all — only /offline is ever shown when one of these fails offline. Also added a one-time cache.delete("pages") in the activate event to purge any already-bad cached HTML from before this fix. General lesson: authenticated/protected page HTML should never be cache-eligible in a service worker — only public/static content should be.

49. OPEN, UNRESOLVED (2026-09-04, end of session): completeBillAction (via useOrderDetail.ts's mutateCompleteBill) still hangs indefinitely when offline, even after wrapping the call in withTimeout(..., 15000) (src/lib/withTimeout.ts, same utility already proven working in usePosOrder.ts's placeOrder). User confirmed waiting 15+ seconds with no timeout/queue behavior triggering. Root cause NOT yet found. Leading unconfirmed hypothesis: the service worker's own JS-asset caching (static-js-assets/next-static-js-assets rules) may still be serving a stale bundle from before the withTimeout extraction/rewiring, if the SW wasn't fully unregistered/updated between test rounds — verify the actually-served JS in DevTools before looking elsewhere. If ruled out, check whether completeBillAction (a Next.js Server Action) behaves differently under a dropped connection than a plain fetch — it may never actually reject/settle the promise the same way, meaning Promise.race-based withTimeout might not be sufficient and a different cancellation mechanism (e.g. AbortController) may be needed. NEXT SESSION: reproduce fresh, confirm SW version/bundle first, then investigate Server Action timeout behavior specifically before changing more code.

8. Current State — What's Done vs. Remaining

Confirmed done (do not re-convert unless a new bug is found)

features/tables/* — multi-floor/section tabs added to TablesTab.tsx (was single shared canvas). Section actions (edit/delete) via DropdownMenu below tabs. Auto-placement on table creation (getNextPlacement), "Place N on floor" bulk-arrange for legacy unplaced tables.

Table color: real wood-tone palette (oak/walnut/mahogany/espresso/cherry/ash), 6-swatch picker in TableDialog.tsx, TABLE_COLOR_STYLES/getTableColorStyle() in table-status-styles.ts. Status changed from occupied-only pulsing dot to an always-visible small corner dot for all 4 statuses.

TableFloorPlan.tsx: real shapes (sharp corners on square/rectangle, rounded on circle/oval), capacity-based tile sizing, blueprint grid background, container-width-responsive canvas, optimistic drag-to-reposition. Chairs are real top-view SVG shapes, shape-aware placement (rectangle = long sides only, square = round-robin all 4 sides, circle/oval = radial), fixed per-side rotation angle.

Chairs/Sofa seating feature (migration 0020): seatingType ("chairs"|"sofa") + chairLayout (nullable jsonb, relative {dx,dy,angleDeg} per seat, travels with the table on reposition). Action updateTableChairLayoutAction(id, layout|null). TablesTab.tsx has an "Edit Seating" mode (disables table click/drag, makes chairs individually draggable, explicit Save Seating click, Cancel and Reset to Default). Sofa rendering: square/rectangle = one bench per occupied side with backrest stripe + seams; circle/oval = SVG elliptical arc band. Sofa seating fully built and confirmed: configurable entrances/gaps via sofaLayout jsonb (migration 0021), max 3 sides selectable (openSides for square/rectangle, gaps for round), checkbox-dropdown UI in TableDialog. Tuned values in TableFloorPlan.tsx: SOFA_THICKNESS=34, SOFA_LENGTH_EXTRA=32, STRAIGHT_SOFA_GAP=10, backrestThickness=14. No known open issues.

features/staff/* — staff-table.tsx full redesign; add-staff-dialog.tsx forms pass done, Branch-select UUID bug fixed. Delete button added this session (§14).
features/reports/* — all 4 report views redesigned to dashboard stat-card style.
features/menu/* — fully converted, hand-rolled confirm modals replaced with showConfirm(). Forms pass done on CategoryFormModal.tsx and ItemFormModal.tsx. Category/Status Select UUID bugs fixed. ItemCard.tsx redesigned: image-forward layout (full-width top image block h-36, icon actions as floating white chips over image top-right, name + prominent price below, variant pills, status toggle). ItemsPanel.tsx grid: grid-cols-2 lg:grid-cols-3. Menu page branch-filter repositioning turned out to be a non-issue — filter was already correctly placed inline in ItemsPanel.tsx's header next to Add Item. Only the category-to-pills conversion (CategoryPillBar.tsx, long-press manage modal) was new work.
features/coupons/* — CouponFormModal.tsx full redesign: forms pass, checkbox groups restyled to match Select theme, checkbox accent-color fixed, Discount Type Select UUID-fixed, DatePicker timezone bug fixed + past-date disabling added. "Created by" display added this session (§14).
features/operating-hours/* — colors fixed; custom TimePicker built.
features/reservations/ReservationsTab.tsx (admin-side) — already token-based.
features/pos/* — design conversion done; CouponPicker/TableSelector branchId-prop bug fixed (Bug Pattern 5). Forms pass done on TableSelector.tsx, MenuSearch.tsx, DeliveryDetailsForm.tsx. RiderSelector.tsx Select UUID bug fixed. ClockButton.tsx added (§13). Full Phase 1 functional testing pass completed 2026-08-29 — see §18 and Bug Patterns #35-40. Fixed this session: usePosOrder.ts submit-freeze on delivery-validation failure (#35), usePosStore.ts setCustomer param-drop bug (#36, currently unused/no live caller), useRealtimeOrders.ts invalidation key mismatch causing new orders to not appear live in Active Orders (#37), CouponPicker.tsx reconnect not refreshing actual coupon data (only flipped a status flag). Variant/modifier selection gap fixed app-wide, see #39 (new shared features/menu/hooks/useItemOptions.ts, new ItemOptionsModal.tsx in both features/pos/components/MenuPanel/ and features/online-ordering/components/). RiderSelector.tsx converted from one-time fetch to useQuery + useBranchChannel("riders") realtime subscription, matching TableSelector.tsx's pattern. New shared components/ui/collapsible-section.tsx built; TableSelector.tsx and CouponPicker.tsx both wrapped in it to stop the table/coupon sections from pushing cart items out of view on dine-in orders (collapsed by default once a selection exists). CartItemList.tsx's nested flex-1/overflow-y-auto removed (was double-scrolling against CartPanel.tsx's own outer scroll container). Confirmed-dead CustomerTypeSelector.tsx deleted (superseded by OrderTypeSelector.tsx, zero live references). Open, not yet fixed: MenuItemCard.tsx's hardcoded CATEGORY_ICON placeholder-ID map (#40) — investigation started 2026-09-01, see Bug Pattern #40 correction and §19.

POS init bundle refactor (COMPLETED 2026-09-01, see §19 for full detail): new features/pos/actions.ts (getPosInitBundleAction — one auth-resolving server action replacing ~8 separate ones on POS mount) and features/pos/hooks/usePosInit.ts. usePosMenu.ts, TableSelector.tsx, CouponPicker.tsx, CartPanel.tsx, PosLayout.tsx, pos/page.tsx all updated to consume the seeded bundle instead of fetching independently. TableSelector/CouponPicker retain their own runtime behavior (realtime invalidation, offline ledger sync, dropdown-open re-fetch) untouched — only their initial-mount fetch was replaced.
features/delivery-areas/* — hex-color fixes applied, confirmed clean. Forms pass done on DeliveryAreaFormModal.tsx. BranchSelector.tsx Select UUID bug fixed.
features/settings/* shell — confirmed clean. SettingsBranchFilter.tsx Select UUID bug fixed.
features/orders/* — fully done. OrderActions.tsx Payment Method Select UUID bug fixed. "Placed by"/"Applied by"/Payments section added this session (§14).
  Live components (confirmed clean): OrderCard.tsx, OrderStatusBadge.tsx, OrderDetail.tsx, OrderActions.tsx, RiderAssignment.tsx, BillModal.tsx, KitchenTicketModal.tsx, CancelConfirmModal.tsx, OrderHistoryLayout.tsx, OrderHistoryTable.tsx, OrderHistoryFilters.tsx, useOrderHistoryTable.tsx.
  Confirmed dead code — DELETED: OrdersLayout.tsx, OrderList/OrderList.tsx, OrderList/OrderListHeader.tsx, OrderList/OrderRow.tsx, OrderList/OrderStatsBar.tsx, OrderFinancials.tsx, OrderItemsTable.tsx.
  Not dead: src/features/orders/shared/OrderListSkeleton.tsx — different, live file, imported by both real Active Orders/Delivery pages.
features/admins/* — AdminDialog.tsx forms-pass false-positive confirmed (hidden file input only); Role/Branch/Status Select UUID bugs fixed. Delete button added §14 session. Single-SUPER_ADMIN enforcement added 2026-08-29 session — see §16.
features/uploads/* — actions.ts confirmed clean apart from one bug (fixed 2026-08-29, see §16): staff avatar upload had no self-upload bypass, blocking STAFF/RIDER from setting their own profile photo.
features/dashboard/* — DashboardBranchFilter.tsx Select UUID bug fixed. Dashboard bundle refactor (resolveDashboardAuth + compute* functions + getDashboardBundleAction) — completed in a later session.
features/audit-logs/* — AuditLogFeed.tsx forms pass done (2 native selects → themed Select) plus sentinel-value fix for clearing filters.
components/ui/time-picker.tsx, components/ui/date-picker.tsx — both done; date-picker.tsx exports toDateKey/fromDateKey helpers (Bug Pattern 10).
select.tsx primitive restyled. Global cursor-pointer on links AND buttons.
Offline POS: enqueue-on-failure, OfflineSyncManager, kitchen ticket iframe printing, DataCloneError fix.
Emoji → lucide-react icon sweep — done: about/page.tsx, CustomerTypeSelector.tsx/OrderTypeSelector.tsx (also fixed a real ORDER_TYPES/CUSTOMER_TYPES mismatch), HeroSection.tsx, KitchenTicketModal.tsx, checkout/page.tsx, RiderDashboard.tsx, CategoryRow.tsx/CategorySidebar.tsx, MenuGrid.tsx, MenuItemCard.tsx (POS + online-ordering), CouponPicker.tsx, WebsiteFooter.tsx, CategoryTabs.tsx. Intentionally left as-is: CategoryFormModal.tsx placeholder 🔥 (admin-entered custom emoji field, Zakir's explicit call).
Forms consistency pass — fully closed out. All 11 originally-flagged files done.
Select-shows-UUID-instead-of-label bug — fully swept and fixed. 13 files (Bug Pattern #9).

Full responsiveness audit per screen — DONE (completed 2026-08-24), all screens confirmed: Dashboard, Sidebar (mobile/tablet overlay, auto-close <1024px), POS (3-tier MenuPanel/PosLayout/CategoryPills), Orders (mobile push pattern, list↔detail), Tables (TableFloorPlan.tsx rewritten to CSS transform:scale() on native 900x600 canvas, custom CanvasScrollbar.tsx), Menu (branch filter already inline; CategorySidebar → CategoryPillBar.tsx below lg:; MenuStatsBar.tsx horizontal-scroll; item grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3), Staff (card grid responsive; ItemFormModal.tsx overflow-hidden fix), Attendance (filters flex-wrap, table overflow-x-auto), Settings (SettingsTabs.tsx horizontal-scroll, OperatingHoursForm.tsx stacks on mobile, WebsiteBranchSelector.tsx real message instead of null when <2 branches), Reports (ReportsTabs.tsx horizontal-scroll, stat grids retiered, MenuPerformanceReportView rows stack on mobile), Reservations (confirmed clean), Audit Logs (confirmed clean), Notifications (NotificationBell.tsx → full-width bottom sheet on mobile <640px). Also fixed: Safari iOS toolbar overlap — h-screen replaced with h-dvh on DashboardShell.tsx, Sidebar.tsx, (dashboard)/pos/page.tsx.

Deployed to Vercel (region matched to Supabase, both Mumbai). A real Supabase secret key committed to .env.example was caught by GitHub push protection before reaching the remote; placeholder substituted, key rotated as a precaution.

Realtime: Supabase Realtime (broadcast-only, empty-signal pattern) wiring across Orders, Tables, Riders, Attendance, Menu Availability, Notifications — all confirmed complete. Sidebar toast + sound notification layer is a possible next piece.

Also open: kiosk printing resolution (Chrome --kiosk --kiosk-printing reliability; fallback = local print daemon), POS offline Layer 4d pending-orders nav badge.

Offline coupon design (finalized): equal split of maxUses across branches at creation time (coupon_branch_allocations), never recalculated. No Realtime-based token sync — calculated on POS load, cached alongside menu. No weighted splits, no reconciliation/overshoot logic (structurally impossible to overshoot by design). .catch() on CouponPicker fails closed pending real offline (IndexedDB-cache) behavior.

Staff/rider clock-in + device approval system — DONE, see §13 for full detail.
Permanent delete for staff/rider/admin — DONE, see §14 for full detail.
Single-SUPER_ADMIN enforcement — DONE, see §16 for full detail.
Notification bell scrollbar — DONE (final fix: custom JS-drawn thumb, native scrollbar hidden — see Bug Pattern #29 for why).
Profile-photo self-upload permission — DONE, see §16.

V1-blocking remaining items (unchanged, still top priority): database backups (pg_dump via GitHub Actions) — not started, highest priority. Migration script from prior POS systems — not started, top priority once backups done. TableFloorPlan.tsx and RevenueChart.tsx lazy-loading via next/dynamic — done (minor speed win, route-splitting already isolated them).

9. V1 Production-Readiness Checklist

Security — ✅ done. Env validation (Zod, src/lib/env.ts) confirmed solid. Full-app security audit done 2026-08-26.
Scalability — ✅ done. Indexes added (migration 0022: staff, restaurant_tables, table_sections, menu_categories, menu_items, menu_item_variants, modifier_groups, modifier_options). getOrdersAction fixed 2026-08-26 — was fetching entire tenant order history unbounded on every load; now server-side filtered by status/date, capped at 500 rows (MAX_ORDERS_RETURNED).
Responsiveness/UI/UX — ✅ done. Full per-screen audit completed 2026-08-24 (see §8). Also fixed: Switch/toggle was effectively invisible (Bug Pattern #14), PosSettingsForm.tsx was off-brand orange (Bug Pattern #15).
Speed — ✅ done, Lighthouse-verified. Sentry tracesSampleRate fix (100%→10% in production) took the storefront homepage from a 26 to an 86 Lighthouse Performance score under Slow-4G/low-end-phone throttling (Bug Pattern #17). Serwist SerwistProvider was never actually mounted anywhere, meaning offline POS caching was non-functional until fixed — confirmed registered/scoped to (dashboard) only (Bug Pattern #16).
Migration script (import from prior POS systems) — not started. Top priority once backups are done; this is the main blocker to onboarding a restaurant off an existing system.
Database backups (pg_dump via GitHub Actions) — not started. Single highest-priority remaining item before accepting any real restaurant's production data.
Known open bugs before first real customer: none blocking — useBranchChannel RangeError (#18), duplicate table names (#19), createPublicOrderAction missing broadcast (#20), attendance_one_open_session (#21) all resolved. Bug Pattern #24 (dine-in table_id null) is open but unconfirmed as a real bug.

V2 (post-V1): Database backups if not done by V1 cutover, RLS (real implementation, see §3), subscription/payment enforcement (offline-aware grace period), multilingual/i18n, deployment/control-plane dashboard, own/dedicated Supabase instance per tenant, Redis caching (deferred — current perf numbers don't justify invalidation-bug risk yet).

10. Roadmap (condensed)

Priority order across all versions: security → reliability → performance → UX → real customer demand → business value. POS staff must never be burdened with admin-level work (inventory, purchasing, analytics) during service.

V1 (current): website, multi-branch, reservations, full RBAC, dashboard analytics, POS (offline-first), coupons, orders, attendance + clock-in/device-approval, permanent staff/admin delete, staff mgmt, audit logs, menu/table mgmt, realtime, notifications, reports/printing, subscription blocking, security (RLS deferred), backups, deployment/control plane, FBR + payment gateways (Pakistan launch).
V2 — Inventory & Business Mgmt: ingredient/stock system, receiving/adjustments/transfers, recipe/BOM auto-deduction, food costing, supplier/purchasing, wastage/expense tracking, profitability reporting, CRM (profiles, loyalty, feedback, campaigns).
V2 — Payments: provider-adapter architecture (never hardcoded), full payment status lifecycle, webhook-driven, refunds, reconciliation, cash drawer/shift tracking, multi-jurisdiction tax engine, per-country local payment gateway integrations.

International readiness (V2, full scope) — Pakistan, Australia, France, Spain, Germany all targeted, rollout order Pakistan → Australia → France/Spain/Germany:
- i18n: translation keys, RTL where applicable, locale formatting (dates/numbers/currency).
- Multi-jurisdiction tax engine: correct tax rules per country/region.
- Local currency handling.
- Locally-compliant receipt/invoice formats.
- Local payment gateway support.
- Legal/data-residency/privacy compliance per country (e.g. GDPR for France/Spain/Germany) — requires explicit legal research per country, not just engineering work.
- Business licensing/registration requirements per country — informational only, verified with local counsel/authorities, not something the app can "build."
- Never claim a country is compliance-ready without verifying current local legal/tax/licensing requirements at build time.

Legal eligibility gate (non-engineering, must be done by Zakir before operating in a given country):
1. GDPR-compliant Privacy Policy + Terms of Service drafted (lawyer or compliance service, e.g. Termly/iubenda).
2. Business entity registered in home country; local business/tax registration (VAT/GST) completed per country once trading there.
3. Payment provider (e.g. Stripe) application approved for each target country.
4. Data export + account deletion features built once policy requirements are known (engineering work, gated on step 1).
Only once all four are done for a given country should Zaiqa be described as eligible to operate there — engineering readiness (i18n/tax engine/payments adapter) alone is NOT sufficient.

V3 — Analytics/Intelligence: forecasting (always with confidence intervals), smart inventory, menu intelligence, staff analytics (privacy-conscious), KDS, delivery optimization, waitlists, QR/table ordering, third-party integrations via adapter pattern.

Business notes: founding-customer discounts for early adopters only, not permanent pricing. Migration program scoped to what old systems can actually export. Feedback triage: Critical (security/data-loss) → High (multi-restaurant demand) → Medium → Low → Reject/defer.

## Session Update — 2026-08-26 (historical record)

- Duplicate table names blocked at action layer (features/tables/actions.ts).
- POS TableSelector.tsx groups tables by section.
- useBranchChannel RangeError fixed via channelRegistry.ts (full detail: Bug Pattern #18).
- Dynamic-import bug fixed in createOrderAction's transaction — was doing `(await import("@/db/schema")).menuCategories` on every order instead of a top-level import.
- Public reservation endpoints rate-limited: publicReservationRateLimit (10/10min), reservationLookupRateLimit (5/min), both keyed by IP.
- Missing indexes added — migration 0022_slippery_ultragirl.sql.
- Orders architecture fixed — getOrdersAction had no date/status filtering and no limit, fetching entire tenant order history with full nested relations every 60s and on every realtime event. Fixed: GetOrdersFilters { statuses?, dateFrom?, dateTo? }, capped at 500 rows; useOrders.ts/useOrderHistory.ts pass real filters through instead of client-side filtering.
- Dashboard bundle refactor was IN PROGRESS at this point (resolveDashboardAuth + compute* functions + getDashboardBundleAction) — since completed, see §8.

11. Compliance & Payments — Pakistan launch (part of V1)

Zero FBR integration exists yet. Requires: restaurant's own FBR POS Integration registration, live invoicing API call per sale returning a QR code for the receipt, per-tenant sandbox→production credentials, new DB fields for invoice/response/sync/retry. Rough estimate 2-4 weeks, possibly longer.

Payment gateways (JazzCash, Easypaisa, card, Raast): decision made 2026-09-04 — use PayFast (gopayfast.com), an SBP-licensed PSP since 2021, as a single aggregator bundling JazzCash, Easypaisa, cards (Visa/Mastercard/UnionPay/PayPak), and Raast under ONE merchant account/API per restaurant. Chosen over Simpaisa (PSO license still filed/pending, not yet granted) specifically for the confirmed-licensed status and Raast P2M support. Each restaurant owner signs up for their own PayFast merchant account (PayFast supports individuals/unregistered businesses too, not just registered companies) at https://getstarted.apps.net.pk/signup, gets Merchant ID + Merchant Key + Passphrase, which get set as that restaurant's env vars — zero core code changes needed per restaurant, matches the existing TENANT_ID-per-deployment pattern. Sandbox credentials are issued only after signup review/approval (no instant self-serve sandbox like Stripe) — contact info@gopayfast.com / +92 21 37132793 if stuck. Typical MDR: wallets ~1.5-3%, cards ~2.5-3.5%, Raast usually <1%, no setup/monthly fee, settlement T+1. Stripe explicitly moved to V2 (international only — AU/FR/ES/DE — does not work in Pakistan). Architecture: provider-agnostic PaymentService + PaymentProvider adapter interface (per spec — see full spec pasted into session 2026-09-04), never hardcoded to one gateway. Manual payment recording (cash/card/bank — staff notes payment method, no automatic verification) is Phase 1, buildable and testable today with zero external credentials. Real PayFast adapter is Phase 3, built once sandbox creds arrive. Do NOT fabricate a fake PayFast API in the meantime — build the abstraction + manual-payment flow and leave the adapter slot ready. Phase 1 DB schema completed 2026-09-04 — see §22. PaymentService + PaymentProvider interface + ManualProvider adapter (the actual code layer) COMPLETED 2026-09-04 (later same-day session) — see §23. completeBillAction is wired to it. Offline behavior decision (Zakir, explicit): NO offline sync/queue for card/JazzCash/Easypaisa/bank transfer — those stay disabled in the UI while offline, full stop. Cash payments DO get an offline queue (mirrors the existing offline-order pattern) since cash doesn't need gateway verification. See §23 for full detail and an OPEN unresolved bug.

Architecture decision: CNIC/NTN and gateway API keys stored as encrypted columns in the tenant's own DB, never in .env files. FBR/payment integration is an opt-in module per restaurant.

12. Business plan — Quetta launch via sales agents

Selling door-to-door via hired sales agents. Finalized pricing framework: Small Cafe (1 branch) PKR 90k-130k upfront / 6k-8k monthly; Medium Restaurant PKR 130k-190k / 8k-11k; Large/High-Volume PKR 190k-260k / 11k-15k; Medium Multi-Branch (2-3) PKR 220k-300k / 14k-18k; Large Multi-Branch (4+) PKR 320k-450k+ / 20k-28k+.

Sales positioning: dedicated per-tenant infrastructure + ongoing service model (installation, onboarding, training, maintenance, monitoring) as differentiators.

Two hard blockers before onboarding real paying customers: DB backups, migration script from prior POS systems.

Deliverables wanted from a future session: full user manual, finalized pricing sheet, Zaiqa-to-restaurant service contract, Zaiqa-to-sales-agent contract, sales training material — need real lawyer review before use.

13. Staff/rider clock-in + device approval system (built 2026-08-27/28, fully tested)

Branch-level device approval (not per-staff) — restaurants commonly share one POS terminal across staff. Location/geofencing was built then explicitly removed; device approval alone is the anti-cheat layer.

Schema: branch_devices (migration 0023) — deviceToken (localStorage UUID via src/lib/deviceToken.ts), status (pending/approved), requestedBy/approvedBy. New notification type device_pending_approval. branches.latitude/longitude (migration 0024) is DEAD/unused — geofencing cancelled, columns left in place, not worth a migration to remove.

Backend (src/features/attendance/actions.ts): clockInAction(deviceToken), clockOutAction(), getMyClockStatusAction(). markAttendanceAction no longer auto-sets checkIn/checkOut — status and real clock times are fully decoupled now.

Backend (src/features/devices/actions.ts): getBranchDevicesAction, approveDeviceAction — gated on manage_attendance permission.

Frontend: ClockButton.tsx (POS, STAFF role only, in CartPanel header), RiderDashboard.tsx (replaced the old availability Switch with the same clock in/out pattern), AttendanceTabs.tsx (Attendance / Devices toggle on the attendance page), DevicesPanel.tsx (approve pending devices).

Known/accepted limitation: an approved device works from anywhere, not just the restaurant — deliberate simplification, Zakir's call.

Testing: all core flows confirmed working. Rider clock-out flow (isAvailable=false, disappears from RiderSelector, signs out) was not explicitly re-confirmed after the last fix — worth a final check if touching this area again.

14. Permanent delete for staff/rider/admin (COMPLETED 2026-08-28)

Problem: deactivate (status="inactive") already existed and still works, untouched. Zakir wanted a TRUE permanent delete — auth user + staff row actually removed — while historical records (orders, attendance, payments, discounts, coupons) still show the deleted person's name plus a "Deleted" badge, never a broken/null reference or silent disappearance.

Schema (migration 0025): for every table with a staff.id FK that needs to survive a delete, changed onDelete: "restrict" → "set null", dropped .notNull() where needed, added a paired *Name text column:
- orders.staffId → staffName
- orderDiscounts.appliedBy → appliedByName
- payments.processedBy → processedByName
- coupons.createdBy → createdByName
- attendance.staffId → staffName + staffIdSnapshot (plain text copy of the original UUID, per Zakir's explicit request — attendance shows both the name AND the original ID, not just the name)
- attendance.loggedBy → loggedByName

Left alone on purpose: deliveries.riderId/orders.riderId (already set null, no name snapshot wanted — "no rider" is meaningful on its own). notifications.staffId, notification_clears.staffId, push_subscriptions.staffId (cascade — per-user rows that should vanish with the user). branch_devices.requestedBy/approvedBy (already fine).

Create actions updated to populate the new *Name columns at insert time: createOrderAction, order discount insert, completeBillAction's payment insert (all in orders/actions.ts), createCouponAction (coupons/actions.ts), markAttendanceAction + clockInAction (attendance/actions.ts, both update and insert branches in each).

Read paths updated to return the new fields: types/order.ts (AppliedDiscount, Payment, Order types widened to allow null + added *Name fields), buildOrderResponse/getOrdersAction/getOrderByIdAction in orders/actions.ts.

Delete actions built:
- deleteStaffAction (features/staff/actions.ts) — STAFF/RIDER only. Backfills all *Name snapshots on existing historical rows (transaction), then deletes the Supabase Auth user, then deletes the staff row, then logs audit.
- deleteAdminAction (features/admins/actions.ts) — SUPER_ADMIN only, blocks self-delete and deleting another SUPER_ADMIN. Same backfill-then-delete pattern.

UI — delete buttons added: staff-table.tsx (Trash2 icon next to the existing deactivate Power button), AdminCards.tsx (same pattern, needed to add useAlertModal import which wasn't there before). Both use showConfirm with strong "permanent, cannot be undone" wording.

UI — "who did this" display added (none of this existed in the UI before this session, confirmed via grep):
- OrderDetail.tsx — "Placed by" in the header meta row, "Applied by" under the discount line, a brand-new Payments section (method/amount/"Processed by") that didn't exist at all before. Shared AttributionName helper renders the Deleted badge.
- AttendanceTable.tsx / getAttendanceForDateAction — real bug found and fixed here: this table's query started from the live staff table, so a deleted person would just vanish from attendance history entirely, even for past dates. Fixed by adding a second query for attendance rows where staffId IS NULL, merged into the result as isDeleted: true rows (read-only, no status-change/end-shift buttons, shows the Deleted badge).
- CouponRow.tsx — "Created by" added to the meta line.
- attendanceQueries.ts (used by attendance reports, not yet wired to any visible page) — same class of bug, was innerJoin against live staff. Fixed to leftJoin + groups by staffIdSnapshot too (so multiple deleted staff don't collapse into one row) + returns isDeleted.

Status: fully complete, tsc clean, confirmed by Zakir ("no errors now broo").

POST-COMPLETION BUG (found + fixed during testing, 2026-08-28): first real delete attempt failed with "Failed query: delete from staff...". Root cause: audit_logs_actor_id_staff_id_fk in the LIVE DB had delete_action "a" (no action), even though schema.ts already declared onDelete: "set null" for audit_logs.actorId — same class of live-constraint-vs-schema drift as the coupons_created_by_fkey issue in §3, just never caught because audit_logs was assumed "already safe" and wasn't in the original staff.id FK re-verification pass. Confirmed via: SELECT conname, conrelid::regclass, confdeltype FROM pg_constraint WHERE confrelid = 'staff'::regclass AND contype = 'f'; — this query is now the standard way to verify live FK delete-behavior against staff.id, don't trust schema.ts alone. Fixed by dropping and recreating the constraint with ON DELETE SET NULL directly in Supabase SQL editor.

deleteAdminAction had the identical auth-already-deleted retry bug as deleteStaffAction (same root cause, same fix: treat "not found" auth-delete error as already-done). Fixed proactively alongside the invite-link work, not yet separately stress-tested via a real interrupted-retry scenario on the admin path specifically.

Second bug found on retry: deleteStaffAction called supabaseAdmin.auth.admin.deleteUser() and db.delete(staff) as two separate non-transactional steps (can't share a Postgres transaction with Supabase Auth). The first failed attempt had already deleted the auth user before hitting the audit_logs constraint on the staff-row delete, so retrying threw "Failed to delete auth account: User not found" and could never complete. Fixed: an authError containing "not found" is now treated as already-done rather than a blocking error, so a retry can still finish deleting the staff row. Same fix will cover deleteAdminAction if it ever hits the same interrupted-retry state (not yet tested).

UI bug also fixed: staff-table.tsx (deactivate/reactivate/delete errors) was rendering a raw inline destructive banner instead of using the shared showAlert() modal. Fixed to call showAlert(message, title) — note the real signature is a plain string title, not an options object, and showAlert is NOT async/Promise-returning (unlike showConfirm). Confirm AlertModalProvider.tsx's actual exported signature before writing any future showAlert() call rather than assuming it matches showConfirm's shape.

TESTED 2026-08-28 (post-fix), all confirmed by Zakir:
- Staff delete with real history (order, discount, payment, attendance, coupon) — all show name + Deleted badge correctly.
- Admin delete (SUPER_ADMIN deleting an ADMIN) — works.
- Deactivate/reactivate — unaffected, still works, now also shows errors via showAlert().
- Rider delete — works, riderId columns go null with no name snapshot as designed.
- NOT tested: SUPER_ADMIN self-delete block / delete-another-SUPER_ADMIN block — no second SUPER_ADMIN account existed to test against. Still an open verification gap, not a confirmed-working item.

15. Open items / next steps for next session

16. Single-SUPER_ADMIN enforcement (COMPLETED 2026-08-29)

Requirement: only one SUPER_ADMIN should ever exist per tenant.

Enforced both directions:
- Creation blocked: createAdminAction (features/admins/actions.ts) checks for an existing SUPER_ADMIN row for the tenant before allowing role: "SUPER_ADMIN" on insert.
- Promotion blocked: updateAdminAction checks the same, but only when roleChanged && parsed.data.role === "SUPER_ADMIN" AND an existing SUPER_ADMIN's id differs from the row being edited — so the very first SUPER_ADMIN (when none exists yet) can still be created via promotion.
- Zero enforcement was already in place pre-existing (deactivateAdminAction/deleteAdminAction both hard-block any target.role === "SUPER_ADMIN" row, self or not) — untouched, just confirmed still correct.

UI: AdminDialog.tsx takes a new hasSuperAdmin: boolean prop. The "Super Admin" SelectItem is hidden from the role picker whenever hasSuperAdmin is true, UNLESS the dialog is currently editing that same existing SUPER_ADMIN (so its current value still renders). AdminCards.tsx computes hasSuperAdmin locally from its admins prop for edit-mode dialogs; app/(dashboard)/admins/page.tsx computes it from the fetched list for the create-mode dialog.

Practical effect: SUPER_ADMIN rows in AdminCards.tsx correctly show no action buttons (self, and the only SUPER_ADMIN) — this was flagged as "Bug C" earlier in the session but is actually correct/intentional behavior given the single-SUPER_ADMIN rule, not a bug.

tsc --noEmit clean. Confirmed working by Zakir (role option correctly hidden once a SUPER_ADMIN exists).

Files touched: features/admins/actions.ts, features/admins/components/AdminDialog.tsx, features/admins/components/AdminCards.tsx, app/(dashboard)/admins/page.tsx.

17. Notification bell scrollbar + upload permission fixes (COMPLETED 2026-08-29)

See Bug Pattern #29 for the root cause (Chrome Fluent Scrollbars ignore ::-webkit-scrollbar-* entirely) and #30 (flex-1 inside max-h-* collapses to zero height).

Final NotificationBell.tsx scroll implementation: real scrollbar hidden via .scrollbar-hide, a small absolutely-positioned custom thumb div drawn on top, sized/positioned in JS from scrollTop/scrollHeight/clientHeight via a scrollRef + onScroll handler + updateThumb() function. Panel container changed from max-h-72 to fixed h-72 to fix content disappearing.

uploads/actions.ts: entityType === "staff" upload path now allows isSelf (entityId === currentStaffRow.id) to bypass the manage_staff permission check, matching the existing self-edit pattern used elsewhere. Confirmed fixes both the profile self-edit flow (text + photo) end-to-end.

Files touched: features/notifications/components/NotificationBell.tsx, app/globals.css, features/uploads/actions.ts.

A. RESOLVED 2026-08-29 — Invite-link localhost bug
Zakir deployed the app and sent a real invite link (via the existing staff-invite flow, supabaseAdmin.auth.admin.inviteUserByEmail with redirectTo pointing at /auth/callback?next=/auth/reset-password) to a friend's email as a live test. When the friend clicked the link, it opened localhost instead of the deployed URL. This strongly suggests NEXT_PUBLIC_APP_URL is set to a localhost value in the deployed environment (Vercel) rather than the production URL — check Vercel's environment variables first. The /auth/callback route.ts and /auth/reset-password page.tsx were both reviewed and look correctly implemented on the code side (callback exchanges the code and redirects to the next param; reset-password page collects a new password and calls resetPasswordAction) — this is very likely purely an environment/config issue, not a code bug. After fixing the env var, Zakir wants to re-test that a fresh invite actually lands on /auth/reset-password and not on the login page.

B. Rider clock-out flow — worth a final explicit confirmation (isAvailable flips false, disappears from RiderSelector, signs out correctly) since it wasn't explicitly re-confirmed after the last fix (see also §13 testing notes).

C. RESOLVED 2026-08-29 — Notification panel scrollbar. Confirmed working after several iterations; see Bug Pattern #29/#30 and §16 for the full story and final implementation (custom JS-drawn thumb in NotificationBell.tsx).

D. PARTIALLY RESOLVED — Profile self-edit. Text-field self-edit confirmed working. Avatar upload was still broken (separate bug in uploads/actions.ts, not updateStaffAction/updateAdminAction) — fixed 2026-08-29, see §16. Full self-edit flow (text + photo) now confirmed working end-to-end by Zakir.

E. NEW: "My Reservations" page link added to BookingModal.tsx's confirmation screen and to book-a-table/page.tsx's header. Done, untested in browser yet.

F. RESOLVED — Rider dashboard date filters + revenue summary confirmed fully done by Zakir (frontend included, contrary to the earlier "not started" note).

G. RESOLVED/MOOT — SUPER_ADMIN self-delete / delete-another-SUPER_ADMIN block confirmed done by Zakir; also moot going forward since a second SUPER_ADMIN can never be created through the UI.

H. RESOLVED — Order number mismatch (POS vs Orders page) confirmed by Zakir to be working perfectly fine; not a real bug.

I. RESOLVED — Rider clock-out flow confirmed working by Zakir.

J. RESOLVED — Invite email production-link (localhost) issue confirmed now working fine.

K. Professional/branded emails via Resend SMTP — deferred on purpose, to be added as an item in the (not-yet-built) deployment checklist rather than done now.

18. Functional testing session (2026-08-29, ongoing)

Testing plan: Phase 1 functional testing (module by module: happy path, validation, permissions, realtime, DB integrity, error recovery, mobile, performance — kept broad, not exhaustively itemized, per Zakir's preference) → Phase 2 load/stress testing (needs a staging environment first, not yet set up).

Modules closed: Auth & Roles (✅, found+fixed Bug Pattern #31), Staff/Admin Management (✅, found+fixed Bug Pattern #32; realtime + error recovery deferred to a batch — see below), Reservations including the new History date-filter feature (✅ full module done), Menu Management (✅, realtime deferred), Tables (✅, Bug Pattern #34 now resolved), POS (✅ full module done — see Bug Patterns #35-40; #40 is flagged open, not blocking).

New feature built and confirmed working: Reservations history date filter (Today/This Week/This Month + custom from/to range), mirroring the Rider Dashboard pattern exactly. New files: getReservationHistoryAction (reservations/actions.ts), src/features/reservations/hooks/useReservationHistory.ts, src/features/reservations/components/ReservationHistoryFilters.tsx. ReservationsTab.tsx's old unbounded "History" toggle replaced with the filtered version; active (pending/confirmed) reservations still shown separately, unaffected.

Sidebar.tsx also fixed: overflow-x-hidden added to <nav> (Bug Pattern #33).

Supabase Email OTP expiration lowered from default 3600s to 1800s (30 min) — confirmed via Supabase dashboard (Authentication → Providers → Email); no local supabase/config.toml exists in this repo, so the dashboard is the sole source of truth for this setting.

RESOLVED 2026-08-29 — real security bug found live by Zakir, not from a checklist: an expired invite link's reset-password form kept its password fields and submit button fully interactive after showing the "link expired" banner (only disabled during isLoading || isProcessingInvite, not on the resulting error state). Zakir tested this live post-deploy, submitted a new password against an expired link, and it silently overwrote his own already-logged-in SUPER_ADMIN password instead of the invited staff account's (no valid invite session existed, so the update landed on whatever session was active in that browser). Manually reset the SUPER_ADMIN password after. Fixed — see Bug Pattern #38: form now tracks isLinkInvalid separately and fully hides the password fields/submit button (not just a banner) whenever the link is invalid or expired, plus a defensive early-return in handleSubmit. Needs a fresh end-to-end retest once email quota resets: resend a real invite, complete it successfully, then separately let one expire and confirm the form is fully blocked.

Deferred, to be batched together once a staff account + refreshed email quota are both available: Staff/Admin realtime (deactivate-while-logged-in) + error recovery (delete retry, double-click), Menu realtime, Tables realtime, the invite-link 30-min expiry click-through retest (see above), and Coupons realtime/offline reconnect behavior (CouponPicker.tsx fix made this session — see Bug Pattern list — but full offline-cycle testing deferred here since it needs a real connectivity-drop test).

Still not started: Delivery/Rider flow, Coupons (functional pass; offline-specific parts deferred, see above), Attendance, Notifications, Reports, Audit Logs, Settings, Public storefront/online ordering (only the variant/modifier fix was tested there — no full module pass done yet), cross-cutting regression pass.

Immediate next task (confirmed with Zakir, not yet started): fix Bug Pattern #40 (hardcoded CATEGORY_ICON placeholder-ID map — real file location still unconfirmed, see correction) before moving to the next module.

19. POS init bundle refactor + performance/scalability testing (2026-09-01)

Problem: POS mount was firing ~8 separate server actions (pos/page.tsx: getCurrentStaff, getPosAutoConfirmSettingAction, getMyClockStatusAction; usePosMenu.ts: getMenuCategoriesAction, getMenuItemsAction; TableSelector.tsx: getTablesAction, getTableSectionsAction; CouponPicker.tsx: getActiveCouponsAction + getClockedInStaffCountAction), each independently doing its own auth.getUser() + staff DB lookup.

Fix: new features/pos/actions.ts — getPosInitBundleAction(overrideBranchId?), one shared resolvePosAuth() helper + compute* functions (computeMenuCategories, computeMenuItems, computeTables, computeTableSections, computeActiveCoupons, computeClockedInCount, computeAutoConfirmSetting, computeClockStatus) run via Promise.all, mirroring the existing dashboard bundle pattern. New features/pos/hooks/usePosInit.ts (React Query wrapper, queryKey ["pos-init", branchId], exposes invalidate() for future use — not yet wired anywhere).

Consumer files updated to accept seeded data instead of fetching independently, all runtime behavior (realtime subscriptions, offline ledger sync, dropdown re-fetch) left untouched:
- pos/page.tsx — dropped getPosAutoConfirmSettingAction/getMyClockStatusAction, just passes branchId.
- PosLayout.tsx — calls usePosInit(branchId), passes posInit down to CartPanel (all 3 responsive-breakpoint instances) and usePosMenu.
- usePosMenu.ts — now usePosMenu(posInit?, isLoading?), derives categories/items from the bundle via useMemo (not independent useQuery calls).
- CartPanel.tsx — takes posInit prop instead of autoConfirmOnPlace/initialIsClockedIn separately.
- TableSelector.tsx — seeds tables/sections from posInit via a render-time state-adjustment pattern (not a useEffect calling setState, to avoid the cascading-render warning); falls back to a direct fetch only if posInit isn't ready yet; realtime table-status updates still call a direct refetch function, not React Query invalidation (since initial fetch no longer goes through useQuery).
- CouponPicker.tsx — same render-time seeding pattern for coupons/posAllowDiscounts from posInit; caches an offline IndexedDB snapshot in a real useEffect (genuine external-system side effect, kept separate from the render-time seed). Dropdown-open re-fetch, offline detection, and ledger sync logic all untouched.

Real bug found + fixed during this work: computeClockedInCount in pos/actions.ts used a raw sql`${attendance.date} < ${end}` template for the upper date bound, which bypasses Drizzle's column-type mapper and passes a native JS Date object straight to postgres.js — threw "TypeError: The 'string' argument must be of type string... Received an instance of Date" in production (next build / next start), breaking the entire bundle (Promise.all rejection meant menu/categories rendered empty while tables/coupons still showed via their own fallbacks). Fixed: replaced with Drizzle's lt(attendance.date, end) helper, consistent with the existing gte() call on the same query.

Load testing (Playwright-based, load-test-pos.mjs — pre-existing script, single shared staff account by design):
- Baseline (localhost, pre-refactor): login 11,582ms / POS load 11,502ms / order 2,820ms / total 26,163ms.
- Post-refactor, localhost (dev machine → Mumbai Supabase over public internet): login 10,429ms / POS load 9,730ms / order 2,678ms / total 23,254ms — smaller improvement than expected, root cause identified as raw network latency from a local dev machine to hosted Supabase, not application logic.
- Post-refactor, production (Vercel prod deployment, same-region Mumbai): login 9,325ms / POS load 4,591ms / order 759ms / total 14,950ms — confirms the bundle refactor is real once network noise is removed (POS load and order placement both dropped sharply).
- Repeat run (warm functions, same 5 users): login 6,627ms / POS load 3,722ms / order 4,077ms / total 14,637ms — confirmed first-run gap was partly Vercel cold starts.
- Login time investigated with added [timing] console.log instrumentation in loginAction (rateLimit/signInWithPassword/staffLookup) — server-side login itself is fast (~870ms total: rateLimit 119ms, signInWithPassword 706ms, staffLookup 44ms). The multi-second gap is Vercel cold-start overhead under simultaneous concurrent requests, not a code or query problem. [timing] logs are still in auth/actions.ts — not yet removed, low priority cleanup.
- Upstash Redis region confirmed Mumbai (same as Vercel/Supabase) — ruled out as a factor.

Concurrency/rate-limit finding: running 10 concurrent sessions against the single-shared-account script correctly triggered loginRateLimit (5 attempts/60s/email) — 5 sessions succeeded, 5 got blocked and timed out waiting for navigation. This is the rate limiter working as designed, not a bug; confirmed the single-account script cannot measure true concurrency past 5.

Multi-account testing built for real concurrency measurement:
- seed-load-test-staff.mjs (new, project root) — one-time script creating 30 fake STAFF accounts directly via supabaseAdmin.auth.admin.createUser (email_confirm: true, bypasses invite/email flow entirely). Accounts: loadtest1..30@loadtest.ricenspice.internal, password LoadTest123!, all in the same tenant/branch as the existing SUPER_ADMIN. Already run successfully — all 30 exist in the live Supabase project.
- load-test-pos-multi.mjs (new, project root) — variant of load-test-pos.mjs where each concurrent session logs in with a different seeded account (index % 30, so cycles past 30 concurrent), otherwise identical flow/timing/reporting to the original script.
- Result at 20 concurrent (production, multi-account, real concurrency): 20/20 succeeded (no hard failures) but times degraded — login ~16-21s, POS load ~7-8s, order ~6-8s, total ~30-38s across two runs (repeat run ruled out cold starts as the sole cause this time).

Root cause of the 20-concurrent slowdown: confirmed via Supabase dashboard → Infrastructure — the project is on Free plan, Nano compute (shared CPU, 0.5GB memory), CPU already at 57% during testing. This is a hardware ceiling, not an application or query bug; postgres.js client pool was also raised from default to max: 30 in src/db/index.ts as a precondition for higher-concurrency testing, but compute size is the binding constraint, not pool size.

Decision (Zakir, 2026-09-01): will NOT upgrade the Free/Nano Supabase plan speculatively. Given the per-tenant dedicated-infrastructure architecture, each real restaurant gets its own Supabase project — so compute sizing is a per-client onboarding decision, not something to pre-pay for now. Saved as a standing reminder (see memory): before onboarding any restaurant with many concurrent terminals, upgrade that specific tenant's Supabase instance from Free/Nano to Pro + an adequate compute size (Small minimum, likely Medium for 50-100 concurrent), then re-run load-test-pos-multi.mjs at their expected concurrency to confirm it holds up before go-live.

Testing conclusion: POS load testing is DONE for now. Bundle refactor confirmed working and meaningfully faster in production. No further POS performance work needed until a real client's concurrency requirements are known at onboarding time.


20. Online-ordering / delivery flow fixes + orders.status expansion (2026-09-04)

Fixed this session, in order:
1. OrderActions.tsx: 'billAlreadyPrinted' unused var + setState-in-useEffect cascading-render warning (Bug Pattern #41) — replaced auto-open effect with a render-time derived value (autoOpenBill), added dismissedAutoPrintFor state to track per-order dismissal instead of autoPrintedForOrder inside an effect.
2. Decoupled auto-open from auto-print (Bug Pattern #42) — BillModal now always receives autoPrint={false} from OrderActions; the bill modal opening automatically on reaching ready_for_delivery no longer also fires an unwanted print-preview tab. Printing is manual (staff clicks Print Bill inside the modal).
3. orders.status enum expanded to include "delivered" (migration 0028_add_delivered_order_status.sql, hand-run ALTER TYPE ... ADD VALUE, ledger reconciled in meta/_journal.json + drizzle."__drizzle_migrations" — see Bug Pattern #43). OrderStatus type (src/types/order.ts) updated to match.
4. updateDeliveryStatusAction (features/deliveries/actions.ts) now sets orders.status = "delivered" when a rider marks their delivery delivered (previously only updated deliveries.status, leaving orders.status stuck at ready_for_delivery/out_for_delivery forever — this was the real root cause of the Complete Order button staying permanently disabled, misdiagnosed initially as an RLS issue, see Bug Pattern #46).
5. useOrderDetail.ts's canPrintBill/canCompleteBill switched from checking order.deliveryStatus === "delivered" to order.status === "delivered" directly, consistent with the expanded enum.
6. useDeliveryOrders.ts's scopeStatuses filter widened to include out_for_delivery and delivered (previously stopped at ready_for_delivery, causing orders to vanish from the Delivery Orders list the moment a rider advanced them, making it impossible for staff to ever see/complete them).
7. Both OrderStatusBadge.tsx components (features/orders/components/OrderDetail/ and components/data-display/ — two separate components, both needed updating, caught via npm run build) got "delivered" added to their style/label maps.
8. RiderAssignment.tsx's own delivery-status badge decluttered — now only shows for unassigned/assigned (Unassigned/Assigned labels); once a delivery reaches out_for_delivery/delivered, that badge disappears since the main OrderStatusBadge at the top of OrderDetail now correctly shows the same information.
9. Diagnosed (not fixed, Zakir's call): realtime is completely inert for SUPER_ADMIN across orders + notifications, since branchId is null for that role (Bug Pattern #44). Confirmed working correctly for ADMIN/STAFF via live debug logging (temporarily added then removed from channelRegistry.ts).
10. Font rendering intermittently failing for SUPER_ADMIN only — root cause was next/font/google's display: "optional" (Bug Pattern #45), fixed to display: "swap" in src/app/layout.tsx for both Plus_Jakarta_Sans and Geist_Mono.
11. Unrelated but confirmed non-issues encountered during debugging: __cf_bm cookie rejection on localhost (Cloudflare bot-check cookie, harmless on non-production domains), a transient ECONNRESET on the pooled Supabase connection (intermittent, recovered on retry — flagged as a real but separate follow-up item for future load/stress testing, not fixed this session).

Full delivery flow now confirmed working end-to-end: pending → confirmed (kitchen ticket) → ready_for_delivery (rider picked, bill auto-opens, print is manual) → out_for_delivery (rider starts delivery) → delivered (rider marks delivered) → Complete Order button enables live for ADMIN/STAFF (SUPER_ADMIN requires manual refresh, accepted limitation) → completed.

Files touched: features/orders/components/OrderDetail/OrderActions.tsx, features/orders/components/OrderDetail/OrderStatusBadge.tsx, features/orders/components/OrderDetail/RiderAssignment.tsx, components/data-display/OrderStatusBadge.tsx, features/orders/hooks/useOrderDetail.ts, features/orders/hooks/useDeliveryOrders.ts, features/deliveries/actions.ts, src/types/order.ts, src/db/schema/enums.ts, src/db/migrations/0028_add_delivered_order_status.sql, src/db/migrations/meta/_journal.json, src/app/layout.tsx.

21. Deployment checklist (new section — items to formalize before onboarding a real restaurant, collected from various deferred items across sessions)

Not yet built as an actual document/process — this is the running list to eventually turn into one:
- Database backups (pg_dump via GitHub Actions) — highest priority, not started (see §8/§9).
- Migration/import script from prior POS systems — top priority once backups done, not started (see §8/§9).
- Professional branded emails via Resend SMTP — deferred on purpose (see §17 item K).
- Payment gateway (PayFast) merchant onboarding — per-restaurant, owner signs up themselves at https://getstarted.apps.net.pk/signup, hands Merchant ID/Key/Passphrase to Zakir for env setup (see §11 update).
- Privacy Policy (GDPR-compliant, covering payment data handling per §22/PayFast spec's "never store card numbers/CVV/PINs/OTPs" rule) — required before going live with any payment processing, not yet drafted. Ties into the existing Legal eligibility gate in §10 (GDPR-compliant Privacy Policy + ToS, item 1) — the payment gateway addition makes this more urgent, not a new requirement.
- Staging environment — needed before Phase 2 load/stress testing can begin (see §18/§19).


22. Payments architecture — Phase 1 DB schema (2026-09-04)

Full spec provided by Zakir this session (pasted in full — covers payment abstraction layer, PaymentProvider adapters, payment methods enum, status lifecycle, DB model, per-restaurant provider config, manual payment mode, QR/webhooks, idempotency, state machine, split payments, refunds, reconciliation, security rules, multi-tenant isolation, offline compatibility, testing requirements — treat as the authoritative reference for all future payment work, don't re-derive from scratch).

DB changes made (hand-run SQL in Supabase, migration 0029_cold_thunderbird.sql after npm run db:generate reconciliation — see Bug Pattern #47 for a snapshot-drift issue hit and fixed during this):

New enum payment_status_lifecycle (src/db/schema/enums.ts, paymentStatusLifecycleEnum): pending, processing, paid, failed, cancelled, expired, refunded, partially_refunded, requires_verification. Distinct from the existing order-level paymentStatusEnum (unpaid/partial/paid/refunded), which tracks the ORDER's aggregate state, not an individual payment record's lifecycle.

payments table (src/db/schema/orders.ts) — new columns added, all nullable/defaulted so existing manual-payment flow (completeBillAction) keeps working unchanged:
- branchId (was missing entirely before this session)
- provider (nullable text — "manual" for existing staff-recorded payments, real gateway id like "payfast" once live)
- status (paymentStatusLifecycleEnum, defaults to "paid" — matches existing manual-payment behavior where recording = considered paid)
- providerTransactionId (nullable, unique partial index — prevents duplicate webhook creating a second payment row)
- merchantTransactionId (nullable)
- clientPaymentId (nullable, unique partial index — offline-payment sync dedup, same pattern as orders.idempotencyKey)
- terminalId (nullable text — which POS device recorded it)
- currency (default "PKR")
- metadata (jsonb, nullable)
- initiatedAt, verifiedAt, failedAt (nullable timestamps)
- CHECK (amount >= 0) — relaxed from the spec's amount > 0 after finding one existing legitimate $0 complimentary-order payment row; a stricter >0 constraint would need that row fixed first, deferred.

New table payment_refunds (src/db/schema/orders.ts) — id, tenantId, paymentId (FK to payments, cascade), amount, reason, status (paymentStatusLifecycleEnum, default pending), providerRefundId, createdBy/createdByName (staff attribution, set-null pattern matching §14), createdAt. Exported types PaymentRefund/NewPaymentRefund added alongside the existing Payment/NewPayment types.

NOT yet built (next session's task): the actual PaymentService/PaymentProvider interface code layer, a ManualProvider adapter, and wiring completeBillAction (and eventually the POS payment UI) to actually populate/use these new columns. Currently the new columns exist in the DB and schema but nothing in the app writes to them yet — completeBillAction still inserts payments rows the old way (method/amount/processedBy only). This is intentional — schema-first, then service layer — but must not be mistaken for "payments feature done."

23. Payments Phase 1 service layer + offline cash payments (2026-09-04, later same-day session)

Folder structure decision (Zakir, explicit): service layers (PaymentService, PaymentProvider interface, provider adapters) do NOT go in features/payments/ — they go in src/lib/payments/, matching the existing src/lib/supabase/, src/lib/realtime/ pattern. features/<name>/ is reserved for actions.ts, components/, hooks/, and feature-specific schemas.ts (Zod input validation) — never DB schema (that's always src/db/schema/) and never service/provider logic.

Files built:
- src/lib/payments/types.ts — PaymentMethod, PaymentStatusLifecycle, InitiatePaymentInput/Result, VerifyPaymentInput/Result, RefundPaymentInput/Result (includes tenantId, added after initial oversight), DbClient (union of top-level db and a transaction client, lets provider methods run inside an existing transaction), PaymentProvider interface (initiate/verify/refund, all accepting an optional dbClient).
- src/lib/payments/providers/ManualProvider.ts — Phase 1's only real provider. No external API. initiate() inserts directly into payments (provider: "manual", status: "paid" immediately). verify() is a no-op reading back current DB state. refund() inserts into payment_refunds. All three accept an optional dbClient param (defaults to top-level db).
- src/lib/payments/PaymentService.ts — registry keyed by provider id (manual: new ManualProvider()), resolveProvider() throws on unknown id. Public initiate/verify/refund methods default providerId to "manual" and forward an optional dbClient straight through. Phase 3 adds "payfast": new PayFastProvider() to the registry — nothing else changes.

completeBillAction (features/orders/actions.ts) wired: now calls PaymentService.initiate(..., "manual", tx) inside its existing db.transaction(), keeping the payment insert atomic with the order-status update (production-standards decision — a completed order with no payment row, or vice versa, is a data integrity bug). Also accepts an optional clientPaymentId param — if a payment already exists with that clientPaymentId, returns success immediately instead of erroring, so an offline-queued payment retried after already syncing doesn't double-complete or error out.

Offline cash payment queueing (Zakir's explicit design choice — rejected building real offline-sync for ALL payment methods as too risky for money; rejected doing nothing at all as insufficient given POS is offline-first):
- New src/lib/offlinePaymentQueue.ts — mirrors src/lib/offlineOrderQueue.ts exactly (separate idb-keyval store "zaiqa-pending-payments", enqueue/list/remove/updatePendingPayment). PendingPayment shape: clientPaymentId, orderId, paymentMethod (always "cash" in practice), createdAt, attempts, lastError, staffId, branchId.
- useOrderDetail.ts's mutateCompleteBill — tries completeBillAction() via withTimeout(..., 15000) first; on failure, ONLY queues if paymentMethod === "cash" AND !navigator.onLine (any other method's failure surfaces as a normal error, no offline path). On successful queue, shows "saved locally, will sync" instead of an error, treats it as a success from the staff member's POV.
- OfflineSyncManager.tsx — extended to also call syncPendingPayments() after syncPendingOrders() completes each pass (payments sync AFTER orders — an order must exist server-side before any payment against it can succeed). Same sequential-resync, stop-on-throw pattern as the existing order sync.
- OrderActions.tsx — added isOnline state (lazy-initialized via useState(() => navigator.onLine) to avoid the setState-in-effect cascading-render warning, Bug Pattern #41), subscribes to window online/offline events. Payment method Select disables every option except "cash" when offline, shows a small "Offline — only cash accepted, will sync when reconnected" hint text.
- src/lib/withTimeout.ts — NEW shared utility, extracted from a previously-private function inside usePosOrder.ts (was duplicated logic risk once useOrderDetail.ts needed the same thing). usePosOrder.ts now imports it instead of defining its own copy.

Testing (2026-09-04, this session) — ran the standard 6-item functional checklist (happy path online, cash offline, non-cash-disabled offline, reconnect auto-sync, duplicate-sync safety, refresh/crash mid-offline):
- Happy path online: not yet explicitly confirmed (untested this session, should be fine given no logic changed there).
- Non-cash disabled while offline: CONFIRMED working.
- Cash offline (Complete Bill): FAILS — see Bug Pattern #49, OPEN, unresolved. Button spins indefinitely, never reaches the queue path.
- Refresh/crash mid-offline test: surfaced a SEPARATE bug (now fixed) — see Bug Pattern #48. Offline refresh was showing a stale cached login page instead of a real offline state; root cause was Serwist's default HTML caching, not proxy.ts or auth. Fixed with a dedicated /offline fallback + NetworkOnly on all protected routes.
- Reconnect auto-sync, duplicate-sync safety: NOT YET TESTED — blocked on Bug Pattern #49 being fixed first, since the queue is never actually reached.

NEXT SESSION PRIORITY: fix Bug Pattern #49 first (nothing else in this feature can be tested until Complete Bill actually reaches the offline-queue code path when offline). Once fixed, re-run the full 6-item checklist from scratch.