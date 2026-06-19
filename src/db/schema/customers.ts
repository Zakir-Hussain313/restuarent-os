import { pgTable, uuid, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";

// Tenant-wide customers (a customer record belongs to the restaurant
// business as a whole, not to a single branch — matches existing Customer
// type which has no branchId).
export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),

  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  phone: text("phone").notNull(),

  // Denormalized order stats — matches existing Customer.totalOrders /
  // totalSpent / averageOrderValue / lastOrderAt. Kept in sync via a
  // trigger or application-layer update on order completion, not computed
  // live on every read (these fields exist specifically to avoid that cost).
  totalOrders: integer("total_orders").notNull().default(0),
  totalSpent: integer("total_spent").notNull().default(0), // smallest currency unit
  averageOrderValue: integer("average_order_value").notNull().default(0),
  lastOrderAt: timestamp("last_order_at", { withTimezone: true }),

  notes: text("notes"),
  isBlacklisted: boolean("is_blacklisted").notNull().default(false),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Mirrors CustomerAddress — a customer can have multiple saved addresses.
export const customerAddresses = pgTable("customer_addresses", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),

  label: text("label").notNull(), // "Home", "Work", "Other"
  street: text("street").notNull(),
  city: text("city").notNull(),
  postalCode: text("postal_code"),
  isDefault: boolean("is_default").notNull().default(false),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
export type CustomerAddress = typeof customerAddresses.$inferSelect;
export type NewCustomerAddress = typeof customerAddresses.$inferInsert;