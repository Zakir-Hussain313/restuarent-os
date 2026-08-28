import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { branches } from "./branches";
import { staff } from "./staff";
import { deviceStatusEnum } from "./enums";

// A device (browser/terminal) approved by an admin to clock in/out staff
// at a specific branch. Not tied to one staff member — multiple staff can
// share one approved terminal (e.g. a shared POS tablet at the counter).
export const branchDevices = pgTable(
  "branch_devices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),

    // Random token generated client-side (localStorage), sent on every
    // login/clock action from that browser to identify the device.
    deviceToken: text("device_token").notNull(),

    status: deviceStatusEnum("status").notNull().default("pending"),

    // Best-effort human label (e.g. "Chrome on Windows"), shown to admin
    // in the approval list — not used for any auth logic.
    label: text("label"),

    requestedBy: uuid("requested_by")
      .notNull()
      .references(() => staff.id, { onDelete: "cascade" }),
    approvedBy: uuid("approved_by").references(() => staff.id, { onDelete: "set null" }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
  },
  (table) => [
    index("branch_devices_branch_id_idx").on(table.branchId),
    index("branch_devices_tenant_id_idx").on(table.tenantId),
    index("branch_devices_token_idx").on(table.deviceToken),
  ]
);

export type BranchDevice = typeof branchDevices.$inferSelect;
export type NewBranchDevice = typeof branchDevices.$inferInsert;