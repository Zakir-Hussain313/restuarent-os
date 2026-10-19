import { and, eq, sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { db } from "@/db";
import {
  attendance,
  auditLogs,
  coupons,
  orderDiscounts,
  orderRevisions,
  orders,
  paymentRefunds,
  payments,
  stockMovements,
  stockReceipts,
} from "@/db/schema";

// Only touch rows whose stored name is actually different — makes the whole
// sync idempotent and avoids rewriting millions of identical audit rows.
function differs(column: AnyPgColumn, value: string): SQL {
  return sql`${column} IS DISTINCT FROM ${value}`;
}

// Staff names are stored on history rows as a snapshot (so a permanently
// deleted person still shows by name). While the person still exists, that
// snapshot must follow their live name — this rewrites every snapshot that is
// linked to them by id. Rows whose link is already null (deleted staff) are
// untouched, so their last name is preserved. All-or-nothing.
export async function syncStaffNameSnapshots(staffId: string, fullName: string): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .update(orders)
      .set({ staffName: fullName })
      .where(and(eq(orders.staffId, staffId), differs(orders.staffName, fullName)));

    await tx
      .update(orderDiscounts)
      .set({ appliedByName: fullName })
      .where(and(eq(orderDiscounts.appliedBy, staffId), differs(orderDiscounts.appliedByName, fullName)));

    await tx
      .update(payments)
      .set({ processedByName: fullName })
      .where(and(eq(payments.processedBy, staffId), differs(payments.processedByName, fullName)));

    await tx
      .update(paymentRefunds)
      .set({ createdByName: fullName })
      .where(and(eq(paymentRefunds.createdBy, staffId), differs(paymentRefunds.createdByName, fullName)));

    await tx
      .update(coupons)
      .set({ createdByName: fullName })
      .where(and(eq(coupons.createdBy, staffId), differs(coupons.createdByName, fullName)));

    await tx
      .update(orderRevisions)
      .set({ editedByName: fullName })
      .where(and(eq(orderRevisions.editedBy, staffId), differs(orderRevisions.editedByName, fullName)));

    await tx
      .update(attendance)
      .set({ staffName: fullName })
      .where(and(eq(attendance.staffId, staffId), differs(attendance.staffName, fullName)));

    await tx
      .update(attendance)
      .set({ loggedByName: fullName })
      .where(and(eq(attendance.loggedBy, staffId), differs(attendance.loggedByName, fullName)));

    await tx
      .update(stockMovements)
      .set({ createdByName: fullName })
      .where(and(eq(stockMovements.createdBy, staffId), differs(stockMovements.createdByName, fullName)));

    await tx
      .update(stockReceipts)
      .set({ receivedByName: fullName })
      .where(and(eq(stockReceipts.receivedBy, staffId), differs(stockReceipts.receivedByName, fullName)));

    await tx
      .update(auditLogs)
      .set({ actorName: fullName })
      .where(and(eq(auditLogs.actorId, staffId), differs(auditLogs.actorName, fullName)));
  });
}