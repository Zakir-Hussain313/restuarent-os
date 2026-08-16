import "server-only";
import { db } from "@/db";
import { orders, tableReservations, notifications } from "@/db/schema";
import { and, eq, lt, inArray, gte, lte } from "drizzle-orm";
import { createNotification } from "./actions";

const STUCK_ORDER_MINUTES = 15;
const RESERVATION_UPCOMING_MINUTES = 30;

export async function checkTimeBasedNotifications(): Promise<void> {
    const now = new Date();

    const stuckThreshold = new Date(now.getTime() - STUCK_ORDER_MINUTES * 60_000);
    const stuckOrders = await db.query.orders.findMany({
        where: and(inArray(orders.status, ["pending", "confirmed"]), lt(orders.createdAt, stuckThreshold)),
    });

    for (const order of stuckOrders) {
        const already = await db.query.notifications.findFirst({
            where: and(eq(notifications.resourceId, order.id), eq(notifications.type, "order_stuck")),
        });
        if (already) continue;

        await createNotification({
            tenantId: order.tenantId,
            branchId: order.branchId,
            type: "order_stuck",
            title: "Order stuck",
            message: `Order ${order.orderNumber} has been ${order.status} for over ${STUCK_ORDER_MINUTES} minutes.`,
            resourceType: "order",
            resourceId: order.id,
        });
    }

    const windowEnd = new Date(now.getTime() + RESERVATION_UPCOMING_MINUTES * 60_000);
    const upcoming = await db.query.tableReservations.findMany({
        where: and(
            inArray(tableReservations.status, ["pending", "confirmed"]),
            gte(tableReservations.startTime, now),
            lte(tableReservations.startTime, windowEnd)
        ),
    });

    for (const res of upcoming) {
        const already = await db.query.notifications.findFirst({
            where: and(eq(notifications.resourceId, res.id), eq(notifications.type, "reservation_upcoming")),
        });
        if (already) continue;

        await createNotification({
            tenantId: res.tenantId,
            branchId: res.branchId,
            type: "reservation_upcoming",
            title: "Reservation coming up",
            message: `Reservation ${res.reservationNumber} for party of ${res.partySize} starts soon.`,
            resourceType: "reservation",
            resourceId: res.id,
        });
    }
}