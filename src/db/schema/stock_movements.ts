import { pgTable, uuid, numeric, integer, text, timestamp, index } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { branches } from "./branches";
import { ingredients } from "./ingredients";
import { staff } from "./staff";
import { orders } from "./orders";
import { stockReceipts } from "./stock_receipts";
import { stockMovementReasonEnum } from "./enums";

// Unified ledger — every single stock change (purchase, sale deduction,
// wastage, correction) lands here as one row. This is the one table
// Advanced Analytics reads for cost of goods sold / loss / stock value —
// deliberately not scattered across separate tables per reason.
export const stockMovements = pgTable(
  "stock_movements",
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
    reason: stockMovementReasonEnum("reason").notNull(),
    // Signed: positive for stock in (purchase), negative for stock out
    // (sale, wastage, a downward correction).
    quantityChange: numeric("quantity_change", { precision: 12, scale: 3, mode: "number" }).notNull(),
    // This movement's value at the ingredient's avg cost at the time —
    // what Advanced Analytics sums for COGS / loss.
    costImpact: integer("cost_impact").notNull(),
    // Populated only for reason='sale' — links back to what triggered
    // the auto-deduction.
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
    // Populated only for reason='purchase' — links back to the receipt
    // that created this movement, so supplier/cost detail can be joined
    // without a fragile timestamp-based match.
    receiptId: uuid("receipt_id").references(() => stockReceipts.id, { onDelete: "set null" }),
    // Ingredient's stock/avg cost immediately BEFORE this movement was
    // applied. Null on every row created before migration 0035 — those
    // stay view-only forever. Lets a single most-recent movement be edited
    // by recomputing forward from a known starting point instead of
    // replaying the whole ledger.
    stockBeforeMovement: numeric("stock_before_movement", { precision: 12, scale: 3, mode: "number" }),
    avgCostBeforeMovement: integer("avg_cost_before_movement"),
    notes: text("notes"),
    createdBy: uuid("created_by").references(() => staff.id, { onDelete: "set null" }),
    createdByName: text("created_by_name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("stock_movements_tenant_id_idx").on(table.tenantId),
    index("stock_movements_branch_id_idx").on(table.branchId),
    index("stock_movements_ingredient_id_idx").on(table.ingredientId),
    index("stock_movements_reason_idx").on(table.reason),
    index("stock_movements_order_id_idx").on(table.orderId),
    index("stock_movements_receipt_id_idx").on(table.receiptId),
  ]
);

export type StockMovement = typeof stockMovements.$inferSelect;
export type NewStockMovement = typeof stockMovements.$inferInsert;