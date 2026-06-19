import {
    pgTable,
    uuid,
    text,
    timestamp,
    index,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { branches } from "./branches";
import { staff } from "./staff";
import { attendanceStatusEnum } from "./enums";

export const attendance = pgTable(
    "attendance",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        tenantId: uuid("tenant_id")
            .notNull()
            .references(() => tenants.id, { onDelete: "cascade" }),
        branchId: uuid("branch_id")
            .notNull()
            .references(() => branches.id, { onDelete: "cascade" }),

        // onDelete: "restrict" — attendance records are historical data.
        // A staff member with attendance history must be deactivated, not deleted.
        staffId: uuid("staff_id")
            .notNull()
            .references(() => staff.id, { onDelete: "restrict" }),

        status: attendanceStatusEnum("status").notNull(),

        // Both nullable — a super_admin may log attendance manually without
        // exact clock times (e.g. marking someone absent after the fact).
        checkIn: timestamp("check_in", { withTimezone: true }),
        checkOut: timestamp("check_out", { withTimezone: true }),

        // Date the attendance record belongs to, stored independently of
        // checkIn/checkOut timestamps. This handles edge cases like night
        // shifts where checkOut crosses midnight into the next calendar day.
        date: timestamp("date", { withTimezone: true }).notNull(),

        notes: text("notes"),

        // Who logged this record — for audit trail on manual entries.
        loggedBy: uuid("logged_by")
            .notNull()
            .references(() => staff.id, { onDelete: "restrict" }),

        createdAt: timestamp("created_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (t) => [
        // RLS enforcement
        index("attendance_tenant_id_idx").on(t.tenantId),
        // Branch-level attendance reports
        index("attendance_branch_id_idx").on(t.branchId),
        // Individual staff attendance history
        index("attendance_staff_id_idx").on(t.staffId),
        // Status filtering (e.g. all absences this month)
        index("attendance_status_idx").on(t.status),
        // Primary attendance report query: staff + date range
        index("attendance_staff_date_idx").on(t.staffId, t.date),
        // Tenant-wide attendance by date (daily roll call view)
        index("attendance_tenant_date_idx").on(t.tenantId, t.date),
        // Branch attendance by date
        index("attendance_branch_date_idx").on(t.branchId, t.date),
    ]
);

export type Attendance = typeof attendance.$inferSelect;
export type NewAttendance = typeof attendance.$inferInsert;