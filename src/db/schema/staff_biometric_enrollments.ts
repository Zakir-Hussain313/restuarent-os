import { pgTable, uuid, text, timestamp, index, unique } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { staff } from "./staff";
import { branchDevices } from "./branch_devices";

// Maps a staff member to their fingerprint ID on a specific scanner.
// Zaiqa never stores the actual fingerprint — only the scanner-assigned
// ID number for that enrolled fingerprint. Matching itself happens on
// the physical device, not here.
export const staffBiometricEnrollments = pgTable(
  "staff_biometric_enrollments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    staffId: uuid("staff_id")
      .notNull()
      .references(() => staff.id, { onDelete: "cascade" }),
    branchDeviceId: uuid("branch_device_id")
      .notNull()
      .references(() => branchDevices.id, { onDelete: "cascade" }),

    // The ID the scanner itself assigned to this fingerprint at
    // enrollment time — not a Zaiqa-generated value.
    externalUserId: text("external_user_id").notNull(),

    createdBy: uuid("created_by")
      .notNull()
      .references(() => staff.id, { onDelete: "cascade" }),

    enrolledAt: timestamp("enrolled_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("staff_biometric_enrollments_tenant_id_idx").on(table.tenantId),
    index("staff_biometric_enrollments_staff_id_idx").on(table.staffId),
    index("staff_biometric_enrollments_device_id_idx").on(table.branchDeviceId),
    // One fingerprint on a given scanner can only ever belong to one staff member.
    unique("staff_biometric_enrollments_device_external_user_unique").on(
      table.branchDeviceId,
      table.externalUserId
    ),
  ]
);

export type StaffBiometricEnrollment = typeof staffBiometricEnrollments.$inferSelect;
export type NewStaffBiometricEnrollment = typeof staffBiometricEnrollments.$inferInsert;