import { pgTable, uuid, timestamp, index } from "drizzle-orm/pg-core";
import { branches } from "./branches";
import { staff } from "./staff";

export const notificationClears = pgTable(
    "notification_clears",
    {
        staffId: uuid("staff_id")
            .primaryKey()
            .references(() => staff.id, { onDelete: "cascade" }),
        branchId: uuid("branch_id")
            .notNull()
            .references(() => branches.id, { onDelete: "cascade" }),
        clearedAt: timestamp("cleared_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [index("notification_clears_branch_id_idx").on(t.branchId)]
);

export type NotificationClear = typeof notificationClears.$inferSelect;