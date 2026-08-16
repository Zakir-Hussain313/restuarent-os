import { pgTable, uuid, integer } from "drizzle-orm/pg-core";
import { branches } from "./branches";
import { tenants } from "./tenants";

export const reservationCounters = pgTable("reservation_counters", {
  branchId: uuid("branch_id")
    .primaryKey()
    .references(() => branches.id, { onDelete: "cascade" }),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  nextNumber: integer("next_number").notNull().default(1),
});

export type ReservationCounter = typeof reservationCounters.$inferSelect;
export type NewReservationCounter = typeof reservationCounters.$inferInsert;