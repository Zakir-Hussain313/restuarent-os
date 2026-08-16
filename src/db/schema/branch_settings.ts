import {
  pgTable,
  uuid,
  boolean,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { branches } from "./branches";

export const branchSettings = pgTable(
  "branch_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    // 1:1 with branches. Enforced via uniqueIndex below.
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),

    // ── POS settings ─────────────────────────────────────────────────
    posAutoConfirmOnPlace: boolean("pos_auto_confirm_on_place")
      .notNull()
      .default(false),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("branch_settings_branch_id_udx").on(t.branchId),
    index("branch_settings_tenant_id_idx").on(t.tenantId),
  ]
);

export type BranchSettings = typeof branchSettings.$inferSelect;
export type NewBranchSettings = typeof branchSettings.$inferInsert;