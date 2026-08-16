import {
    pgTable,
    uuid,
    text,
    timestamp,
    unique,
    index,
} from "drizzle-orm/pg-core";
import { staff } from "./staff";

export const pushSubscriptions = pgTable(
    "push_subscriptions",
    {
        id: uuid("id").primaryKey().defaultRandom(),

        staffId: uuid("staff_id")
            .notNull()
            .references(() => staff.id, { onDelete: "cascade" }),

        endpoint: text("endpoint").notNull(),
        p256dh: text("p256dh").notNull(),
        auth: text("auth").notNull(),

        createdAt: timestamp("created_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (t) => [
        index("push_subscriptions_staff_id_idx").on(t.staffId),
        unique("push_subscriptions_staff_endpoint_unique").on(t.staffId, t.endpoint),
    ]
);

export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type NewPushSubscription = typeof pushSubscriptions.$inferInsert;