"use server";

import { db } from "@/db";
import {
    staff,
    branches,
    menuCategories,
    menuItems,
    restaurantTables,
    tableSections,
    coupons,
    couponBranchAllocations,
    tenantSettings,
    branchSettings,
    attendance,
} from "@/db/schema";
import { getSupabaseServerClient } from "@/lib/supabase";
import { hasPermission } from "@/types/staff";
import { eq, and, asc, or, isNull, lte, gte, lt, sql, inArray } from "drizzle-orm";
import type { MenuCategory, MenuItem, Table } from "@/types";
import type { ActiveCoupon } from "@/features/coupons/actions";
import { RESTAURANT_CONFIG } from "@/lib/restaurantConfig";

// ─── Shared auth (mirrors resolveDashboardAuth's role, but POS always
// needs one concrete branch — no "all branches" mode for SUPER_ADMIN here) ──

async function resolvePosAuth(
    overrideBranchId?: string
): Promise <
    | { ok: true; tenantId: string; branchId: string; staffId: string }
    | { ok: false; error: string }
> {
    const supabase = await getSupabaseServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Not authenticated." };

    const currentStaffRow = await db.query.staff.findFirst({
        where: eq(staff.id, user.id),
    });
    if (!currentStaffRow) return { ok: false, error: "Staff record not found." };

    if (!hasPermission(currentStaffRow.role, "access_pos")) {
        return { ok: false, error: "You don't have permission to access POS." };
    }

    let branchId: string;
    if (currentStaffRow.role === "SUPER_ADMIN") {
        if (!overrideBranchId) return { ok: false, error: "Select a branch before opening POS." };
        const branch = await db.query.branches.findFirst({
            where: and(eq(branches.id, overrideBranchId), eq(branches.tenantId, currentStaffRow.tenantId)),
        });
        if (!branch) return { ok: false, error: "Branch not found." };
        branchId = overrideBranchId;
    } else {
        if (!currentStaffRow.branchId) return { ok: false, error: "Your account has no branch assigned." };
        branchId = currentStaffRow.branchId;
    }

    return { ok: true, tenantId: currentStaffRow.tenantId, branchId, staffId: currentStaffRow.id };
}

function todayInTenantTz(): string {
    return new Date().toLocaleDateString("en-CA", { timeZone: RESTAURANT_CONFIG.timezone });
}

function dayRange(dateStr: string) {
    const start = new Date(`${dateStr}T00:00:00.000Z`);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    return { start, end };
}

// ─── Compute helpers (query logic mirrors the individual actions exactly) ──

async function computeMenuCategories(tenantId: string, branchId: string): Promise<MenuCategory[]> {
    const rows = await db.query.menuCategories.findMany({
        where: and(eq(menuCategories.tenantId, tenantId), eq(menuCategories.branchId, branchId)),
        orderBy: [asc(menuCategories.sortOrder)],
    });

    return rows.map((c) => ({
        id: c.id,
        branchId: c.branchId,
        name: c.name,
        slug: c.slug,
        description: c.description ?? undefined,
        image: c.image ?? undefined,
        icon: c.icon ?? undefined,
        sortOrder: c.sortOrder,
        isActive: c.isActive,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
    }));
}

async function computeMenuItems(tenantId: string, branchId: string): Promise<MenuItem[]> {
    const rows = await db.query.menuItems.findMany({
        where: and(eq(menuItems.tenantId, tenantId), eq(menuItems.branchId, branchId)),
        orderBy: [asc(menuItems.sortOrder)],
        with: {
            variants: true,
            modifierGroups: { with: { options: true } },
        },
    });

    return rows.map((i) => ({
        id: i.id,
        branchId: i.branchId,
        categoryId: i.categoryId,
        name: i.name,
        slug: i.slug,
        description: i.description,
        image: i.image ?? undefined,
        basePrice: i.basePrice,
        variants: i.variants.map((v) => ({
            id: v.id,
            name: v.name,
            price: v.price,
            isDefault: v.isDefault,
            isAvailable: v.isAvailable,
        })),
        modifierGroups: i.modifierGroups.map((g) => ({
            id: g.id,
            name: g.name,
            isRequired: g.isRequired,
            minSelections: g.minSelections,
            maxSelections: g.maxSelections,
            options: g.options.map((o) => ({
                id: o.id,
                name: o.name,
                priceAdjustment: o.priceAdjustment,
                isDefault: o.isDefault,
                isAvailable: o.isAvailable,
            })),
        })),
        status: i.status,
        sortOrder: i.sortOrder,
        isFeatured: i.isFeatured,
        createdAt: i.createdAt.toISOString(),
        updatedAt: i.updatedAt.toISOString(),
    }));
}

async function computeTables(tenantId: string, branchId: string): Promise<Table[]> {
    const rows = await db.query.restaurantTables.findMany({
        where: and(
            eq(restaurantTables.tenantId, tenantId),
            eq(restaurantTables.branchId, branchId),
            eq(restaurantTables.isActive, true)
        ),
        orderBy: [asc(restaurantTables.tableNumber)],
    });

    return rows.map((t) => ({
        id: t.id,
        branchId: t.branchId,
        sectionId: t.sectionId,
        tableNumber: t.tableNumber,
        capacity: t.capacity,
        shape: t.shape,
        status: t.status,
        color: t.color as Table["color"],
        seatingType: t.seatingType as Table["seatingType"],
        chairLayout: (t.chairLayout as Table["chairLayout"]) ?? undefined,
        sofaLayout: (t.sofaLayout as Table["sofaLayout"]) ?? undefined,
        notes: t.notes ?? undefined,
        positionX: t.positionX ?? undefined,
        positionY: t.positionY ?? undefined,
        isActive: t.isActive,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
    }));
}

async function computeTableSections(tenantId: string, branchId: string) {
    return db.query.tableSections.findMany({
        where: and(
            eq(tableSections.tenantId, tenantId),
            eq(tableSections.branchId, branchId),
            eq(tableSections.isActive, true)
        ),
        orderBy: [asc(tableSections.name)],
    });
}

async function computeActiveCoupons(
    tenantId: string,
    branchId: string
): Promise<{ data: ActiveCoupon[]; posAllowDiscounts: boolean }> {
    const settings = await db.query.tenantSettings.findFirst({
        where: eq(tenantSettings.tenantId, tenantId),
    });

    const posAllowDiscounts = settings?.posAllowDiscounts ?? true;
    if (!posAllowDiscounts) return { data: [], posAllowDiscounts: false };

    const now = new Date();

    const activeCoupons = await db.query.coupons.findMany({
        where: and(
            eq(coupons.tenantId, tenantId),
            eq(coupons.isActive, true),
            or(isNull(coupons.validFrom), lte(coupons.validFrom, now)),
            or(isNull(coupons.validTo), gte(coupons.validTo, now)),
            or(isNull(coupons.maxUses), sql`${coupons.usesCount} < ${coupons.maxUses}`),
            or(isNull(coupons.branchIds), sql`${branchId} = any(${coupons.branchIds})`)
        ),
    });

    const couponIds = activeCoupons.map((c) => c.id);
    const allocations = couponIds.length
        ? await db.query.couponBranchAllocations.findMany({
              where: and(
                  inArray(couponBranchAllocations.couponId, couponIds),
                  eq(couponBranchAllocations.branchId, branchId)
              ),
          })
        : [];
    const allocationByCoupon = new Map(allocations.map((a) => [a.couponId, a]));

    const data: ActiveCoupon[] = activeCoupons.map((c) => {
        const allocation = allocationByCoupon.get(c.id);
        const remainingUses =
            c.maxUses === null ? null : allocation ? allocation.allocatedUses - allocation.usedCount : c.maxUses - c.usesCount;
        return { ...c, remainingUses };
    });

    return { data, posAllowDiscounts: true };
}

async function computeClockedInCount(tenantId: string, branchId: string): Promise<number> {
    const todayStr = todayInTenantTz();
    const { start, end } = dayRange(todayStr);

    const rows = await db
        .select({ staffId: staff.id })
        .from(staff)
        .innerJoin(
            attendance,
            and(eq(attendance.staffId, staff.id), gte(attendance.date, start), lt(attendance.date, end))
        )
        .where(
            and(
                eq(staff.tenantId, tenantId),
                eq(staff.branchId, branchId),
                eq(staff.isDeleted, false),
                eq(staff.role, "STAFF"),
                sql`${attendance.checkIn} is not null`,
                sql`${attendance.checkOut} is null`
            )
        );

    return rows.length;
}

async function computeAutoConfirmSetting(branchId: string): Promise<boolean> {
    const settings = await db.query.branchSettings.findFirst({
        where: eq(branchSettings.branchId, branchId),
        columns: { posAutoConfirmOnPlace: true },
    });
    return settings?.posAutoConfirmOnPlace ?? false;
}

async function computeClockStatus(staffId: string): Promise<boolean> {
    const open = await db.query.attendance.findFirst({
        where: and(
            eq(attendance.staffId, staffId),
            sql`${attendance.checkIn} is not null`,
            sql`${attendance.checkOut} is null`
        ),
    });
    return !!open;
}

// ─── Bundle ──────────────────────────────────────────────────────────────

export interface PosInitBundle {
    categories: MenuCategory[];
    items: MenuItem[];
    tables: Table[];
    sections: Awaited<ReturnType<typeof computeTableSections>>;
    coupons: ActiveCoupon[];
    posAllowDiscounts: boolean;
    clockedInCount: number;
    posAutoConfirmOnPlace: boolean;
    isClockedIn: boolean;
    branchId: string;
}

export async function getPosInitBundleAction(
    overrideBranchId?: string
): Promise<{ data: PosInitBundle; error?: undefined } | { data: null; error: string }> {
    const auth = await resolvePosAuth(overrideBranchId);
    if (!auth.ok) return { data: null, error: auth.error };
    const { tenantId, branchId, staffId } = auth;

    const [categories, items, tables, sections, couponsResult, clockedInCount, posAutoConfirmOnPlace, isClockedIn] =
        await Promise.all([
            computeMenuCategories(tenantId, branchId),
            computeMenuItems(tenantId, branchId),
            computeTables(tenantId, branchId),
            computeTableSections(tenantId, branchId),
            computeActiveCoupons(tenantId, branchId),
            computeClockedInCount(tenantId, branchId),
            computeAutoConfirmSetting(branchId),
            computeClockStatus(staffId),
        ]);

    return {
        data: {
            categories,
            items,
            tables,
            sections,
            coupons: couponsResult.data,
            posAllowDiscounts: couponsResult.posAllowDiscounts,
            clockedInCount,
            posAutoConfirmOnPlace,
            isClockedIn,
            branchId,
        },
    };
}