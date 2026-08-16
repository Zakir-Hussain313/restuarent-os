import "server-only";
import webpush from "web-push";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";

webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
);

export async function sendPushToRider(
    riderId: string,
    payload: { title: string; body: string; url?: string }
): Promise<void> {
    const subs = await db.query.pushSubscriptions.findMany({
        where: eq(pushSubscriptions.staffId, riderId),
    });

    await Promise.all(
        subs.map(async (sub) => {
            try {
                await webpush.sendNotification(
                    {
                        endpoint: sub.endpoint,
                        keys: { p256dh: sub.p256dh, auth: sub.auth },
                    },
                    JSON.stringify(payload)
                );
            } catch (err) {
                const statusCode = (err as { statusCode?: number }).statusCode;
                if (statusCode === 404 || statusCode === 410) {
                    // Expired/unsubscribed — clean up stale row.
                    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
                } else {
                    console.error(`[sendPushToRider] failed for sub ${sub.id}:`, err);
                }
            }
        })
    );
}