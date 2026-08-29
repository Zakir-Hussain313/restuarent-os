"use server";

import { db } from "@/db";
import { restaurantTables, tableReservations, reservationCounters, branches } from "@/db/schema";
import { eq, and, sql, lt, notInArray, desc, inArray } from "drizzle-orm";
import { createNotification } from "@/features/notifications/actions";
import { headers } from "next/headers";
import { publicReservationRateLimit, reservationLookupRateLimit } from "@/lib/rate-limit";

export interface CreateReservationInput {
    tableId: string;
    customerName?: string;
    customerPhone: string;
    partySize: number;
    startTime: string; // ISO string from the client
    durationMinutes: number;
    notes?: string;
}

type CreateReservationResult =
    | {
        success: true;
        reservationId: string;
        reservationNumber: string;
        reservationCode: string;
        overCapacity: boolean;
        error?: undefined;
    }
    | { success?: undefined; error: string; code?: "TABLE_TAKEN" };

const MAX_DURATION_MINUTES = 120;
const MAX_ADVANCE_BOOKING_DAYS = 7;
const NO_SHOW_GRACE_MINUTES = 30;

function generateReservationCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I to avoid confusion
    let code = "";
    for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

const DAY_KEYS = [
    "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday",
] as const;

// V1 targets Pakistan only, no DST — fixed IANA zone via Intl is still
// used (rather than a hardcoded +5 offset) so this keeps working correctly
// if a future tenant/timezone is added in V2.
const RESTAURANT_TIMEZONE = "Asia/Karachi";

// Reads a UTC instant's wall-clock day/hour/minute AS SEEN in
// RESTAURANT_TIMEZONE. Using Date.getDay()/getHours() directly would read
// the SERVER's local timezone instead (Vercel runs UTC), silently
// comparing operating hours against the wrong day/time.
function getLocalParts(date: Date): { dayIndex: number; hours: number; minutes: number } {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: RESTAURANT_TIMEZONE,
        weekday: "short",
        hour: "numeric",
        minute: "numeric",
        hour12: false,
    }).formatToParts(date);

    const weekdayShort = parts.find((p) => p.type === "weekday")!.value; // e.g. "Mon"
    const hours = Number(parts.find((p) => p.type === "hour")!.value) % 24; // Intl can return "24" for midnight
    const minutes = Number(parts.find((p) => p.type === "minute")!.value);

    const WEEKDAY_SHORT_TO_INDEX: Record<string, number> = {
        Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
    };

    return { dayIndex: WEEKDAY_SHORT_TO_INDEX[weekdayShort], hours, minutes };
}

function isWithinOperatingHours(
    startTime: Date,
    durationMinutes: number,
    operatingHours: {
        [K in (typeof DAY_KEYS)[number]]: { open: boolean; openTime: string | null; closeTime: string | null };
    } | null
): { ok: true } | { ok: false; error: string } {
    if (!operatingHours) return { ok: true }; // tenant hasn't configured hours — allow anything

    const startLocal = getLocalParts(startTime);
    const dayKey = DAY_KEYS[startLocal.dayIndex];
    const hours = operatingHours[dayKey];

    if (!hours.open || !hours.openTime || !hours.closeTime) {
        return { ok: false, error: `We're closed on ${dayKey.charAt(0).toUpperCase() + dayKey.slice(1)}s. Please pick another day.` };
    }

    const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);
    const endLocal = getLocalParts(endTime);

    const toMinutes = (t: string) => {
        const [h, m] = t.split(":").map(Number);
        return h * 60 + m;
    };

    const startMinutes = startLocal.hours * 60 + startLocal.minutes;
    const endMinutes = endLocal.hours * 60 + endLocal.minutes;
    const openMinutes = toMinutes(hours.openTime);
    const closeMinutes = toMinutes(hours.closeTime);

    // Doesn't handle overnight hours (e.g. open 6pm, close 2am) — flat
    // same-day comparison only. Fine for typical daytime/evening hours;
    // worth revisiting if a tenant ever needs an overnight schedule.
    if (startMinutes < openMinutes || endMinutes > closeMinutes) {
        return {
            ok: false,
            error: `We're open ${hours.openTime}–${hours.closeTime} that day. Please pick a time within our hours.`,
        };
    }

    return { ok: true };
}

export async function createReservationAction(
    input: CreateReservationInput
): Promise<CreateReservationResult> {
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const { success: withinLimit } = await publicReservationRateLimit.limit(ip);
    if (!withinLimit) {
        return { error: "Too many reservation attempts. Please wait a few minutes and try again." };
    }

    const customerPhone = input.customerPhone.trim();
    if (!customerPhone) {
        return { error: "A phone number is required." };
    }
    if (!Number.isInteger(input.partySize) || input.partySize < 1) {
        return { error: "Party size must be a positive whole number." };
    }
    if (!Number.isInteger(input.durationMinutes) || input.durationMinutes < 1) {
        return { error: "Duration must be a positive whole number of minutes." };
    }
    if (input.durationMinutes > MAX_DURATION_MINUTES) {
        return { error: `Reservations can't be longer than ${MAX_DURATION_MINUTES / 60} hours.` };
    }

    const startTime = new Date(input.startTime);
    if (Number.isNaN(startTime.getTime())) {
        return { error: "Invalid start time." };
    }

    const now = new Date();
    const maxAdvance = new Date(now.getTime() + MAX_ADVANCE_BOOKING_DAYS * 24 * 60 * 60 * 1000);
    if (startTime < now) {
        return { error: "Reservation time must be in the future." };
    }
    if (startTime > maxAdvance) {
        return { error: `Reservations can only be made up to ${MAX_ADVANCE_BOOKING_DAYS} days in advance.` };
    }

    const endTime = new Date(startTime.getTime() + input.durationMinutes * 60 * 1000);

    try {
        const result = await db.transaction(async (tx) => {
            const table = await tx.query.restaurantTables.findFirst({
                where: and(eq(restaurantTables.id, input.tableId), eq(restaurantTables.isActive, true)),
            });
            if (!table) {
                throw new Error("NOT_FOUND");
            }

            const branchRow = await tx.query.branches.findFirst({
                where: eq(branches.id, table.branchId),
                columns: { operatingHours: true },
            });
            const hoursCheck = isWithinOperatingHours(
                startTime,
                input.durationMinutes,
                branchRow?.operatingHours ?? null
            );
            if (!hoursCheck.ok) {
                throw new Error(`HOURS:${hoursCheck.error}`);
            }

            // Lazily expire any abandoned reservations on this table before
            // checking for overlaps — a no-show sitting past its grace
            // period shouldn't block a new booking for the same table.
            const graceThreshold = new Date(now.getTime() - NO_SHOW_GRACE_MINUTES * 60 * 1000);
            await tx
                .update(tableReservations)
                .set({ status: "no_show", updatedAt: new Date() })
                .where(
                    and(
                        eq(tableReservations.tableId, input.tableId),
                        eq(tableReservations.status, "pending"),
                        lt(tableReservations.startTime, graceThreshold)
                    )
                );

            // Overlap check: does any active reservation on this table
            // intersect the requested [startTime, endTime) window?
            // Two ranges overlap when: existing.start < newEnd AND existing.end > newStart.
            const activeStatuses = ["pending", "confirmed", "seated"] as const;
            const candidates = await tx.query.tableReservations.findMany({
                where: and(
                    eq(tableReservations.tableId, input.tableId),
                    notInArray(tableReservations.status, ["cancelled", "no_show"])
                ),
            });

            const hasOverlap = candidates.some((r) => {
                if (!activeStatuses.includes(r.status as (typeof activeStatuses)[number])) return false;
                const existingEnd = new Date(r.startTime.getTime() + r.durationMinutes * 60 * 1000);
                return r.startTime < endTime && existingEnd > startTime;
            });

            if (hasOverlap) {
                throw new Error("TABLE_TAKEN");
            }

            // Reservation number, scoped per branch — same counter pattern as orders.
            const [counter] = await tx
                .insert(reservationCounters)
                .values({ branchId: table.branchId, tenantId: table.tenantId, nextNumber: 2 })
                .onConflictDoUpdate({
                    target: reservationCounters.branchId,
                    set: { nextNumber: sql`${reservationCounters.nextNumber} + 1` },
                })
                .returning();
            const reservationNumber = `RES-${String(counter.nextNumber - 1).padStart(4, "0")}`;

            // Reservation code — random, private, retried on the rare chance of collision.
            let reservationCode = generateReservationCode();
            for (let attempt = 0; attempt < 5; attempt++) {
                const clash = await tx.query.tableReservations.findFirst({
                    where: and(
                        eq(tableReservations.tenantId, table.tenantId),
                        eq(tableReservations.reservationCode, reservationCode)
                    ),
                });
                if (!clash) break;
                reservationCode = generateReservationCode();
            }

            const [reservation] = await tx
                .insert(tableReservations)
                .values({
                    tenantId: table.tenantId,
                    branchId: table.branchId,
                    tableId: table.id,
                    customerName: input.customerName?.trim() || null,
                    customerPhone,
                    partySize: input.partySize,
                    notes: input.notes?.trim() || null,
                    reservationNumber,
                    reservationCode,
                    startTime,
                    durationMinutes: input.durationMinutes,
                    status: "pending",
                })
                .returning();

            return {
                reservationId: reservation.id,
                reservationNumber: reservation.reservationNumber,
                reservationCode: reservation.reservationCode,
                overCapacity: input.partySize > table.capacity,
                tenantId: table.tenantId,
                branchId: table.branchId,
            };
        });

        await createNotification({
            tenantId: result.tenantId,
            branchId: result.branchId,
            type: "reservation_new",
            title: "New reservation request",
            message: `${result.reservationNumber} — party of ${input.partySize}, ${startTime.toLocaleString()}.`,
            resourceType: "reservation",
            resourceId: result.reservationId,
        });

        return {
            success: true,
            reservationId: result.reservationId,
            reservationNumber: result.reservationNumber,
            reservationCode: result.reservationCode,
            overCapacity: result.overCapacity,
        };
    } catch (err) {
        const message = (err as Error).message;
        if (message === "TABLE_TAKEN") {
            return {
                error: "This table isn't available for the selected time. Please pick another time or table.",
                code: "TABLE_TAKEN",
            };
        }
        if (message === "NOT_FOUND") {
            return { error: "This table could not be found." };
        }
        if (message.startsWith("HOURS:")) {
            return { error: message.slice("HOURS:".length) };
        }
        return { error: "Failed to create reservation. Please try again." };
    }
}

export interface LookupReservationInput {
    customerPhone: string;
    reservationCode: string;
}

export interface LookedUpReservation {
    reservationNumber: string;
    status: string;
    startTime: Date;
    durationMinutes: number;
    partySize: number;
    customerName: string | null;
    tableNumber: string;
}

type LookupReservationResult =
    | {
          success: true;
          reservations: LookedUpReservation[];
          error?: undefined;
      }
    | { success?: undefined; error: string };

export async function getMyReservationAction(
    input: LookupReservationInput
): Promise<LookupReservationResult> {
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const { success: withinLimit } = await reservationLookupRateLimit.limit(ip);
    if (!withinLimit) {
        return { error: "Too many attempts. Please wait a minute and try again." };
    }

    const customerPhone = input.customerPhone.trim();
    const reservationCode = input.reservationCode.trim().toUpperCase();

    if (!customerPhone || !reservationCode) {
        return { error: "Phone number and reservation code are both required." };
    }

    // The code+phone pair only needs to match ONE reservation — that's
    // what proves this person owns this phone number. Once verified, we
    // return every reservation tied to that phone, not just the one whose
    // code was entered.
    const matchingReservation = await db.query.tableReservations.findFirst({
        where: and(
            eq(tableReservations.customerPhone, customerPhone),
            eq(tableReservations.reservationCode, reservationCode)
        ),
    });

    if (!matchingReservation) {
        return { error: "No reservation found for that phone number and code. Please double-check both." };
    }

    const allReservations = await db.query.tableReservations.findMany({
        where: eq(tableReservations.customerPhone, customerPhone),
        orderBy: [desc(tableReservations.startTime)],
    });

    const tableIds = [...new Set(allReservations.map((r) => r.tableId))];
    const tables = await db.query.restaurantTables.findMany({
        where: inArray(restaurantTables.id, tableIds),
        columns: { id: true, tableNumber: true },
    });
    const tableNumberById = new Map(tables.map((t) => [t.id, t.tableNumber]));

    return {
        success: true,
        reservations: allReservations.map((reservation) => ({
            reservationNumber: reservation.reservationNumber,
            status: reservation.status,
            startTime: reservation.startTime,
            durationMinutes: reservation.durationMinutes,
            partySize: reservation.partySize,
            customerName: reservation.customerName,
            tableNumber: tableNumberById.get(reservation.tableId) ?? "—",
        })),
    };
}