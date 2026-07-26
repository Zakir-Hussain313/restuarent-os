import { pgTable, uuid, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";

export const branches = pgTable("branches", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),

  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),

  // Simple free-text address — no structured sub-fields.
  address: text("address"),
  image: text("image"),
  isMainBranch: boolean("is_main_branch").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Branch = typeof branches.$inferSelect;
export type NewBranch = typeof branches.$inferInsert;