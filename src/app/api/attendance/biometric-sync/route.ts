import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/db";
import { branchDevices } from "@/db/schema";
import { eq } from "drizzle-orm";
import { biometricSyncRateLimit } from "@/lib/rate-limit";
import { processBiometricPunchBatch } from "@/features/attendance/biometricActions";

// Called by the local sync script on the branch's network, not the browser.
// Auth is a per-device secret (not a shared CRON_SECRET) — a leaked secret
// only exposes one scanner's ability to log punches, not every tenant's.
const MAX_PUNCHES_PER_REQUEST = 500;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const branchDeviceId = body?.branchDeviceId as string | undefined;
  const punches = body?.punches as { externalUserId: string; timestamp: string }[] | undefined;

  if (!branchDeviceId || !Array.isArray(punches)) {
    return NextResponse.json({ error: "branchDeviceId and punches[] are required." }, { status: 400 });
  }
  if (punches.length > MAX_PUNCHES_PER_REQUEST) {
    return NextResponse.json({ error: `Too many punches in one request (max ${MAX_PUNCHES_PER_REQUEST}).` }, { status: 400 });
  }

  const { success } = await biometricSyncRateLimit.limit(branchDeviceId);
  if (!success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const device = await db.query.branchDevices.findFirst({ where: eq(branchDevices.id, branchDeviceId) });
  if (!device || device.deviceType !== "fingerprint_scanner" || device.status !== "approved" || !device.deviceToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const authHeader = request.headers.get("authorization");
  const providedSecret = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (
    !providedSecret ||
    providedSecret.length !== device.deviceToken.length ||
    !crypto.timingSafeEqual(Buffer.from(providedSecret), Buffer.from(device.deviceToken))
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processBiometricPunchBatch(branchDeviceId, punches);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, results: result.results });
}