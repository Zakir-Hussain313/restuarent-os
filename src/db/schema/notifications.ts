import { pgTable, uuid, text, timestamp, primaryKey, index } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { branches } from "./branches";
import { staff } from "./staff";

export type NotificationType =
    | "order_new"
    | "reservation_new"
    | "order_stuck"
    | "table_out_of_service"
    | "reservation_upcoming"
    | "staff_shift"
    | "rider_status"
    | "staff_created"
    | "manual_override"
    | "device_pending_approval";

export const notifications = pgTable(
    "notifications",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        tenantId: uuid("tenant_id")
            .notNull()
            .references(() => tenants.id, { onDelete: "cascade" }),
        branchId: uuid("branch_id")
            .notNull()
            .references(() => branches.id, { onDelete: "cascade" }),

        type: text("type").$type<NotificationType>().notNull(),
        title: text("title").notNull(),
        message: text("message").notNull(),

        resourceType: text("resource_type"),
        resourceId: uuid("resource_id"),

        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [
        index("notifications_branch_id_idx").on(t.branchId),
        index("notifications_tenant_id_idx").on(t.tenantId),
        index("notifications_branch_created_at_idx").on(t.branchId, t.createdAt),
    ]
);

export const notificationReads = pgTable(
    "notification_reads",
    {
        notificationId: uuid("notification_id")
            .notNull()
            .references(() => notifications.id, { onDelete: "cascade" }),
        staffId: uuid("staff_id")
            .notNull()
            .references(() => staff.id, { onDelete: "cascade" }),
        readAt: timestamp("read_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [
        primaryKey({ columns: [t.notificationId, t.staffId] }),
        index("notification_reads_staff_id_idx").on(t.staffId),
    ]
);

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
export type NotificationRead = typeof notificationReads.$inferSelect;