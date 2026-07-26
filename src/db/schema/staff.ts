import { pgTable, uuid, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { branches } from "./branches";
import { staffRoleEnum, staffStatusEnum } from "./enums";

// staff.id deliberately equals the Supabase auth.users.id (1:1). This table
// is what gives a Supabase-authenticated user their tenant/branch/role —
// Supabase Auth handles "who are you", this table handles "what can you do
// and where". See auth architecture doc for the JWT app_metadata sync flow.
export const staff = pgTable("staff", {
  id: uuid("id").primaryKey(), // == auth.users.id, NOT defaultRandom()
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  branchId: uuid("branch_id").references(() => branches.id, { onDelete: "set null" }),

  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),

  role: staffRoleEnum("role").notNull().default("STAFF"),
  status: staffStatusEnum("status").notNull().default("active"),

  image: text("image"),

  // 4-digit POS PIN for fast in-store auth (separate from Supabase password
  // login — see auth flows doc, "POS PIN auth"). Stored hashed, never plain.
  pinHash: text("pin_hash"),

  salary: integer("salary"), // smallest currency unit (PKR has no subunit, so plain integer)

  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),

  isDeleted: boolean("is_deleted").notNull().default(false), // soft delete, preserves order/attendance history
});

export type Staff = typeof staff.$inferSelect;
export type NewStaff = typeof staff.$inferInsert;