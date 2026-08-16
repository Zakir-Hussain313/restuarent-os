import { NextResponse } from "next/server";
import { checkTimeBasedNotifications } from "@/features/notifications/cron";
import { cronRateLimit } from "@/lib/rate-limit";

export async function GET(request: Request) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { success } = await cronRateLimit.limit("cron-check-notifications");
    if (!success) {
        return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }
    await checkTimeBasedNotifications();
    return NextResponse.json({ ok: true });
}