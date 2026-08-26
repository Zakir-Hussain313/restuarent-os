Rice n Spice (Zaiqa) — Context

Single source of truth. Supersedes all prior MASTER_PROMPT/PROJECT_BRIEF/DATABASE_BRIEF/SKILL/session-summary docs.
Last reconciled: 2026-08-20.

1. Role & Process

Act as: Principal Software Architect, Senior Full Stack Engineer, Database Architect, SaaS Engineer, Security Engineer. Not a tutorial generator.

Before writing code: Analyze → Design → Validate (consistency with existing architecture/patterns) → Implement. Keep it tight for simple fixes — don't over-process.

Standing preferences (strict, always apply):

Brief, plain-language explanations. No long paragraphs. No over-explaining.
Code edits as Before/After paste-and-diff blocks, STRICTLY one file at a time — give the diff, stop, wait for Zakir to apply it and report back (tsc result and/or a screenshot) before giving the next file's diff. Never batch multiple files' diffs into a single response, even for a single cohesive feature that touches several files — this happened once (a chairs/sofa feature spanned 6 files given all at once) and made it impossible for Zakir to track token usage mid-task. Full exact path on every single block. No direct file access.
Ask for all needed files at once, raw PowerShell/commands only, no comments.
npx tsc --noEmit after every change — hard gate, all errors are blockers.
File operations: PowerShell only (Get-Content, Get-ChildItem -Recurse -Include, Select-String) — never bash. ** glob does NOT recurse in PowerShell — always use Get-ChildItem -Recurse -Include *.tsx | Select-String ....
DB migrations: hand-written SQL run in Supabase SQL editor only — never drizzle-kit push (previously dropped ~50 live RLS policies).
Middleware lives at src/proxy.ts, not middleware.ts.
Always verify file paths via PowerShell before writing diffs; flag explicitly when a path/value is a guess. Never assume a file's contents or a prop signature — always ask for the file first, even if confident.
Before declaring any file "dead code," verify with a repo-wide grep AND a check for barrel-export re-exports (e.g. @/features/orders barrel) — a component can be unreferenced directly but still reachable through an index.ts re-export. Only call something dead after both checks come back empty.
Production builds: next build --webpack (required for Serwist/service worker). Dev: npm run dev (Turbopack).
Reuse existing types/services/hooks/patterns. Don't introduce competing architectures or rewrite working code unnecessarily.
Give changes as diffs only — never full file rewrites, even when many changes hit one file.
2. Product Overview

Production-grade Restaurant Management SaaS, sold to multiple restaurants as a subscription product. Central operational platform for realtime staff collaboration. Not a demo/tutorial.

Tenancy: Deployed per-tenant — each restaurant gets its own dedicated server and dedicated database. Physical isolation, not row-level filtering. tenant_id still present on every entity for portability/reporting. Security priority within one restaurant's DB is role separation (e.g. RIDER must never read staff salary or tenant settings), not cross-tenant isolation.

Roles:

Super Admin — full access: staff, riders, attendance, menu, tables, orders, settings, all-branch analytics, reports, audit logs, POS.
Admin — same as Super Admin but branch-scoped.
Staff — POS, orders, tables, rider assignment, receipts/kitchen tickets, menu availability. No staff management, no settings, no audit logs.
Rider — assigned deliveries only, status updates, delivery history. No POS/menu/settings access.

Core modules — all built: Marketing website, online ordering, dashboard analytics, POS, orders, tables, menu management, receipt printing, staff management, rider management, attendance, notifications (branch-scoped, 10 types, realtime), reports, settings, audit logs.

Realtime-required entities: Orders, Tables, Riders, Menu Availability, Attendance, Notifications. Channels scoped to tenant/branch via broadcastChange(branchId, resource) in lib/realtime/broadcast.ts. SUPER_ADMIN multi-branch realtime is an accepted gap (polling-only fallback).

Offline (POS-specific, not app-wide):

offlineOrderQueue.ts — offline order creation + sync-on-reconnect. Preserves original placement timestamp on sync, respects admin auto-confirm setting.
IndexedDB-backed TanStack Query persister — scoped to menu categories/items only (stable data). Tables/riders/orders are deliberately NOT cached offline — stale live data (e.g. a table appearing free when just seated) is considered more dangerous than showing nothing.
Kitchen ticket printing: hidden-iframe printHtmlDocument() helper (replaced old window.open() popups). Offline tickets print at queue time with an OFF-XXXXXXXX reference.
3. Database

Stack: PostgreSQL, Drizzle ORM, Supabase (Auth + Realtime + Storage). One dedicated DB per tenant.

29 live tables: attendance, audit_logs, branch_settings, branch_delivery_areas, branches, deliveries, tenants, staff, menu_categories, menu_item_variants, menu_items, modifier_groups, modifier_options, restaurant_tables, table_sections, table_reservations, coupon_branch_allocations, coupons, order_counters, order_discounts, order_items, orders, payments, tenant_settings, reservation_counters, push_subscriptions, notification_reads, notifications, notification_clears.

staff.id = auth.users.id (1:1). Supabase Auth = authentication; staff table = authorization (tenant, branch, role). Staff also have a 4-digit POS PIN for fast in-store auth.

Key entity notes:

restaurant_tables statuses: available, occupied, reserved, out_of_service. Automatic status changes are covered by the order audit trail. Manual changes (create/edit/delete, manual override) must be logged via logAudit with resource table.
orders types: dine_in, takeaway, delivery. Statuses: pending, confirmed, preparing, ready, out_for_delivery, completed, cancelled.
audit_logs stores actor, actor_name (denormalized snapshot), resource, resource_id, action, old_value, new_value, description, timestamp.
Notifications system: notifications + notification_reads (per-staff read tracking) + notification_clears (per-staff clear point; DB deletion only once every active staff in the branch has cleared past a shared timestamp). Branch-scoped, 10 types covering order/reservation lifecycle, attendance, delivery status, staff/rider creation, audit overrides.
coupons — discountType (percentage/fixed), discountValue, maxUses (null = unlimited), branchIds (null = all branches), menuItemIds/categoryIds (null = whole order), validFrom/validTo (nullable dates), isActive. Structural fields (discountType, maxUses, branchIds, menuItemIds, categoryIds) are locked from editing once a coupon has real usage on any branch — see updateCouponAction in src/features/coupons/actions.ts. coupon_branch_allocations — Level 1 fixed-at-creation branch split of maxUses, only populated when a coupon is both capped AND eligible for 2+ branches; never recalculated on edit except via the same eligibility check, and usage counts are always preserved across splits/re-splits.

Migrations: src/db/migrations/, tracked via _journal.json + drizzle.__drizzle_migrations. Ledger reconciled — all 21 migrations (0000–0020) correctly recorded. Always run npm run db:generate after schema changes and confirm the diff before db:migrate. Any manual raw-SQL table creation must be registered in the ledger the same way.

Resolved (2026-08-21): the earlier color-column ledger corruption was traced to TWO stale artifacts, not one — a ghost journal entry (idx 19/20 in _journal.json with no matching .sql file) AND an orphaned meta/0020_snapshot.json with no journal/file backing. The orphaned snapshot was silently satisfying drizzle-kit generate's diff check ("no changes"), masking the missing column entirely. Fix pattern for any future ledger mismatch: compare (a) _journal.json entries, (b) actual .sql files on disk, and (c) actual meta/*_snapshot.json files on disk — all three must agree, checking .sql files alone is not sufficient.

0019_wooden_hitman.sql added `color` to restaurant_tables. 0020_great_shaman.sql added the table_seating_type enum plus seating_type and chair_layout columns to restaurant_tables (relative dx/dy/angleDeg seat offsets, jsonb, nullable — null means "use computed default layout"). 0021 (generated as 0021_thick_ender_wiggin.sql) added sofa_layout jsonb column to restaurant_tables — nullable, { openSides?: Side[] } for square/rectangle or { gaps?: Side[] } for round tables, null/empty means default single-gap behavior.

Security & access model:

getSupabaseServerClient() / getSupabaseBrowserClient() — scoped, RLS-respecting, used in the large majority of server actions and all client-side realtime.
supabaseAdmin (src/lib/supabase/admin.ts) — RLS-bypassing, used narrowly in admins/actions.ts, staff/actions.ts, uploads/actions.ts, lib/realtime/broadcast.ts. All 12 call sites audited and gated; one gap found+fixed in uploads/actions.ts (missing tenant/branch ownership check on entityId).
RLS is currently inert — all real queries go through Drizzle direct-to-Postgres via DATABASE_POOL_URL, bypassing PostgREST entirely (where RLS would apply). Authorization is enforced entirely by application-code role checks.
Decision: ship v1 on app-code-only enforcement. Real RLS (scoped non-bypass Postgres role + per-table policies + retest every action) is dedicated V2 work. Until then, every new action must include its own explicit role check.
App-code authorization audit (all 22 actions.ts/pushActions.ts files, ~100+ functions) — completed, no gaps. Ungated-by-design functions: pre-auth actions (login/logout/forgot-password), public online-ordering actions (tenant-scoped + self-validated), createNotification (internal-only helper). Re-run this audit after any batch of new actions.
4. Engineering Standards
TypeScript: strict, no any, reusable interfaces/types.
Frontend: Next.js (App Router, Turbopack dev), Tailwind, shadcn/ui. Prioritize responsiveness, accessibility, UX, performance.
Backend: PostgreSQL, Drizzle ORM, Supabase Auth/Realtime. Prioritize security, scalability, tenant isolation, validation.
Code quality: modular, strongly-typed, production-grade. No tutorial code, duplicated logic, giant files, weak typing, unnecessary abstractions.
Security: validation, authorization, protected routes, tenant isolation on every write. Never trust client input.
5. Codebase Reference

Stack: Next.js (App Router, Turbopack), TypeScript strict, Tailwind, shadcn/ui, @base-ui/react primitives (Select, Popover, Dialog), Drizzle ORM, PostgreSQL (Supabase), Supabase Auth + Realtime + Storage, Zustand, TanStack Query (IndexedDB-persisted for offline POS), idb-keyval, Zod, react-hook-form + zodResolver. Windows dev, PowerShell only, VS Code integrated terminal.

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
    relations.ts
  lib/
    supabase/{server,client,admin}.ts
    realtime/{channels,broadcast,useBranchChannel}.ts
    rate-limit.ts, env.ts, audit.ts, tenant.ts
  components/
    ui/ — shadcn primitives + date-picker.tsx, time-picker.tsx
    providers/AlertModalProvider.tsx
  instrumentation.ts — Sentry init + env validation, runs at server boot
  types/staff.ts — hasPermission(role, permission), core RBAC helper

Core server-action pattern (used across ~22 actions.ts files):

typescript
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

  // work via Drizzle (db.query.X / db.insert / db.transaction)
  await logAudit(db, currentStaffRow, "resource_type", resourceId, "create", { newValue: {...} });
  return { success: true, data: result };
}

ADMIN role adds branch-scoping on top of this (see staff/actions.ts, admins/actions.ts as reference).

Client-side data pattern: React Query hooks (useCoupons, useMenu, etc.) wrap server actions via queryKeys from @/hooks/useMockQuery. Mutation hooks (useCouponActions, useMenuActions) call queryClient.invalidateQueries({ queryKey }) in onSuccess — this is correct and already the standard everywhere; revalidatePath in the server action affects Next's server cache only, client-side React Query cache always needs its own explicit invalidation.

Auth/permission system: Roles SUPER_ADMIN, ADMIN (branch-scoped), STAFF, RIDER. hasPermission() in src/types/staff.ts is the central RBAC check.

Multi-tenancy: one dedicated Postgres DB per restaurant. getTenantId() in src/lib/tenant.ts reads TENANT_ID env var, throws loudly if missing.

Monitoring/protection in place:

Sentry (server/edge/instrumentation configs) — errors, perf tracing, logs. Session Replay OFF (customer PII on screen).
Rate limiting (src/lib/rate-limit.ts, Upstash Redis): login (5/60s), forgot-password (3/hr), public order creation (10/10min), cron (20/min).
Env validation (src/lib/env.ts, Zod) at server boot via instrumentation.ts. .env.example documents required vars.
Health check: GET /api/health — DB connectivity check.
useBranchChannel.ts — shared realtime hook with reconnect-on-failure (exponential backoff on CHANNEL_ERROR/TIMED_OUT/CLOSED), used across all realtime subscriptions.
pm2 (ecosystem.config.js, fork mode, kill_timeout 15s, crash-loop protection) — graceful shutdown live-tested.
6. Design System (Dashboard/POS/Admin only)

Scope: Dashboard/POS/admin only. Storefront ((website)/*, features/website, features/online-ordering, customer-facing reservation flow) stays on the existing orange brand (
#e8570e) — explicitly out of scope until Zakir decides otherwise. Exception carved out in a prior session: the emoji→lucide icon sweep was applied repo-wide, including storefront, per explicit instruction — this did not touch colors/tokens, only icon representation.

Reference: "BISTRO - Restaurant Food Dashboard" — matched exactly (colors, spacing, layout, radius, fonts).

Primary: deep violet 
#5B21B6
Coral/accent: 
#F97362 — sparing accent only (variant="cta"), not the default action color
Background: off-white 
#F8F7FC, cards white
Generous border radius: rounded-2xl/3xl/full, pills everywhere
Font: Plus Jakarta Sans (swapped from Geist)

Color usage rule: Violet is the default action color throughout — general admin actions (Save, Add, Create, Reassign), the POS Place Order button, and the cart Total figure all use violet (bg-primary/text-primary). Coral is reserved for sparing accent use elsewhere (badges, occasional highlight). Do not put coral back on Place Order/Total without explicit re-confirmation from Zakir.

Design tokens (src/app/globals.css):

--primary: #5b21b6, --coral: #f97362 (separate from --accent, which stays a soft violet hover-tint — deliberate, to avoid breaking existing soft-hover-tint usage across ~100 components).
Radius scale via @theme block (Tailwind v4: --radius-sm through --radius-3xl). @theme is valid v4 syntax — VS Code's CSS linter will false-positive flag it as unknown; silenced via .vscode/settings.json.
Sidebar tokens: violet-on-violet (--sidebar-bg: #5b21b6, white/lilac text).
Button variant variant="cta" (coral) — sparing use. Badge variants chip-violet, chip-coral, chip-blue, chip-green.
No --success/--warning tokens exist (confirmed via grep). Raw emerald/amber colors used for paid/discount/warning-type UI are intentional, not oversights — leave as-is unless Zakir wants these tokens formally added (bigger decision, cross-file).
destructive/destructive-foreground — real token, used for cancel/danger/unpaid states. Prefer this over raw red wherever applicable.
Global button cursor rule added this session: button:not(:disabled), [role="button"]:not(:disabled) { cursor: pointer; } in globals.css, alongside the pre-existing a { cursor: pointer } rule. Together these cover every real interactive element repo-wide — confirmed via grep, no <div onClick>/<span onClick> fake-buttons exist except 2 modal backdrop overlays (intentionally left without pointer cursor).

Glassmorphism: removed entirely from dashboard/POS scope (backdrop-blur-* stripped from all overlays — dialog.tsx, alert-dialog.tsx, sheet.tsx, and per-feature modals). Overlay dim uses bg-black/50 (not bg-foreground/50, which silently compiled to nothing — see bug patterns below). Storefront decorative blur usages (About badge, Hero badges, Navbar scroll blur) intentionally left alone — out of scope.

confirm()/alert() sweep: complete dashboard-wide. All native confirm()/alert() replaced with showConfirm()/showAlert() from AlertModalProvider (Promise-based showConfirm() added alongside existing showAlert()).

Checkbox theming: accent-primary Tailwind class is unreliable for the custom violet token — checkboxes render native browser blue instead. Fixed pattern: use inline style={{ accentColor: "var(--primary)" }} instead of the accent-primary/accent-* class. Applied to CouponFormModal.tsx, CategoryFormModal.tsx, ItemFormModal.tsx. Any remaining/future checkboxes should use this same inline-style pattern, not the Tailwind accent-* utility.

Checkbox groups matching Select theme: where a checkbox list needs to visually match the Select dropdown's design language (used in CouponFormModal.tsx's Branches and Applies-To dish lists), use: outer container rounded-xl border border-input bg-background p-2, each row rounded-lg px-2 py-1.5 hover:bg-primary-light hover:text-primary transition-colors. This keeps native multi-select checkboxes (not converted to a fake dropdown) but gives them the same visual polish as Select.

Favicon: src/app/icon.svg added this session — violet circle (#5B21B6) with a white flame glyph, matching the sidebar's flame-in-circle motif. Next.js App Router auto-serves this as the favicon with no config needed; old default Vercel favicon replaced.

Attendance auto-renew (src/features/attendance/actions.ts, markAttendanceAction): marking a staff member "present" while they have a genuinely open session from a PREVIOUS day (not today's row) now auto-closes that old session at 23:59:59.999 of its own date before opening today's fresh session, instead of throwing the attendance_one_open_session unique-constraint error. The error path itself was also quieted — pgError code 23505 is an expected/handled business case, not logged to console/Sentry anymore, only genuinely unexpected DB errors are.

7. Known Bug Patterns (check these first)
Missing manual utility class: globals.css defines --token CSS variables in :root, but the matching .bg-token/.text-token/.border-token/.ring-token utility in the manual @layer utilities block is sometimes never added — Tailwind v4 with hand-rolled tokens does not auto-generate these. Symptom: element renders transparent, black, or falls back to browser default. Hit repeatedly: .bg-popover, .text-popover-foreground, .border-card, .text-primary-foreground, .bg-foreground (caused the transparent-modal-overlay bug — fixed by switching to bg-black/50, a real built-in Tailwind color). Always grep globals.css for the class before assuming a deeper bug.
Service worker caches stale JS: the rider push-notification service worker caches old bundles independently of .next cache. If a confirmed-correct fix doesn't show up after clearing .next + hard refresh, check DevTools → Application → Service Workers → Unregister + Clear Site Data.
Native HTML form elements can't be restyled: <select>, <input type="time">, <input type="date"> — replace with the themed Select primitive, TimePicker (src/components/ui/time-picker.tsx), or DatePicker (src/components/ui/date-picker.tsx). Both TimePicker/DatePicker take value/onChange, min/max optional. DatePicker's value prop is typed Date | null, not Date | undefined — always pass null, not undefined, when empty.
Garbled terminal-paste characters are a display artifact only (emoji/em-dash/middot showing as â€", ðŸ½ï¸, Â·) — the actual files are correct UTF-8. Confirmed by Zakir after several false-positive "fixes" were proposed. Do not touch these; only fix real color/hex/style issues.
branchId sourced from the wrong place: CouponPicker.tsx and TableSelector.tsx were reading branchId from currentStaff (useAuthStore) instead of the branchId prop already threaded down from PosLayout/CartPanel. This broke silently for SUPER_ADMIN (no branch tied to their staff row) — coupons/tables would flash then disappear. Fixed: both now accept branchId as a prop from CartPanel. Confirmed working on branch-scoped ADMIN/STAFF accounts. Note: SUPER_ADMIN using POS directly is not a real use case — real staff always log in as branch-scoped ADMIN/STAFF — so no branch-selector UI is needed for SUPER_ADMIN on POS.
PowerShell ** glob does not recurse — always use Get-ChildItem -Recurse -Include *.tsx | Select-String -Pattern "...". A non-recursive search previously gave a false-clean "zero remaining" result.
PowerShell regex ≠ JS regex — no \u{...} brace syntax support (that's a JS-only feature). For emoji detection use .NET-style ranges, e.g.: Get-ChildItem -Path src -Recurse -Include *.tsx | Select-String -Pattern "[\u2600-\u27BF]|[\uD83C-\uD83E][\uDC00-\uDFFF]" (covers BMP symbols + most surrogate-pair emoji).
"Dead code" claims need two-part verification, not one grep. A file can be unreferenced directly (Select-String -Pattern "ComponentName") yet still be reachable through a barrel export (index.ts re-exporting it). Always also check: Get-ChildItem -Path src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "from [\"']@/features/<feature>[`"']"` to rule out barrel-import usage before deleting.
Grep results can look scary but be benign — read carefully before reacting. A grep matching a similarly-named-but-different file (e.g. OrderListSkeleton.tsx matching a OrderList pattern search) does not mean that file is part of a dead-code chain. Check the actual file path and folder, not just that the pattern matched.
SelectValue doesn't resolve labels for pre-populated values on mount. The Select primitive is @base-ui/react/select. Its SelectValue sub-component only derives a display label by looking up the matching SelectItem — which only exists in the DOM once the popup has been opened at least once. If a Select's value is already set when it first renders (edit mode, any value seeded from server/URL data — branch filters, category/status/role/branch selects, etc.), SelectValue silently falls back to rendering the raw stored value (e.g. a UUID) instead of the human label, until the user manually opens the dropdown once. Fix: always pass an explicit children function to SelectValue:
tsx
   <SelectValue placeholder="...">
     {(value: string) => lookupArray.find((x) => x.id === value)?.name ?? "..."}
   </SelectValue>

This is now standard practice for every Select in the codebase whose value can be non-empty on first render. Confirmed fixed across 13 files this session (see session summary above for the list) — if a new Select is added anywhere with a pre-settable value, apply this pattern proactively rather than waiting for a bug report.
11. accent-primary / accent-* Tailwind utility does not reliably apply the custom violet token to native checkboxes — renders native browser blue instead. Distinct from Bug Pattern #1 (that's about missing manual utilities for bg/text/border tokens; this is the accent-color CSS property specifically not resolving through Tailwind's accent-* utility for a custom-named color). Fix: use inline style={{ accentColor: "var(--primary)" }} on every checkbox instead of an accent-* class.
12. Never use date.toISOString().slice(0, 10) to convert a Date to a YYYY-MM-DD string. ... Apply this pattern anywhere a Date needs to round-trip through a string, not just in DatePicker consumers.
13. drizzle-kit generate can silently report "No schema changes, nothing to migrate" even when the live DB and schema.ts genuinely differ, if an orphaned meta/00XX_snapshot.json exists on disk with no corresponding .sql file or journal entry — drizzle diffs against the latest snapshot FILE it finds (by filename), not against the journal. Always cross-check all three (_journal.json entries, actual .sql files, actual meta/*_snapshot.json files) when a migration seems to vanish or generate reports no changes unexpectedly.
14. Resizing a canvas-style container that holds absolutely-positioned children with raw pixel coordinates (e.g. TableFloorPlan.tsx) does NOT make the children scale — only the box shrinks, children get clipped or overflow. Shrinking a ResizeObserver-driven container width is only safe when children are in percentage/relative units. For pixel-positioned canvases, use CSS transform:scale() on a wrapper around the native-sized canvas instead, with the outer layout box sized to match (nativeSize * scaleFactor), and remember pointer-drag deltas must be divided by the scale factor to stay accurate.
15. Base-UI Switch's `data-checked`/`data-unchecked` attribute-selector Tailwind classes were unreliable for visibility — token colors (bg-muted, bg-input) resolved to near-invisible fills against card backgrounds, and attribute-variant classes intermittently didn't apply the intended fill at all. Fixed by rewriting src/components/ui/switch.tsx to compute the checked state directly from the `checked`/`defaultChecked` props in JS and apply solid literal colors (`bg-[#5b21b6]` on / `bg-[#9ca3af]` off) via a ternary, not via data-attribute Tailwind variants. Any new toggle should use this Switch component as-is; do not reintroduce data-checked:bg-* patterns for this primitive.
16. A dashboard/admin component can be accidentally left on the old storefront orange brand instead of violet even after the main design-system pass, if it wasn't touched during that sweep (e.g. PosSettingsForm.tsx used hardcoded #e8570e/#fef3ed hex values). When a component looks visually "off-brand" in the dashboard, grep the file for raw hex literals before assuming a deeper bug.
17. Service worker (Serwist) must be registered only inside the (dashboard) route tree via `<SerwistProvider>` mounted in src/app/(dashboard)/providers.tsx, never at the root layout — the public storefront should never register or precache the app's service worker. Registering site-wide was flagged as a Lighthouse concern; fixed by scoping SerwistProvider to (dashboard)/providers.tsx only, since @serwist/next does not auto-register — nothing calls navigator.serviceWorker.register unless SerwistProvider is explicitly mounted.
18. Sentry's `tracesSampleRate` in src/instrumentation-client.ts was set to 1 (100%) — this adds real client-side instrumentation overhead on every single page load, not just errors, and was the primary cause of a Lighthouse Performance score of 26 (15s FCP/LCP, 2570ms TBT) on the public storefront homepage. Fixed to `process.env.NODE_ENV === "production" ? 0.1 : 1`; re-tested score jumped to 86 (FCP 1.4s, TBT 330ms) under the same Slow-4G/low-end-phone throttled Lighthouse profile. Always check tracesSampleRate first when investigating unexplained client-side slowness — it's cheap to check and has outsized impact.
19. RESOLVED (2026-08-26, corrected/completed 2026-08-27): Runtime RangeError "Maximum call stack size exceeded" in useBranchChannel.ts was confirmed caused by duplicate/overlapping channel subscriptions to the same topic (e.g. Tables page + POS TableSelector both mounting useBranchChannel(branchId, "tables", ...) simultaneously) re-entering the reconnect handler before the stack unwound. A shared, ref-counted channel registry — src/lib/realtime/channelRegistry.ts — was created, keyed by topic string. CORRECTION: the 2026-08-26 fix created the registry but useBranchChannel.ts was NOT actually updated to use it — it still ran its own separate duplicate supabase.channel() + reconnect-with-backoff logic. This meant all 7 of its call sites (AttendanceTable.tsx, RiderDashboard.tsx, useMenu.ts, useNotifications.ts, useRealtimeOrders.ts, TableSelector.tsx, TablesPageClient.tsx) were still unprotected. Actually fixed 2026-08-27: useBranchChannel.ts rewritten as a thin wrapper delegating to subscribeBranchChannel() from the registry — same external signature, zero changes needed at any of the 7 call sites (confirmed via grep before the change). Now there's exactly one real channel + one reconnect loop per topic regardless of how many components subscribe. tsc clean.
20. RESOLVED (2026-08-26): duplicate restaurant table names within the same branch/section are now blocked at the action layer — createTableAction/updateTableAction in features/tables/actions.ts check for an existing active table with the same tableNumber in the same branchId+sectionId before insert/update. A DB-level unique index is a possible future hardening but not currently needed.
21. RESOLVED (2026-08-27): createPublicOrderAction (src/features/online-ordering/actions.ts) never called broadcastChange() or createNotification() — an order placed via the public online-ordering storefront did not appear in real time on the dashboard and fired no notification, only showing up after a manual refresh. Root cause: this customer-facing order path was built/tested against POS-created orders' realtime behavior but never had the same broadcast/notification calls added itself. Fixed: added broadcastChange(result.order.branchId, "orders") + a matching createNotification({ type: "order_new", ... }) call (same shape as the POS path in features/orders/actions.ts) right after the existing logAudit call. Deliberately did not add a riders/deliveries broadcast since online orders always start riderId: null, status: "unassigned" — no rider assignment happens at creation time. GENERAL LESSON: any customer-facing/public action path (online-ordering, and potentially reservations or other public-actions.ts files) should be checked for the same broadcastChange/createNotification calls as its staff-facing equivalent whenever realtime or notifications are added to a feature — these two code paths are easy to build and test independently and silently diverge.

8. Current State — What's Done vs. Remaining
Confirmed done (do not re-convert unless a new bug is found)
features/tables/* — multi-floor/section tabs added to TablesTab.tsx (was single shared canvas). Section actions (edit/delete) via DropdownMenu below tabs. Auto-placement on table creation (getNextPlacement), "Place N on floor" bulk-arrange for legacy unplaced tables. (Also includes prior TableDialog.tsx Select UUID-fix for Status/Shape/Section.)

Table color: DONE. Real wood-tone palette (oak/walnut/mahogany/espresso/cherry/ash — not generic Tailwind colors), 6-swatch picker in TableDialog.tsx, TABLE_COLOR_STYLES/getTableColorStyle() in table-status-styles.ts. Status changed from occupied-only pulsing dot to an always-visible small corner dot for all 4 statuses.

TableFloorPlan.tsx: real shapes (sharp corners on square/rectangle, rounded on circle/oval), capacity-based tile sizing, blueprint grid background, container-width-responsive canvas (no CSS scale transform), optimistic drag-to-reposition for tables (no flicker/snap-back). Chairs are real top-view SVG shapes (seat+backrest), shape-aware placement (rectangle = long sides only, square = round-robin all 4 sides, circle/oval = radial), fixed per-side rotation angle (not atan2-to-center, which only works for round shapes).

Chairs/Sofa seating feature (DB schema change, migration 0020): seatingType ("chairs"|"sofa") + chairLayout (nullable jsonb, relative {dx,dy,angleDeg} per seat from table center — travels with the table on reposition) added to restaurant_tables. New action updateTableChairLayoutAction(id, layout|null) — null resets to computed default. TablesTab.tsx has an "Edit Seating" mode (toggle button) that disables table click/drag, makes chairs individually draggable, and requires an explicit Save Seating click (drag does not autosave) — Cancel and Reset to Default also provided. Sofa rendering: square/rectangle = one bench per occupied side with backrest stripe + seams; circle/oval = hand-rolled SVG elliptical arc band (~70% coverage, 30% gap at bottom for walk-in access) — THIS ROUND-SOFA PIECE IS UNVERIFIED IN BROWSER, see Session Summary.

STATUS: chair-drag-flicker fix and Reset to Default were confirmed working (2026-08-22). Sofa seating fully built out and confirmed (2026-08-22): configurable entrances/gaps via sofaLayout jsonb column (migration 0021), max 3 sides selectable (openSides for square/rectangle, gaps for round), required when seatingType=sofa, checkbox-dropdown UI in TableDialog between Seating and Section selects. RoundSofa renders multiple gap segments via computeSofaBands(); straight benches skip openSides. Tuned values in TableFloorPlan.tsx: SOFA_THICKNESS=34, SOFA_LENGTH_EXTRA=32, STRAIGHT_SOFA_GAP=10, backrestThickness=14. No known open issues.
features/staff/* — staff-table.tsx full redesign; add-staff-dialog.tsx forms pass done, Branch-select UUID bug fixed
features/reports/* — all 4 report views redesigned to dashboard stat-card style
features/menu/* — fully converted, hand-rolled confirm modals replaced with showConfirm(). Forms pass done on CategoryFormModal.tsx and ItemFormModal.tsx. Category/Status Select UUID bugs fixed. ItemCard.tsx redesigned this session (image-forward layout, see below) — branch filter repositioning next to "Add Item" still pending, see Session Summary above.
features/coupons/* — CouponFormModal.tsx full redesign done: forms pass, checkbox groups restyled to match Select theme, checkbox accent-color fixed, Discount Type Select UUID-fixed, DatePicker timezone bug fixed + past-date disabling added.
features/operating-hours/* — colors fixed; custom TimePicker built
features/reservations/ReservationsTab.tsx (admin-side) — already token-based
features/pos/* — design conversion done; CouponPicker/TableSelector branchId-prop bug fixed (Bug Pattern 5). Forms pass done on TableSelector.tsx, MenuSearch.tsx, DeliveryDetailsForm.tsx. RiderSelector.tsx Select UUID bug fixed.
features/delivery-areas/* — hex-color fixes applied, confirmed clean. Forms pass done on DeliveryAreaFormModal.tsx. BranchSelector.tsx Select UUID bug fixed.
features/settings/* shell — confirmed clean. SettingsBranchFilter.tsx Select UUID bug fixed.
features/orders/* — fully done in a prior session (see below). OrderActions.tsx Payment Method Select UUID bug fixed this session.
features/admins/* — AdminDialog.tsx forms-pass false-positive confirmed (hidden file input only); Role/Branch/Status Select UUID bugs fixed this session.
features/dashboard/* — DashboardBranchFilter.tsx Select UUID bug fixed this session.
features/audit-logs/* — AuditLogFeed.tsx forms pass done (2 native selects → themed Select) plus sentinel-value fix for clearing filters.
components/ui/time-picker.tsx, components/ui/date-picker.tsx — both done; date-picker.tsx now also exports toDateKey/fromDateKey helpers (see Bug Pattern 12)
select.tsx primitive restyled
Global cursor-pointer on links AND buttons (button:not(:disabled), [role="button"]:not(:disabled)) — extended this session
Offline POS: enqueue-on-failure, OfflineSyncManager, kitchen ticket iframe printing, DataCloneError fix
Delivery-area features — scoped, permission-scoped
Security/scalability/speed checklist items (see §9) — all V1-blocking items done
Emoji → lucide-react icon sweep — done, see dedicated section below
Forms consistency pass — fully closed out this session. All 11 originally-flagged files done.
Select-shows-UUID-instead-of-label bug — fully swept and fixed this session. 13 files, see Bug Pattern #10 and Session Summary above. Any new Select with a pre-settable value must use the same pattern proactively.
features/orders/* — fully done (prior session)

All components confirmed live vs dead, all color/token issues fixed, dead code deleted.

Live components (all fixed and confirmed clean):

OrderCard.tsx, OrderStatusBadge.tsx, OrderDetail.tsx, OrderActions.tsx (native select → themed Select; Payment Method UUID-select bug fixed this session), RiderAssignment.tsx, BillModal.tsx, KitchenTicketModal.tsx, CancelConfirmModal.tsx, OrderHistoryLayout.tsx, OrderHistoryTable.tsx, OrderHistoryFilters.tsx, useOrderHistoryTable.tsx.

Confirmed dead code — DELETED: OrdersLayout.tsx, OrderList/OrderList.tsx, OrderList/OrderListHeader.tsx, OrderList/OrderRow.tsx, OrderList/OrderStatsBar.tsx, OrderFinancials.tsx, OrderItemsTable.tsx. Verified via repo-wide grep + barrel-export check.

Not dead — do not confuse with the above: src/features/orders/shared/OrderListSkeleton.tsx is a different, live file, imported by both real Active Orders/Delivery pages.

Emoji → lucide-react icon sweep — done (prior session)

Fixed and confirmed: about/page.tsx, CustomerTypeSelector.tsx/OrderTypeSelector.tsx (also fixed a real ORDER_TYPES/CUSTOMER_TYPES name-mismatch bug), HeroSection.tsx, KitchenTicketModal.tsx.

Diffs given, not yet grep-confirmed applied — verify before assuming done: checkout/page.tsx (💵→Banknote), RiderDashboard.tsx (🔔→Bell), CategoryRow.tsx/CategorySidebar.tsx (🍽️→UtensilsCrossed), MenuGrid.tsx (🍽️→UtensilsCrossed), MenuItemCard.tsx POS (CATEGORY_EMOJI→CATEGORY_ICON map, 8 entries), CouponPicker.tsx (✕→X), WebsiteFooter.tsx (❤️→Heart), CategoryTabs.tsx (🍽️→UtensilsCrossed), MenuItemCard.tsx online-ordering (🍴→UtensilsCrossed).

Intentionally left as-is: CategoryFormModal.tsx placeholder 🔥 (admin-entered custom emoji field, Zakir's explicit call).

Menu page redesign — IN PROGRESS this session
ItemCard.tsx — redesigned, done. Image-forward layout chosen (of 3 variants shown via Visualizer): full-width top image block (h-36), icon actions (star/edit/delete) as floating white chips over the image top-right, name + prominent price below, variant pills, status toggle with top divider. Uses bg-secondary for the image placeholder background (not bg-muted border).
ItemsPanel.tsx grid — updated, done. grid-cols-1 xl:grid-cols-2 → grid-cols-2 lg:grid-cols-3 (both skeleton and real grid) so 3 narrower cards fit per row. Breakpoint/sizing may still need tuning based on Zakir's actual screen — ask before assuming it's final.
Branch filter placement — NOT DONE YET. Zakir wants the branch filter (currently rendered above categories via MenuFilters.tsx, injected as a sibling wrapping MenuLayout) moved to sit inline beside the "Add Item" button in ItemsPanel.tsx's header row. This requires restructuring where the branch-filter Select renders relative to MenuLayout/ItemsPanel/useMenuFilters() context. This is the next task — ask for CategorySidebar.tsx too if needed to fully understand the current layout shape before restructuring.
Dish card visual options were explored using the Visualizer tool (visualize:show_widget) with 3 side-by-side mockups styled in the app's own violet/coral tokens — useful pattern to reuse for future "show me options" visual design requests instead of only describing in text.
Forms consistency pass — CLOSED OUT this session

All 11 originally-flagged files done. See Bug Pattern list and Session Summary above for full detail. No remaining forms-pass work identified.

Full responsiveness audit per screen — DONE (completed 2026-08-24), all screens confirmed:
Dashboard, Sidebar (global — src/store/useSidebarStore.ts, mobile/tablet overlay + auto-close on nav <1024px), POS (3-tier MenuPanel/PosLayout/CategoryPills), Orders (mobile push pattern, list↔detail), Tables (TablesTab.tsx wrap/scroll fixes confirmed applied; TableFloorPlan.tsx rewritten to CSS transform:scale() on native 900x600 canvas — floor scale MIN_SCALE = 850/CANVAS_WIDTH, drag handlers divide deltas by scale, custom short/centered CanvasScrollbar.tsx built to replace full-length native scrollbars), Menu (branch filter already inline in ItemsPanel.tsx header — no repositioning was actually needed; CategorySidebar converted to horizontal long-press pill bar below lg: via new CategoryPillBar.tsx, long-press opens a manage modal for Edit/Toggle/Delete; MenuStatsBar.tsx horizontal-scroll row below sm:; item grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3), Staff (card grid already responsive; ItemFormModal.tsx missing overflow-hidden on rounded-2xl container fixed — footer was squaring off the bottom corners), Attendance (filters row flex-wrap, table wrapped in overflow-x-auto), Settings (SettingsTabs.tsx horizontal-scroll, OperatingHoursForm.tsx row restructured to stack on mobile, SettingsBranchFilter.tsx full-width on mobile, subtitle hidden below sm: on all 5 settings pages, WebsiteBranchSelector.tsx now shows a real message instead of rendering null when <2 branches), Reports (ReportsTabs.tsx horizontal-scroll, all 4 report pages: subtitle hidden below sm:, branch filter stacks above period filter via flex-col-reverse sm:flex-row instead of squeezing beside it, SalesReportView/OrderReportView/AttendanceReportView stat grids retiered to grid-cols-1 sm:grid-cols-2 md:grid-cols-4-or-5, MenuPerformanceReportView top/worst-seller rows stack on mobile instead of truncating item names), Reservations (already token-based, confirmed clean), Audit Logs (confirmed clean, no changes needed), Notifications (NotificationBell.tsx panel converted to a full-width bottom sheet on mobile <640px instead of a button-anchored floating panel that overlapped the collapsed sidebar).
Also fixed this session: Safari iOS toolbar overlap — h-screen (100vh) replaced with h-dvh on DashboardShell.tsx, Sidebar.tsx, and (dashboard)/pos/page.tsx, since 100vh doesn't shrink for Safari's dynamic address bar.
Deployed to Vercel (region matched to Supabase — both Mumbai — after initial cross-region latency was diagnosed as the main slowness cause pre-fix). Vercel env vars fully configured; a real Supabase secret key that had been committed to .env.example was caught by GitHub push protection before reaching the remote, placeholder substituted, and the key rotated in Supabase as a precaution.
Menu page branch-filter repositioning — turned out to be a non-issue; the filter was already correctly placed inline in ItemsPanel.tsx's header next to Add Item from a prior session. Only the category-to-pills conversion was actually new work this session.
Realtime

Supabase Realtime (broadcast-only, empty-signal pattern) wiring across feature domains is done — Orders, Tables, Riders, Attendance, Menu Availability, Notifications all confirmed complete. Sidebar toast + sound notification layer is the next piece to build on top of this.

Also open: kiosk printing resolution (Chrome --kiosk --kiosk-printing reliability; fallback = local print daemon), POS offline Layer 4d pending-orders nav badge, pg_dump backup script via GitHub Actions.

Offline coupon design decisions (finalized): equal split of maxUses across branches at creation time (coupon_branch_allocations), never recalculated. No Realtime-based token sync — calculated on POS load, cached alongside menu. No weighted branch splits. No reconciliation/overshoot logic (structurally impossible to overshoot by design). All terminals at a branch share one internet connection; one staff account per terminal. .catch() on CouponPicker fails closed as an interim stopgap pending real offline (IndexedDB-cache) behavior.

9. V1 Production-Readiness Checklist
Security — ✅ done. Follow-up note: env validation (Zod, src/lib/env.ts) confirmed solid. Full-app security/speed/scalability audit done 2026-08-26 (see new §8 subsection below for fixes applied and what's still open).
Scalability — indexes done (migration 0022, see below). Orders page (getOrdersAction) fixed 2026-08-26 — was fetching entire tenant order history unbounded on every load; now server-side filtered by status/date, capped at 500 rows.
Responsiveness/UI/UX — ✅ done. Full audit completed 2026-08-24, see §8 for the full per-screen breakdown. Also fixed this session: Switch/toggle component was effectively invisible (Bug Pattern #15), PosSettingsForm.tsx was off-brand orange (Bug Pattern #16).
Speed — ✅ done, verified via Lighthouse. Sentry tracesSampleRate fix (100%→10% in production) took the storefront homepage from a 26 to an 86 Lighthouse Performance score under Slow-4G/low-end-phone throttling (see Bug Pattern #18). Service worker offline support for POS was fixed this session — SerwistProvider was never actually mounted anywhere, meaning offline POS caching was non-functional in production until now (Bug Pattern #17); confirmed registered/scoped to (dashboard) only.
Migration script (import from prior POS systems) — not started. Flagged as the top priority once backups are done — this is the main blocker to actually onboarding a restaurant off an existing system.
Database backups (pg_dump via GitHub Actions) — not started. Flagged as the single highest-priority remaining item before accepting any real restaurant's production data — currently zero backup coverage.
Known open bugs before first real customer: none remaining from the original list — useBranchChannel RangeError (Bug Pattern #19) and duplicate table names (Bug Pattern #20) both resolved 2026-08-26, see §7 and Session Update.
V2 (post-V1)
Database backups (pg_dump via GitHub Actions) — not started
RLS (real implementation) — deferred by decision, see §3
Subscription/payment enforcement (offline-aware grace period design) — not started
Multilingual/i18n (translation keys, RTL, locale formatting) — not started
Deployment/control-plane dashboard (fleet-wide DB/health/Sentry view) — not started
Own/dedicated Supabase instance — not started
Caching layer (Redis via Upstash) — deferred by decision; current perf numbers don't justify invalidation-bug risk yet
10. Roadmap (condensed)

Priority order across all versions: security → reliability → performance → UX → real customer demand → business value. POS staff must never be burdened with admin-level work (inventory, purchasing, analytics) during service.

V1 (current): website, multi-branch, reservations, full RBAC, dashboard analytics, POS (offline-first), coupons, orders, attendance, staff mgmt, audit logs, menu/table mgmt, realtime, notifications, reports/printing, subscription blocking, security (RLS deferred), backups, deployment/control plane.
V2 — Inventory & Business Mgmt: ingredient/stock system, receiving/adjustments/transfers, recipe/BOM auto-deduction, food costing, supplier/purchasing, wastage/expense tracking, profitability reporting, CRM (profiles, loyalty, feedback, campaigns).
V2 — Payments: provider-adapter architecture (never hardcoded), full payment status lifecycle, webhook-driven, refunds, reconciliation, cash drawer/shift tracking, multi-jurisdiction tax engine, per-country local payment gateway integrations (built on the adapter architecture — e.g. relevant local providers for Pakistan/Australia/France/Spain/Germany, researched and confirmed at build time per country).

International readiness (V2, full scope) — Pakistan, Australia, France, Spain, Germany all targeted for V2 completion, rollout order Pakistan → Australia → France/Spain/Germany:
- i18n: translation keys, RTL where applicable, locale formatting (dates/numbers/currency).
- Multi-jurisdiction tax engine: correct tax rules per country/region.
- Local currency handling.
- Locally-compliant receipt/invoice formats.
- Local payment gateway support (see Payments above).
- Legal/data-residency/privacy compliance per country (e.g. GDPR for France/Spain/Germany) — requires explicit legal research per country, not just engineering work.
- Business licensing/registration requirements per country — informational only, verified with local counsel/authorities, not something the app can "build."
- Never claim a country is compliance-ready without verifying current local legal/tax/licensing requirements at build time — requirements change, and this app cannot self-certify legal compliance.

Legal eligibility gate (non-engineering, must be done by Zakir before operating in a given country — not something this codebase can complete on its own):
1. GDPR-compliant Privacy Policy + Terms of Service drafted (lawyer or compliance service, e.g. Termly/iubenda).
2. Business entity registered in home country; local business/tax registration (VAT/GST) completed per country once trading there.
3. Payment provider (e.g. Stripe) application approved for each target country.
4. Data export + account deletion features built once policy requirements are known (engineering work, gated on step 1).
Only once all four are done for a given country should Zaiqa be described as eligible to operate there — engineering readiness (i18n/tax engine/payments adapter) alone is NOT sufficient.
V3 — Analytics/Intelligence: forecasting (always with confidence intervals), smart inventory, menu intelligence, staff analytics (privacy-conscious), KDS, delivery optimization, waitlists, QR/table ordering, third-party integrations via adapter pattern.

Business notes: founding-customer discounts for early adopters only, not permanent pricing. Migration program scoped to what old systems can actually export. Feedback triage: Critical (security/data-loss) → High (multi-restaurant demand) → Medium → Low → Reject/defer.

11. Compliance & Payments — Pakistan launch (surfaced 2026-08-27, NOT started, not previously tracked anywhere in this document)

Confirmed via grep (`Get-ChildItem -Path src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "FBR|POS-Invoice|fiscal" -List`) — zero FBR integration exists in the codebase currently.

Why it matters: every competitor found in Pakistani restaurant-POS market research (itKINS, Mint POS, oneclickpos, eHisabKitab, Granet Pro) advertises "FBR-integrated" as a headline feature. May be a real sales blocker for tax-registered/audit-conscious restaurant owners in the Quetta rollout, though not necessarily for every small/informal cafe.

What FBR integration actually requires (not just a receipt format change):
- Restaurant must independently register with FBR's POS Integration system — this is the restaurant owner's own legal/business step, cannot be done "for them" using just their documents.
- Software must call FBR's live invoicing API in real time on every sale; FBR returns a verification/QR code that must print on the receipt.
- Requires sandbox/test environment access, then production API credentials PER RESTAURANT (matches existing per-tenant deployment architecture).
- New DB fields needed: invoice numbers, FBR response codes, sync status, retry-on-failure logic (must not break offline POS if FBR's API is down mid-sale).
- Rough estimate (unverified planning estimate, not a commitment): 2-4 weeks engineering, possibly longer given inconsistent public FBR documentation (reported anecdotally by other POS vendors).

Payment gateways (JazzCash, Easypaisa, card) — none started, no code exists:
- Each requires a separate merchant account belonging to the restaurant owner (their own CNIC + business bank account, likely NTN for business-tier accounts) — NOT Zaiqa's.
- Separate API integration per gateway; ~3-5 days engineering each once merchant credentials exist, assuming smooth docs. All three combined: ~2-3 weeks.
- Total FBR + all 3 gateways: realistically 5-7 weeks; treat 4 weeks as optimistic, not guaranteed.

CNIC vs NTN: CNIC = personal national ID every citizen has. NTN = FBR-issued tax number for a business, separate from CNIC — a restaurant that isn't formally tax-registered may not have one, and FBR POS integration + business-tier payment gateway accounts likely require it. Worth checking with early Quetta sales leads whether they already have one — could be a real onboarding blocker for smaller/informal restaurants.

CRITICAL — how this must be architected, do NOT build it the naive way:
1. CNIC/NTN numbers and payment gateway API keys are sensitive personal/financial data belonging to the restaurant owner. Do NOT store in .env files (fine only for infrastructure secrets like DB connection strings, which is the existing correct use). Store as encrypted columns in the tenant's own DB (e.g. tenant_settings or a dedicated table), entered once via an admin onboarding form.
2. Zaiqa/the developer generally CANNOT register a restaurant's FBR POS integration or a JazzCash/Easypaisa merchant account on their behalf using only their ID numbers. FBR registration carries legal/tax liability for the business owner specifically. Payment gateway merchant agreements are contracts between the restaurant and the provider, typically requiring the business owner's direct application/authorization. Doing this unilaterally risks violating provider terms and creates fraud-liability exposure for both parties.
3. Correct model: FBR and payment gateway integration is an OPT-IN module per restaurant. Zaiqa can help/guide the owner through registration, but the actual registration must be done by/with the owner's direct participation and authorization. If a restaurant doesn't want it, they run without that module — same as any other optional feature (coupons, reservations, etc.).

Decision needed from Zakir before any code is written here: is this required for initial Quetta launch, or can it be added after the first customers are onboarded? Two existing hard blockers (DB backups, migration script — see §9) should likely take priority regardless.


## Session Update — 2026-08-26

Confirmed done and working:
- Duplicate table names blocked at action layer (src/features/tables/actions.ts) — createTableAction/updateTableAction now check for an existing active table with the same tableNumber in the same branchId+sectionId before insert/update.
- POS TableSelector.tsx now groups tables by section (fetches getTableSectionsAction alongside getTablesAction, renders labeled groups) instead of a flat undifferentiated grid — fixes visual confusion from same-numbered tables in different sections.
- useBranchChannel "Maximum call stack size exceeded" RangeError fixed. Root cause: duplicate-topic channel subscriptions (e.g. Tables page + POS TableSelector both mounting a "tables" channel for the same branch) could re-enter the CHANNEL_ERROR/CLOSED handler before the stack unwound. Fix: new src/lib/realtime/channelRegistry.ts — a module-scope, ref-counted registry keyed by topic string. useBranchChannel.ts was rewritten to call subscribeBranchChannel(branchId, resource, onEvent) from the registry instead of owning its own supabase.channel() — now there's exactly one real channel + one reconnect loop per topic no matter how many components watch it.
- Dynamic-import bug fixed in createOrderAction's transaction (src/features/orders/actions.ts) — was doing `(await import("@/db/schema")).menuCategories` on every single order created instead of a top-level import. Now menuCategories is imported normally at the top of the file.
- Public reservation endpoints rate-limited (src/features/reservations/public-actions.ts) — createReservationAction and getMyReservationAction had zero rate limiting. getMyReservationAction in particular was brute-forceable (looks up by phone + a 6-char code, no throttle). Added to src/lib/rate-limit.ts: publicReservationRateLimit (10/10min) and reservationLookupRateLimit (5/min), both keyed by IP via headers().get("x-forwarded-for"), same pattern as publicOrderRateLimit.
- Missing indexes added — migration 0022_slippery_ultragirl.sql. staff (tenant_id, branch_id), restaurant_tables (branch_id, section_id), table_sections (branch_id), menu_categories (branch_id), menu_items (branch_id, category_id), menu_item_variants (menu_item_id), modifier_groups (menu_item_id), modifier_options (modifier_group_id). Applied by hand in Supabase SQL editor first (per standing rule), then `npm run db:generate` reconciled the ledger — generated file matched exactly, db:migrate was NOT run (would fail re-creating existing indexes). orders/payments already had indexes from an earlier migration.
- Orders architecture fixed — this was the biggest one. getOrdersAction (src/features/orders/actions.ts) had no date/status filtering and no limit: it fetched the tenant's ENTIRE order history with full nested relations (items/discounts/payments/table) every time, refetched every 60s and on every realtime order event, with all status/date/dish filtering done client-side in useOrders.ts. This would degrade permanently as order history grows. Fixed:
  - getOrdersAction now accepts an optional `GetOrdersFilters { statuses?, dateFrom?, dateTo? }`, applies them in the where clause, capped at 500 rows (MAX_ORDERS_RETURNED).
  - useOrders.ts passes scopeStatuses/dateFrom/dateTo through to the server call (added to the queryKey so each view caches separately) instead of filtering after fetching everything.
  - useOrderHistory.ts now computes real dateFrom/dateTo bounds from its existing date-preset/date-range UI (computeServerDateBounds()) and sends them to the server. Default preset changed from null (unbounded) to "today". isDateFiltered logic adjusted so "today" doesn't show as an active filter badge.
  - useActiveOrders.ts / useDeliveryOrders.ts needed no changes — they already passed scopeStatuses, which now does real work server-side.
  - Confirmed working in browser across Active Orders, Delivery, and Order History.

IN PROGRESS — start here next session:
Dashboard bundle refactor. src/features/dashboard/actions.ts has 7 exported actions (getDashboardStatsAction, getRevenueDataAction, getTopDishesAction, getRecentOrdersAction, getTableOccupancyAction, getOrderTypeBreakdownAction, getReservationStatsAction), each independently doing its own supabase.auth.getUser() + db.query.staff.findFirst() — the dashboard page fires all 7 in parallel on load, meaning 7 separate auth round trips for one page. Chosen fix (the "real fix", not the lighter dedupe-only option):
  1. Add a shared `resolveDashboardAuth(overrideBranchId?)` helper in this file — one auth.getUser() + staff lookup + branch resolution, returning `{ ok: true, tenantId, branchId } | { ok: false, error }`.
  2. Extract each of the 7 functions' DB logic into a private `compute*(tenantId, branchId, ...)` function (computeDashboardStats, computeRevenueData, computeTopDishes, computeRecentOrders, computeTableOccupancy, computeOrderTypeBreakdown, computeReservationStats).
  3. Keep the 7 exported actions as thin wrappers: call resolveDashboardAuth(), then delegate to the matching compute* function — preserves backward compatibility for any other caller.
  4. Add a new `getDashboardBundleAction(range, overrideBranchId?)` that calls resolveDashboardAuth() ONCE, then runs all 7 compute* functions (via Promise.all where independent) and returns one combined object.
  5. Update src/features/dashboard/hooks/useDashboardData.ts to call the bundle action instead of firing 7 separate useQuery hooks against the 7 individual actions.
  6. Check whatever dashboard page/components currently consume useDashboardData's individual pieces — confirm they still get the right shape after the hook change.

  Status: nothing was actually applied. One diff chunk (adding resolveDashboardAuth + starting to extract getDashboardStatsAction's body) was drafted in chat but never confirmed applied by Zakir — treat src/features/dashboard/actions.ts as still in its ORIGINAL unmodified state. Start this fresh.

  Files needed to do this work — ask for these first:
  - src/features/dashboard/actions.ts (full file, 564 lines — already have full content from this session if picking up same thread; otherwise re-fetch)
  - src/features/dashboard/hooks/useDashboardData.ts
  - Whatever component(s) render the dashboard page and call useDashboardData / the individual hooks (ask Zakir for the dashboard page.tsx and any component under src/features/dashboard/components/ that consumes stats/revenue/topDishes/etc.)
  - src/types/analytics.ts (for DashboardStats/RevenueDataPoint/TopMenuItem/OrderTypeBreakdown shapes, referenced but not yet viewed this session)

Still open after that (lower priority, not started):
- TableFloorPlan.tsx and RevenueChart.tsx aren't lazy-loaded via next/dynamic — minor speed win, route-splitting already isolates them from other routes so this is a small gain.
- Database backups via GitHub Actions (pg_dump) — not started. Highest-priority item before accepting any real restaurant's production data.
- Migration script from prior POS systems — not started. Top priority once backups are in place; this is the main blocker to onboarding a real restaurant.