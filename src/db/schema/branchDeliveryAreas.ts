import { pgTable, uuid, text, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { branches } from "./branches";

export const branchDeliveryAreas = pgTable(
    "branch_delivery_areas",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        tenantId: uuid("tenant_id")
            .notNull()
            .references(() => tenants.id, { onDelete: "cascade" }),
        branchId: uuid("branch_id")
            .notNull()
            .references(() => branches.id, { onDelete: "cascade" }),

        city: text("city").notNull(),
        area: text("area").notNull(),

        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [
        index("branch_delivery_areas_tenant_id_idx").on(t.tenantId),
        index("branch_delivery_areas_branch_id_idx").on(t.branchId),
        index("branch_delivery_areas_city_area_idx").on(t.city, t.area),
        uniqueIndex("branch_delivery_areas_branch_city_area_udx").on(
            t.branchId,
            t.city,
            t.area
        ),
    ]
);

export type BranchDeliveryArea = typeof branchDeliveryAreas.$inferSelect;
export type NewBranchDeliveryArea = typeof branchDeliveryAreas.$inferInsert;