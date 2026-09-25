import { pgTable, uuid, integer, numeric, text, timestamp, index } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { branches } from "./branches";
import { ingredients } from "./ingredients";
import { suppliers } from "./suppliers";
import { staff } from "./staff";

// Record of an actual physical delivery of stock. Kept separate from
// stock_movements (which is the unified ledger) because a receipt carries
// purchase-specific detail — supplier, cost paid this time — that a bare
// movement entry doesn't need.
export const stockReceipts = pgTable(
  "stock_receipts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),
    ingredientId: uuid("ingredient_id")
      .notNull()
      .references(() => ingredients.id, { onDelete: "cascade" }),
    supplierId: uuid("supplier_id").references(() => suppliers.id, { onDelete: "set null" }),
    quantity: numeric("quantity", { precision: 12, scale: 3, mode: "number" }).notNull(),
    costPerUnit: integer("cost_per_unit").notNull(),
    totalCost: integer("total_cost").notNull(),
    notes: text("notes"),
    receivedBy: uuid("received_by").references(() => staff.id, { onDelete: "set null" }),
    receivedByName: text("received_by_name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("stock_receipts_tenant_id_idx").on(table.tenantId),
    index("stock_receipts_branch_id_idx").on(table.branchId),
    index("stock_receipts_ingredient_id_idx").on(table.ingredientId),
  ]
);

export type StockReceipt = typeof stockReceipts.$inferSelect;
export type NewStockReceipt = typeof stockReceipts.$inferInsert;