"use server";

import { db } from "@/db";
import { notifications, notificationReads, notificationClears, staff } from "@/db/schema";
import { broadcastChange } from "@/lib/realtime/broadcast";
import { getCurrentStaff } from "@/features/auth/actions";
import { and, eq, desc, inArray, gt, lte } from "drizzle-orm";
import type { NotificationType } from "@/db/schema";

interface CreateNotificationInput {
    tenantId: string;
    branchId: string;
    type: NotificationType;
    title: string;
    message: string;
    resourceType?: string;
    resourceId?: string;
}

// Single entry point every trigger (event-driven or cron) calls.
// Never throws — a notification failure must never break the action
// that triggered it, same guarantee as logAudit.
export async function createNotification(input: CreateNotificationInput): Promise<void> {
    try {
        await db.insert(notifications).values({
            tenantId: input.tenantId,
            branchId: input.branchId,
            type: input.type,
            title: input.title,
            message: input.message,
            resourceType: input.resourceType ?? null,
            resourceId: input.resourceId ?? null,
        });
        await broadcastChange(input.branchId, "notifications");
    } catch (err) {
        console.error("[notifications] Failed to create notification:", err);
    }
}

export async function getNotificationsAction(limit: number = 50) {
    const currentStaff = await getCurrentStaff();
    if (!currentStaff) return { error: "Not authenticated." };

    if (!currentStaff.branchId) return { data: [] };

    const clearRecord = await db.query.notificationClears.findFirst({
        where: eq(notificationClears.staffId, currentStaff.id),
    });

    const rows = await db.query.notifications.findMany({
        where: and(
            eq(notifications.tenantId, currentStaff.tenantId),
            eq(notifications.branchId, currentStaff.branchId),
            clearRecord ? gt(notifications.createdAt, clearRecord.clearedAt) : undefined
        ),
        orderBy: desc(notifications.createdAt),
        limit,
    });

    const reads = await db.query.notificationReads.findMany({
        where: and(
            eq(notificationReads.staffId, currentStaff.id),
            inArray(notificationReads.notificationId, rows.map((r) => r.id))
        ),
    });
    const readIds = new Set(reads.map((r) => r.notificationId));

    return {
        data: rows.map((r) => ({ ...r, isRead: readIds.has(r.id) })),
    };
}

export async function markAllReadAction(): Promise<{ success: true } | { error: string }> {
    const currentStaff = await getCurrentStaff();
    if (!currentStaff) return { error: "Not authenticated." };

    if (!currentStaff.branchId) return { success: true };

    const rows = await db.query.notifications.findMany({
        where: and(
            eq(notifications.tenantId, currentStaff.tenantId),
            eq(notifications.branchId, currentStaff.branchId)
        ),
        columns: { id: true },
    });

    const alreadyRead = await db.query.notificationReads.findMany({
        where: and(
            eq(notificationReads.staffId, currentStaff.id),
            inArray(notificationReads.notificationId, rows.map((r) => r.id))
        ),
        columns: { notificationId: true },
    });
    const readSet = new Set(alreadyRead.map((r) => r.notificationId));
    const toInsert = rows.filter((r) => !readSet.has(r.id));

    if (toInsert.length > 0) {
        await db.insert(notificationReads).values(
            toInsert.map((r) => ({ notificationId: r.id, staffId: currentStaff.id }))
        );
    }

    return { success: true };
}

// Clears the current staff member's view of all past notifications —
// they'll only see ones created after this moment going forward. Data is
// NOT deleted here. Separately, once every active staff member in the
// branch has cleared past a shared point in time, that portion of history
// is permanently deleted since nobody can see it anymore anyway.
export async function clearAllNotificationsAction(): Promise<{ success: true } | { error: string }> {
    const currentStaff = await getCurrentStaff();
    if (!currentStaff) return { error: "Not authenticated." };
    if (!currentStaff.branchId) return { success: true };

    const now = new Date();
    const branchId = currentStaff.branchId;

    await db
        .insert(notificationClears)
        .values({ staffId: currentStaff.id, branchId, clearedAt: now })
        .onConflictDoUpdate({
            target: notificationClears.staffId,
            set: { clearedAt: now },
        });

    const activeStaff = await db.query.staff.findMany({
        where: and(eq(staff.branchId, branchId), eq(staff.isDeleted, false)),
        columns: { id: true },
    });

    if (activeStaff.length > 0) {
        const clears = await db.query.notificationClears.findMany({
            where: eq(notificationClears.branchId, branchId),
        });
        const clearMap = new Map(clears.map((c) => [c.staffId, c.clearedAt]));

        const everyoneCleared = activeStaff.every((s) => clearMap.has(s.id));
        if (everyoneCleared) {
            const minClearedAt = new Date(
                Math.min(...activeStaff.map((s) => clearMap.get(s.id)!.getTime()))
            );
            await db
                .delete(notifications)
                .where(and(eq(notifications.branchId, branchId), lte(notifications.createdAt, minClearedAt)));
        }
    }

    return { success: true };
}