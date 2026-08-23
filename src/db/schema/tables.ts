import { pgTable, uuid, text, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { branches } from "./branches";
import { tableStatusEnum, tableShapeEnum, tableSeatingTypeEnum } from "./enums";

// table_sections — e.g. "Main Hall", "Outdoor", "VIP Room"
export const tableSections = pgTable("table_sections", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  branchId: uuid("branch_id")
    .notNull()
    .references(() => branches.id, { onDelete: "cascade" }),

  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Physical dine-in tables — e.g. "T1", "VIP-1"
export const restaurantTables = pgTable("restaurant_tables", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  branchId: uuid("branch_id")
    .notNull()
    .references(() => branches.id, { onDelete: "cascade" }),
  sectionId: uuid("section_id")
    .notNull()
    .references(() => tableSections.id, { onDelete: "cascade" }),

  tableNumber: text("table_number").notNull(), // "T1", "VIP-1" — text, not int, per existing frontend type
  capacity: integer("capacity").notNull(),
  shape: tableShapeEnum("shape").notNull().default("square"),
  status: tableStatusEnum("status").notNull().default("available"),
  color: text("color").notNull().default("slate"), // display color, independent of status — one of TABLE_COLORS
  seatingType: tableSeatingTypeEnum("seating_type").notNull().default("chairs"),
  // Relative offsets from the table's center ({dx, dy, angleDeg} per seat) —
  // NOT absolute canvas coordinates. This is what makes seats travel with
  // the table automatically when it's repositioned. Null = use the computed
  // default layout for this shape/capacity.
  chairLayout: jsonb("chair_layout").$type<{ dx: number; dy: number; angleDeg: number }[]>(),
  sofaLayout: jsonb("sofa_layout").$type<{ openSides?: ("top" | "bottom" | "left" | "right")[]; gaps?: ("top" | "bottom" | "left" | "right")[] }>(),

  // currentOrderId intentionally omitted as a FK here to avoid a circular
  // reference with orders.tableId (orders.ts references this table instead).
  // The "current order for a table" is derived via a query, not stored twice.

  positionX: integer("position_x"), // for floor-plan UI, matches existing Table.positionX/Y
  positionY: integer("position_y"),

  notes: text("notes"),

  isActive: boolean("is_active").notNull().default(true),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TableSection = typeof tableSections.$inferSelect;
export type NewTableSection = typeof tableSections.$inferInsert;
export type RestaurantTable = typeof restaurantTables.$inferSelect;
export type NewRestaurantTable = typeof restaurantTables.$inferInsert;