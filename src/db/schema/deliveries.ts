import {
    pgTable,
    uuid,
    text,
    integer,
    timestamp,
    jsonb,
    numeric,
    index,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { branches } from "./branches";
import { orders } from "./orders";
import { staff } from "./staff";
import { deliveryStatusEnum } from "./enums";

// Structured address snapshot frozen at dispatch time.
// Not a FK into customer_addresses — the customer may update their address
// later, but the delivery must preserve exactly where it was sent.
type DeliveryAddressSnapshot = {
    label: string | null;       // e.g. "Home", "Office"
    street: string;
    area: string;
    city: string;
    instructions: string | null;
};

export const deliveries = pgTable(
    "deliveries",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        tenantId: uuid("tenant_id")
            .notNull()
            .references(() => tenants.id, { onDelete: "cascade" }),
        branchId: uuid("branch_id")
            .notNull()
            .references(() => branches.id, { onDelete: "cascade" }),

        // 1:1 with orders — every delivery row belongs to exactly one order
        // of type `delivery`. Cascade: if the order is deleted, the delivery
        // record has no meaning and should be removed too.
        orderId: uuid("order_id")
            .notNull()
            .unique()
            .references(() => orders.id, { onDelete: "cascade" }),

        // Nullable — delivery may be created before a rider is assigned.
        // onDelete: "set null" — if a rider account is removed, the delivery
        // becomes unassigned rather than being deleted or blocked.
        riderId: uuid("rider_id").references(() => staff.id, {
            onDelete: "set null",
        }),

        status: deliveryStatusEnum("status").notNull(),

        // Frozen address snapshot at the moment of dispatch.
        // See DeliveryAddressSnapshot type above.
        deliveryAddress: jsonb("delivery_address")
            .$type<DeliveryAddressSnapshot>()
            .notNull(),

        // All currency in smallest unit (consistent with project-wide decision).
        deliveryFee: integer("delivery_fee").notNull().default(0),

        // Optional — used for analytics and future routing features.
        distanceKm: numeric("distance_km", { precision: 8, scale: 2 }),

        estimatedDeliveryTime: timestamp("estimated_delivery_time", {
            withTimezone: true,
        }),
        actualDeliveryTime: timestamp("actual_delivery_time", {
            withTimezone: true,
        }),

        // Free-text field for dispatch notes, customer instructions, or
        // rider-reported issues.
        deliveryNotes: text("delivery_notes"),

        createdAt: timestamp("created_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (t) => [
        // RLS enforcement
        index("deliveries_tenant_id_idx").on(t.tenantId),
        // Branch-level dispatch queries
        index("deliveries_branch_id_idx").on(t.branchId),
        // orderId is already unique() above, but an explicit index is still
        // needed for join performance (unique constraint alone doesn't always
        // get picked up by the planner on FK joins in Postgres).
        index("deliveries_order_id_idx").on(t.orderId),
        // Rider's delivery list ("my deliveries")
        index("deliveries_rider_id_idx").on(t.riderId),
        // Dispatch queue filtering by status
        index("deliveries_status_idx").on(t.status),
        // Tenant-scoped dispatch board: primary operational query
        index("deliveries_tenant_status_idx").on(t.tenantId, t.status),
        // Rider's active deliveries — most frequent rider-facing query
        index("deliveries_rider_status_idx").on(t.riderId, t.status),
        // Branch dispatch view
        index("deliveries_branch_status_idx").on(t.branchId, t.status),
    ]
);

export type Delivery = typeof deliveries.$inferSelect;
export type NewDelivery = typeof deliveries.$inferInsert;