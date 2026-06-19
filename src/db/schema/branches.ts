import { pgTable, uuid, text, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";

export const branches = pgTable("branches", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),

  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),

  // Mirrors your existing Address shape (street/city/state/postalCode/country/coordinates).
  address: jsonb("address").$type<{
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    coordinates?: { lat: number; lng: number };
  }>(),

  isMainBranch: boolean("is_main_branch").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Branch = typeof branches.$inferSelect;
export type NewBranch = typeof branches.$inferInsert;