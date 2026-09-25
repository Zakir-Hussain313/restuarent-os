import { pgTable, uuid, text, integer, numeric, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { branches } from "./branches";
import { ingredientUnitEnum } from "./enums";

export const ingredients = pgTable(
  "ingredients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    image: text("image"),
    unit: ingredientUnitEnum("unit").notNull(),
    currentStock: numeric("current_stock", { precision: 12, scale: 3, mode: "number" })
      .notNull()
      .default(0),
    lowStockThreshold: numeric("low_stock_threshold", { precision: 12, scale: 3, mode: "number" }),
    // Running average cost per unit (PKR, whole rupees like the rest of the
    // app) — updated on each stock receipt, read by Advanced Analytics for
    // valuing current stock and computing recipe cost / profit later.
    avgCostPerUnit: integer("avg_cost_per_unit").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("ingredients_tenant_id_idx").on(table.tenantId),
    index("ingredients_branch_id_idx").on(table.branchId),
  ]
);

export type Ingredient = typeof ingredients.$inferSelect;
export type NewIngredient = typeof ingredients.$inferInsert;