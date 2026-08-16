import { pgTable, uuid, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { branches } from "./branches";
import { restaurantTables } from "./tables";
import { reservationStatusEnum } from "./enums";

export const tableReservations = pgTable(
  "table_reservations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),
    tableId: uuid("table_id")
      .notNull()
      .references(() => restaurantTables.id, { onDelete: "cascade" }),

    customerName: text("customer_name"),
    customerPhone: text("customer_phone").notNull(),
    partySize: integer("party_size").notNull(),
    notes: text("notes"),

    reservationNumber: text("reservation_number").notNull(),
    reservationCode: text("reservation_code").notNull(),

    startTime: timestamp("start_time", { withTimezone: true }).notNull(),
    durationMinutes: integer("duration_minutes").notNull().default(90),

    status: reservationStatusEnum("status").notNull().default("pending"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("table_reservations_tenant_id_idx").on(t.tenantId),
    index("table_reservations_branch_id_idx").on(t.branchId),
    index("table_reservations_table_id_idx").on(t.tableId),
    index("table_reservations_status_idx").on(t.status),
    index("table_reservations_table_status_idx").on(t.tableId, t.status),
    index("table_reservations_start_time_idx").on(t.startTime),
  ]
);

export type TableReservation = typeof tableReservations.$inferSelect;
export type NewTableReservation = typeof tableReservations.$inferInsert;