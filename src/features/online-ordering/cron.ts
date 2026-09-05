import "server-only";
import { db } from "@/db";
import { orders, payments } from "@/db/schema";
import { and, eq, lt, inArray } from "drizzle-orm";

const ABANDONED_ORDER_MINUTES = 30;

// Cancels online orders where the customer chose "Pay Now", was redirected
// to PayFast, and never completed or explicitly failed (just closed the tab).
// Only touches orders that actually have a PayFast payment attempt — a
// "Pay on Delivery" order looks identical (pending/unpaid) and must never be
// auto-cancelled here.
export async function cancelAbandonedOnlineOrders(): Promise<{ cancelled: number }> {
    const threshold = new Date(Date.now() - ABANDONED_ORDER_MINUTES * 60_000);

    const candidates = await db.query.orders.findMany({
        where: and(
            eq(orders.status, "pending"),
            eq(orders.paymentStatus, "unpaid"),
            eq(orders.orderType, "delivery"),
            lt(orders.createdAt, threshold)
        ),
    });
    if (candidates.length === 0) return { cancelled: 0 };

    const candidateIds = candidates.map((o) => o.id);
    const payfastAttempts = await db.query.payments.findMany({
        where: and(inArray(payments.orderId, candidateIds), eq(payments.provider, "payfast")),
    });
    const abandonedOrderIds = new Set(payfastAttempts.map((p) => p.orderId));
    if (abandonedOrderIds.size === 0) return { cancelled: 0 };

    await db
        .update(orders)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(inArray(orders.id, Array.from(abandonedOrderIds)));

    return { cancelled: abandonedOrderIds.size };
}