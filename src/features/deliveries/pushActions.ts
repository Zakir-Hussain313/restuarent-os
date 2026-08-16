"use server";

import { db } from "@/db";
import { pushSubscriptions, staff } from "@/db/schema";
import { getSupabaseServerClient } from "@/lib/supabase";
import { eq, and } from "drizzle-orm";

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

export async function saveRiderPushSubscriptionAction(sub: {
    endpoint: string;
    p256dh: string;
    auth: string;
}): Promise<{ success: true } | { success?: undefined; error: string }> {
    const authResult = await getCurrentStaff();
    if (!authResult.ok) return { error: authResult.error };
    const { staff: currentStaffRow } = authResult;

    if (currentStaffRow.role !== "RIDER") {
        return { error: "Only riders can register for push notifications." };
    }

    await db
        .insert(pushSubscriptions)
        .values({
            staffId: currentStaffRow.id,
            endpoint: sub.endpoint,
            p256dh: sub.p256dh,
            auth: sub.auth,
        })
        .onConflictDoNothing();

    return { success: true };
}

export async function removeRiderPushSubscriptionAction(
    endpoint: string
): Promise<{ success: true } | { success?: undefined; error: string }> {
    const authResult = await getCurrentStaff();
    if (!authResult.ok) return { error: authResult.error };
    const { staff: currentStaffRow } = authResult;

    await db
        .delete(pushSubscriptions)
        .where(
            and(
                eq(pushSubscriptions.staffId, currentStaffRow.id),
                eq(pushSubscriptions.endpoint, endpoint)
            )
        );

    return { success: true };
}