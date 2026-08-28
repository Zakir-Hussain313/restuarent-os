Rice n Spice (Zaiqa) — Context

Single source of truth. Supersedes all prior MASTER_PROMPT/PROJECT_BRIEF/DATABASE_BRIEF/SKILL/session-summary docs.
Last reconciled: 2026-08-28 (session: permanent delete feature completed).

1. Role & Process

Act as: Principal Software Architect, Senior Full Stack Engineer, Database Architect, SaaS Engineer, Security Engineer. Not a tutorial generator.

Before writing code: Analyze → Design → Validate (consistency with existing architecture/patterns) → Implement. Keep it tight for simple fixes — don't over-process.

Standing preferences (strict, always apply):

Brief, plain-language explanations. No long paragraphs. No over-explaining.
Code edits as Before/After paste-and-diff blocks, STRICTLY one file at a time — give the diff, stop, wait for Zakir to apply it and report back before giving the next file's diff. Never batch multiple files' diffs into a single response, even for a single cohesive feature that touches several files. Full exact path on every single block. No direct file access.
Ask for all needed files at once, raw PowerShell/commands only, no comments. When multiple Get-Content/Get-ChildItem calls are needed at once, give them as ONE combined multi-line code block, not separate messages.
npx tsc --noEmit is the hard gate for correctness, but Zakir runs it on his own schedule — don't demand it after every single diff; he'll paste the result when he wants to.
File operations: PowerShell only (Get-Content, Get-ChildItem -Recurse -Include, Select-String) — never bash. ** glob does NOT recurse in PowerShell. Paths with parentheses (e.g. "src\app\(dashboard)\...") MUST be quoted in PowerShell or the command fails.
DB migrations: hand-written SQL run in Supabase SQL editor only — never drizzle-kit push (previously dropped ~50 live RLS policies). After running hand-written SQL, run npm run db:generate to reconcile the ledger and confirm the generated file matches exactly; do NOT run db:migrate for these.
Middleware lives at src/proxy.ts, not middleware.ts.
Always verify file paths via PowerShell before writing diffs; flag explicitly when a path/value is a guess. Never assume a file's contents or a prop signature — always ask for the file first, even if confident.
Before declaring any file "dead code," verify with a repo-wide grep AND a check for barrel-export re-exports — only call something dead after both checks come back empty.
Production builds: next build --webpack (required for Serwist/service worker). Dev: npm run dev (Turbopack).
Reuse existing types/services/hooks/patterns. Don't introduce competing architectures or rewrite working code unnecessarily.
Give changes as diffs only — never full file rewrites, even when many changes hit one file (exception: this context.md document itself, which is not code).
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
orders types: dine_in, takeaway, delivery. orders.status enum in the DB is currently pending/confirmed/out_for_delivery/completed/cancelled; actual delivery workflow is out_for_delivery → delivered → completed (three real steps) — double check against deliveries.status if working on delivery status logic, since "delivered" lives on the deliveries table separately from orders.status.
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
features/pos/* — design conversion done; CouponPicker/TableSelector branchId-prop bug fixed (Bug Pattern 5). Forms pass done on TableSelector.tsx, MenuSearch.tsx, DeliveryDetailsForm.tsx. RiderSelector.tsx Select UUID bug fixed. ClockButton.tsx added (§13).
features/delivery-areas/* — hex-color fixes applied, confirmed clean. Forms pass done on DeliveryAreaFormModal.tsx. BranchSelector.tsx Select UUID bug fixed.
features/settings/* shell — confirmed clean. SettingsBranchFilter.tsx Select UUID bug fixed.
features/orders/* — fully done. OrderActions.tsx Payment Method Select UUID bug fixed. "Placed by"/"Applied by"/Payments section added this session (§14).
  Live components (confirmed clean): OrderCard.tsx, OrderStatusBadge.tsx, OrderDetail.tsx, OrderActions.tsx, RiderAssignment.tsx, BillModal.tsx, KitchenTicketModal.tsx, CancelConfirmModal.tsx, OrderHistoryLayout.tsx, OrderHistoryTable.tsx, OrderHistoryFilters.tsx, useOrderHistoryTable.tsx.
  Confirmed dead code — DELETED: OrdersLayout.tsx, OrderList/OrderList.tsx, OrderList/OrderListHeader.tsx, OrderList/OrderRow.tsx, OrderList/OrderStatsBar.tsx, OrderFinancials.tsx, OrderItemsTable.tsx.
  Not dead: src/features/orders/shared/OrderListSkeleton.tsx — different, live file, imported by both real Active Orders/Delivery pages.
features/admins/* — AdminDialog.tsx forms-pass false-positive confirmed (hidden file input only); Role/Branch/Status Select UUID bugs fixed. Delete button added this session (§14).
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

Payment gateways (JazzCash, Easypaisa, card): each needs the restaurant owner's own merchant account — not Zaiqa's. ~3-5 days per gateway once credentials exist. FBR + all 3 gateways realistically 5-7 weeks.

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

Second bug found on retry: deleteStaffAction called supabaseAdmin.auth.admin.deleteUser() and db.delete(staff) as two separate non-transactional steps (can't share a Postgres transaction with Supabase Auth). The first failed attempt had already deleted the auth user before hitting the audit_logs constraint on the staff-row delete, so retrying threw "Failed to delete auth account: User not found" and could never complete. Fixed: an authError containing "not found" is now treated as already-done rather than a blocking error, so a retry can still finish deleting the staff row. Same fix will cover deleteAdminAction if it ever hits the same interrupted-retry state (not yet tested).

UI bug also fixed: staff-table.tsx (deactivate/reactivate/delete errors) was rendering a raw inline destructive banner instead of using the shared showAlert() modal. Fixed to call showAlert(message, title) — note the real signature is a plain string title, not an options object, and showAlert is NOT async/Promise-returning (unlike showConfirm). Confirm AlertModalProvider.tsx's actual exported signature before writing any future showAlert() call rather than assuming it matches showConfirm's shape.

TESTED 2026-08-28 (post-fix), all confirmed by Zakir:
- Staff delete with real history (order, discount, payment, attendance, coupon) — all show name + Deleted badge correctly.
- Admin delete (SUPER_ADMIN deleting an ADMIN) — works.
- Deactivate/reactivate — unaffected, still works, now also shows errors via showAlert().
- Rider delete — works, riderId columns go null with no name snapshot as designed.
- NOT tested: SUPER_ADMIN self-delete block / delete-another-SUPER_ADMIN block — no second SUPER_ADMIN account existed to test against. Still an open verification gap, not a confirmed-working item.

15. Open items / next steps for next session

A. Invite-link localhost bug (surfaced 2026-08-28, NOT yet investigated)
Zakir deployed the app and sent a real invite link (via the existing staff-invite flow, supabaseAdmin.auth.admin.inviteUserByEmail with redirectTo pointing at /auth/callback?next=/auth/reset-password) to a friend's email as a live test. When the friend clicked the link, it opened localhost instead of the deployed URL. This strongly suggests NEXT_PUBLIC_APP_URL is set to a localhost value in the deployed environment (Vercel) rather than the production URL — check Vercel's environment variables first. The /auth/callback route.ts and /auth/reset-password page.tsx were both reviewed and look correctly implemented on the code side (callback exchanges the code and redirects to the next param; reset-password page collects a new password and calls resetPasswordAction) — this is very likely purely an environment/config issue, not a code bug. After fixing the env var, Zakir wants to re-test that a fresh invite actually lands on /auth/reset-password and not on the login page.

B. Rider clock-out flow — worth a final explicit confirmation (isAvailable flips false, disappears from RiderSelector, signs out correctly) since it wasn't explicitly re-confirmed after the last fix (see also §13 testing notes).