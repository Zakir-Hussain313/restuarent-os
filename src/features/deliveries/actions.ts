"use server";

import { db } from "@/db";
import { deliveries, orders, staff } from "@/db/schema";
import { getSupabaseServerClient } from "@/lib/supabase";
import { eq, and, inArray, desc , notInArray } from "drizzle-orm";
import { logAudit } from "@/lib/audit";
import { broadcastChange } from "@/lib/realtime/broadcast";
import { sendPushToRider } from "@/lib/push/send";
import { createNotification } from "@/features/notifications/actions";

// ─── Shared: find one free rider for a branch ─────────────────────────────
// Used by both confirmOrderAction's auto-assign and the POS "Automatic"
// rider option at order creation. Accepts either `db` or an open `tx` so
// callers can run it inside their own transaction when needed.

type QueryClient = Parameters<Parameters<typeof db.transaction>[0]>[0] | typeof db;

export async function findFreeRider(
    client: QueryClient,
    tenantId: string,
    branchId: string
): Promise<string | null> {
    const busyRiders = await client
        .select({ riderId: deliveries.riderId })
        .from(deliveries)
        .where(
            and(
                eq(deliveries.tenantId, tenantId),
                inArray(deliveries.status, ["assigned", "out_for_delivery"])
            )
        );
    const busyRiderIds = busyRiders.map((r) => r.riderId).filter((id): id is string => id !== null);

    const freeRider = await client.query.staff.findFirst({
        where: and(
            eq(staff.tenantId, tenantId),
            eq(staff.branchId, branchId),
            eq(staff.role, "RIDER"),
            eq(staff.isAvailable, true),
            eq(staff.isDeleted, false),
            busyRiderIds.length > 0 ? notInArray(staff.id, busyRiderIds) : undefined
        ),
    });

    return freeRider?.id ?? null;
}

// ─── Shared auth helper (same pattern as orders/menu actions) ────────────

async function getCurrentStaff() {
    const supabase = await getSupabaseServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false as const, error: "Not authenticated." };

    const currentStaffRow = await db.query.staff.findFirst({
        where: eq(staff.id, user.id),
    });
    if (!currentStaffRow) return { ok: false as const, error: "Staff record not found." };

    return { ok: true as const, staff: currentStaffRow };
}

// ─── Assign / reassign a rider (manual, by staff) ─────────────────────────

export async function assignRiderAction(
    orderId: string,
    riderId: string
): Promise<{ success: true } | { success?: undefined; error: string }> {
    const auth = await getCurrentStaff();
    if (!auth.ok) return { error: auth.error };
    const { staff: currentStaffRow } = auth;

    if (!["ADMIN", "SUPER_ADMIN", "STAFF"].includes(currentStaffRow.role)) {
        return { error: "You don't have permission to assign riders." };
    }

    const delivery = await db.query.deliveries.findFirst({ where: eq(deliveries.orderId, orderId) });
    if (!delivery || delivery.tenantId !== currentStaffRow.tenantId) {
        return { error: "Delivery not found." };
    }
    if (currentStaffRow.role !== "SUPER_ADMIN" && delivery.branchId !== currentStaffRow.branchId) {
        return { error: "You can only manage your own branch's deliveries." };
    }
    if (delivery.status === "delivered" || delivery.status === "cancelled") {
        return { error: `Cannot assign a rider to a delivery that is already "${delivery.status}".` };
    }
    if (delivery.status === "out_for_delivery") {
        return { error: "Cannot reassign a rider once the delivery is already out for delivery." };
    }

    const rider = await db.query.staff.findFirst({
        where: and(
            eq(staff.id, riderId),
            eq(staff.tenantId, currentStaffRow.tenantId),
            eq(staff.role, "RIDER"),
            eq(staff.isDeleted, false)
        ),
    });
    if (!rider) return { error: "Rider not found." };
    if (rider.branchId !== delivery.branchId) {
        return { error: "That rider is not assigned to this delivery's branch." };
    }

    await db
        .update(deliveries)
        .set({ riderId: rider.id, status: "assigned", updatedAt: new Date() })
        .where(eq(deliveries.orderId, orderId));

    await db.update(orders).set({ riderId: rider.id }).where(eq(orders.id, orderId));

    await logAudit(db, currentStaffRow, "delivery", orderId, "assign", {
        branchId: delivery.branchId,
        oldValue: { riderId: delivery.riderId },
        newValue: { riderId: rider.id, status: "assigned" },
    });

    if (delivery.branchId) await broadcastChange(delivery.branchId, "riders");

    const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
    await sendPushToRider(rider.id, {
        title: "New Delivery Assigned",
        body: order ? `Order ${order.orderNumber} is ready for you.` : "You have a new delivery.",
        url: "/riders",
    });

    return { success: true };
}

// ─── Update delivery status (rider moving their delivery forward) ─────────

const VALID_TRANSITIONS: Record<string, string[]> = {
    assigned: ["out_for_delivery", "cancelled"],
    out_for_delivery: ["delivered", "cancelled"],
};

export async function updateDeliveryStatusAction(
    orderId: string,
    status: "out_for_delivery" | "delivered" | "cancelled"
): Promise<{ success: true } | { success?: undefined; error: string }> {
    const auth = await getCurrentStaff();
    if (!auth.ok) return { error: auth.error };
    const { staff: currentStaffRow } = auth;

    const delivery = await db.query.deliveries.findFirst({ where: eq(deliveries.orderId, orderId) });
    if (!delivery || delivery.tenantId !== currentStaffRow.tenantId) {
        return { error: "Delivery not found." };
    }

    const isOwnDelivery = currentStaffRow.role === "RIDER" && delivery.riderId === currentStaffRow.id;
    const isManager = currentStaffRow.role === "ADMIN" || currentStaffRow.role === "SUPER_ADMIN";
    if (!isOwnDelivery && !isManager) {
        return { error: "You can only update your own deliveries." };
    }

    const allowedNext = VALID_TRANSITIONS[delivery.status] ?? [];
    if (!allowedNext.includes(status)) {
        return { error: `Cannot move a delivery from "${delivery.status}" to "${status}".` };
    }

    const now = new Date();
    await db
        .update(deliveries)
        .set({
            status,
            updatedAt: now,
            ...(status === "delivered" ? { actualDeliveryTime: now } : {}),
        })
        .where(eq(deliveries.orderId, orderId));

    await logAudit(db, currentStaffRow, "delivery", orderId, "status_change", {
        branchId: delivery.branchId,
        oldValue: { status: delivery.status },
        newValue: { status },
    });

    if (delivery.branchId) await broadcastChange(delivery.branchId, "riders");

    if (delivery.branchId && (status === "out_for_delivery" || status === "delivered")) {
        const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
        const actorName = `${currentStaffRow.firstName} ${currentStaffRow.lastName}`;
        await createNotification({
            tenantId: currentStaffRow.tenantId,
            branchId: delivery.branchId,
            type: "rider_status",
            title: status === "out_for_delivery" ? "Order out for delivery" : "Order delivered",
            message: order
                ? `${actorName} marked order ${order.orderNumber} as ${status === "out_for_delivery" ? "out for delivery" : "delivered"}.`
                : `${actorName} changed a delivery status to ${status}.`,
            resourceType: "delivery",
            resourceId: orderId,
        });
    }

    return { success: true };
}

// ─── Rider's own online/offline toggle ─────────────────────────────────────

export async function toggleRiderAvailabilityAction(
    isAvailable: boolean
): Promise<{ success: true } | { success?: undefined; error: string }> {
    const auth = await getCurrentStaff();
    if (!auth.ok) return { error: auth.error };
    const { staff: currentStaffRow } = auth;

    if (currentStaffRow.role !== "RIDER") {
        return { error: "Only riders can toggle availability." };
    }

    await db.update(staff).set({ isAvailable, updatedAt: new Date() }).where(eq(staff.id, currentStaffRow.id));

    await logAudit(db, currentStaffRow, "delivery", currentStaffRow.id, "status_change", {
        branchId: currentStaffRow.branchId,
        oldValue: { isAvailable: currentStaffRow.isAvailable },
        newValue: { isAvailable },
    });

    if (currentStaffRow.branchId) await broadcastChange(currentStaffRow.branchId, "riders");

    return { success: true };
}

// ─── Rider's own dashboard data ────────────────────────────────────────────

export interface RiderCurrentDelivery {
    orderId: string;
    orderNumber: string;
    status: "assigned" | "out_for_delivery";
    customerName: string | null;
    customerPhone: string | null;
    address: {
        label: string | null;
        street: string;
        area: string;
        city: string;
        instructions: string | null;
    };
    items: { id: string; menuItemName: string; quantity: number; itemTotal: number }[];
    total: number;
    deliveryFee: number;
}

export interface RiderHistoryEntry {
    orderId: string;
    orderNumber: string;
    status: "delivered" | "cancelled";
    address: string;
    total: number;
    updatedAt: string;
}

export interface RiderDashboardData {
    isAvailable: boolean;
    branchId: string | null;
    currentDelivery: RiderCurrentDelivery | null;
    history: RiderHistoryEntry[];
}

export async function getRiderDashboardDataAction(): Promise <
    { success: true; data: RiderDashboardData } | { success?: undefined; error: string }
> {
    const auth = await getCurrentStaff();
    if (!auth.ok) return { error: auth.error };
    const { staff: currentStaffRow } = auth;

    if (currentStaffRow.role !== "RIDER") {
        return { error: "Only riders can access this dashboard." };
    }

    const currentDeliveryRow = await db.query.deliveries.findFirst({
        where: and(
            eq(deliveries.riderId, currentStaffRow.id),
            inArray(deliveries.status, ["assigned", "out_for_delivery"])
        ),
        with: {
            order: { with: { items: true } },
        },
    });

    let currentDelivery: RiderCurrentDelivery | null = null;
    if (currentDeliveryRow && currentDeliveryRow.order) {
        const o = currentDeliveryRow.order;
        currentDelivery = {
            orderId: o.id,
            orderNumber: o.orderNumber,
            status: currentDeliveryRow.status as "assigned" | "out_for_delivery",
            customerName: o.customerName ?? null,
            customerPhone: o.customerPhone ?? null,
            address: currentDeliveryRow.deliveryAddress,
            items: o.items
                .filter((i) => i.status !== "cancelled")
                .map((i) => ({
                    id: i.id,
                    menuItemName: i.menuItemName,
                    quantity: i.quantity,
                    itemTotal: i.itemTotal,
                })),
            total: o.total,
            deliveryFee: currentDeliveryRow.deliveryFee,
        };
    }

    const historyRows = await db.query.deliveries.findMany({
        where: and(
            eq(deliveries.riderId, currentStaffRow.id),
            inArray(deliveries.status, ["delivered", "cancelled"])
        ),
        orderBy: desc(deliveries.updatedAt),
        limit: 20,
        with: { order: true },
    });

    const history: RiderHistoryEntry[] = historyRows
        .filter((d) => d.order)
        .map((d) => ({
            orderId: d.order!.id,
            orderNumber: d.order!.orderNumber,
            status: d.status as "delivered" | "cancelled",
            address: [d.deliveryAddress.street, d.deliveryAddress.area, d.deliveryAddress.city]
                .filter(Boolean)
                .join(", "),
            total: d.order!.total,
            updatedAt: d.updatedAt.toISOString(),
        }));

    return {
        success: true,
        data: {
            isAvailable: currentStaffRow.isAvailable,
            branchId: currentStaffRow.branchId,
            currentDelivery,
            history,
        },
    };
}


// ─── List riders for manual assignment ─────────────────────────────────────

export interface RiderOption {
    id: string;
    name: string;
    isAvailable: boolean;
    isBusy: boolean;
}

export async function getRidersForBranchAction(
    branchId: string
): Promise<{ success: true; riders: RiderOption[] } | { success?: undefined; error: string }> {
    const auth = await getCurrentStaff();
    if (!auth.ok) return { error: auth.error };
    const { staff: currentStaffRow } = auth;

    if (!["ADMIN", "SUPER_ADMIN", "STAFF"].includes(currentStaffRow.role)) {
        return { error: "You don't have permission to view riders." };
    }

    if (currentStaffRow.role !== "SUPER_ADMIN" && currentStaffRow.branchId !== branchId) {
        return { error: "You can only view riders for your own branch." };
    }

    const riderRows = await db.query.staff.findMany({
        where: and(
            eq(staff.tenantId, currentStaffRow.tenantId),
            eq(staff.branchId, branchId),
            eq(staff.role, "RIDER"),
            eq(staff.isDeleted, false)
        ),
    });

    const busyRiders = await db
        .select({ riderId: deliveries.riderId })
        .from(deliveries)
        .where(
            and(
                eq(deliveries.tenantId, currentStaffRow.tenantId),
                inArray(deliveries.status, ["assigned", "out_for_delivery"])
            )
        );
    const busyRiderIds = new Set(busyRiders.map((r) => r.riderId).filter((id): id is string => id !== null));

    const riders: RiderOption[] = riderRows.map((r) => ({
        id: r.id,
        name: `${r.firstName} ${r.lastName}`,
        isAvailable: r.isAvailable,
        isBusy: busyRiderIds.has(r.id),
    }));

    return { success: true, riders };
}