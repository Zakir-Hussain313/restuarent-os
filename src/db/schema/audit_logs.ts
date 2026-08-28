import {
    pgTable,
    uuid,
    text,
    timestamp,
    jsonb,
    index,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { branches } from "./branches";
import { staff } from "./staff";

// The resource types that can appear in audit logs.
// Kept as a plain TS union (not a pgEnum) — adding a new loggable resource
// should not require a DB migration, only a server action change.
export type AuditResource =
    | "order"
    | "order_item"
    | "payment"
    | "menu_item"
    | "menu_category"
    | "table"
    | "staff"
    | "customer"
    | "delivery"
    | "attendance"
    | "tenant_settings"
    | "branch_settings"
    | "branch"
    | "coupon"
    | "branch_device";

// The actions that can be audited.
// Same reasoning as AuditResource — plain union, not pgEnum.
export type AuditAction =
    | "create"
    | "update"
    | "delete"
    | "status_change"
    | "login"
    | "logout"
    | "assign"
    | "unassign"
    | "print";

export const auditLogs = pgTable(
    "audit_logs",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        tenantId: uuid("tenant_id")
            .notNull()
            .references(() => tenants.id, { onDelete: "cascade" }),

        // branchId is nullable — some actions are tenant-wide (e.g. menu changes,
        // staff management) and do not belong to a specific branch.
        branchId: uuid("branch_id").references(() => branches.id, {
            onDelete: "set null",
        }),

        // The staff member who performed the action.
        // onDelete: "set null" — if a staff record is removed, the audit log
        // entry must be preserved for compliance; actorId becomes null but the
        // record remains intact.
        actorId: uuid("actor_id").references(() => staff.id, {
            onDelete: "set null",
        }),

        // Denormalized snapshot of the actor's name at the time of the action.
        // Ensures audit logs remain readable even after a staff record is deleted.
        actorName: text("actor_name"),

        // The type of resource that was acted upon (e.g. "order", "menu_item").
        resource: text("resource").$type<AuditResource>().notNull(),

        // The ID of the specific resource instance.
        resourceId: uuid("resource_id").notNull(),

        // The action performed (e.g. "create", "status_change").
        action: text("action").$type<AuditAction>().notNull(),

        // Full before/after snapshots of the resource at the time of the action.
        // Stored as jsonb — shape varies per resource type.
        // null for "create" (no previous state) and "delete" (no new state).
        oldValue: jsonb("old_value"),
        newValue: jsonb("new_value"),

        // Optional human-readable description for complex actions.
        description: text("description"),

        // Immutable — audit logs are never updated, only inserted.
        createdAt: timestamp("created_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (t) => [
        // RLS enforcement
        index("audit_logs_tenant_id_idx").on(t.tenantId),
        // Branch-scoped audit trail
        index("audit_logs_branch_id_idx").on(t.branchId),
        // "All actions by this staff member"
        index("audit_logs_actor_id_idx").on(t.actorId),
        // "All changes to this resource type" (e.g. all order changes)
        index("audit_logs_resource_idx").on(t.resource),
        // "Full history of this specific record" — most common audit query
        index("audit_logs_resource_id_idx").on(t.resourceId),
        // Tenant audit trail ordered by time
        index("audit_logs_tenant_created_at_idx").on(t.tenantId, t.createdAt),
        // Resource instance full history with time ordering
        index("audit_logs_resource_id_created_at_idx").on(
            t.resourceId,
            t.createdAt
        ),
        // Actor activity timeline
        index("audit_logs_actor_created_at_idx").on(t.actorId, t.createdAt),
    ]
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;