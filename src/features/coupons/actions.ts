"use server";

import { and, eq, gte, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { coupons, couponBranchAllocations } from "@/db/schema/orders";
import { branches } from "@/db/schema/branches";
import { tenantSettings } from "@/db/schema/tenant_settings";
import { getCurrentStaff } from "@/features/auth/actions";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import type { Coupon, NewCoupon } from "@/db/schema/orders";

// NEW
export interface ActiveCoupon extends Coupon {
    // null = uncapped, no offline token constraint needed.
    remainingUses: number | null;
}

export async function getActiveCouponsAction(
    targetBranchId?: string
): Promise<{ data: ActiveCoupon[]; posAllowDiscounts: boolean } | { data: null; error: string }> {
    const currentStaff = await getCurrentStaff();
    if (!currentStaff) return { data: null, error: "Not authenticated." };

    if (!["STAFF", "ADMIN", "SUPER_ADMIN"].includes(currentStaff.role)) {
        return { data: null, error: "You don't have permission to view coupons." };
    }

    let branchId: string;
    if (currentStaff.role === "SUPER_ADMIN") {
        if (!targetBranchId) {
            return { data: null, error: "Select a branch first." };
        }
        branchId = targetBranchId;
    } else {
        if (!currentStaff.branchId) {
            return { data: null, error: "Your account has no branch assigned." };
        }
        branchId = currentStaff.branchId;
    }

    const settings = await db.query.tenantSettings.findFirst({
        where: eq(tenantSettings.tenantId, currentStaff.tenantId),
    });

    const posAllowDiscounts = settings?.posAllowDiscounts ?? true;
    if (!posAllowDiscounts) {
        return { data: [], posAllowDiscounts: false };
    }

    const now = new Date();

    // NEW
    const activeCoupons = await db.query.coupons.findMany({
        where: and(
            eq(coupons.tenantId, currentStaff.tenantId),
            eq(coupons.isActive, true),
            or(isNull(coupons.validFrom), lte(coupons.validFrom, now)),
            or(isNull(coupons.validTo), gte(coupons.validTo, now)),
            or(
                isNull(coupons.maxUses),
                sql`${coupons.usesCount} < ${coupons.maxUses}`
            ),
            or(
                isNull(coupons.branchIds),
                sql`${branchId} = any(${coupons.branchIds})`
            )
        ),
    });

    // Branch-level remaining count, needed for the offline token-split
    // design (Level 2 splits this further, per staff, client-side).
    // An allocation row exists only when the coupon was both capped AND
    // eligible for 2+ branches at creation time — see createCouponAction.
    // Genuinely single-branch coupons have no allocation row; their
    // remaining count is just coupons.maxUses - coupons.usesCount directly.
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
            c.maxUses === null
                ? null
                : allocation
                ? allocation.allocatedUses - allocation.usedCount
                : c.maxUses - c.usesCount;
        return { ...c, remainingUses };
    });

    return { data, posAllowDiscounts: true };
}


// ─── Admin: Create ───────────────────────────────────────────────────────

export interface CreateCouponInput {
    name: string;
    description?: string;
    discountType: NewCoupon["discountType"];
    discountValue: number;
    validFrom?: Date;
    validTo?: Date;
    maxUses?: number;
    // SUPER_ADMIN only — ignored/overridden for ADMIN, who is always
    // auto-scoped to their own branch server-side, no client choice.
    branchIds?: string[];
    menuItemIds?: string[];
    categoryIds?: string[];
}

export async function createCouponAction(
    input: CreateCouponInput
): Promise<{ success: true; coupon: Coupon } | { success?: undefined; error: string }> {
    const currentStaff = await getCurrentStaff();
    if (!currentStaff) return { error: "Not authenticated." };
    if (!["ADMIN", "SUPER_ADMIN"].includes(currentStaff.role)) {
        return { error: "You don't have permission to create coupons." };
    }

    if (!input.name.trim()) return { error: "Coupon name is required." };
    if (input.discountValue <= 0) return { error: "Discount value must be greater than 0." };
    if (input.discountType === "percentage" && input.discountValue > 100) {
        return { error: "Percentage discount cannot exceed 100." };
    }
    if (input.maxUses !== undefined && input.maxUses <= 0) {
        return { error: "Max uses must be greater than 0 if set." };
    }

    let branchIds: string[] | null;
    if (currentStaff.role === "ADMIN") {
        if (!currentStaff.branchId) return { error: "Your account has no branch assigned." };
        branchIds = [currentStaff.branchId];
    } else {
        branchIds = input.branchIds && input.branchIds.length > 0 ? input.branchIds : null;
    }

    try {
        const result = await db.transaction(async (tx) => {
            const [created] = await tx
                .insert(coupons)
                .values({
                    tenantId: currentStaff.tenantId,
                    name: input.name.trim(),
                    description: input.description?.trim() || null,
                    discountType: input.discountType,
                    discountValue: input.discountValue,
                    validFrom: input.validFrom ?? null,
                    validTo: input.validTo ?? null,
                    maxUses: input.maxUses ?? null,
                    branchIds,
                    menuItemIds: input.menuItemIds && input.menuItemIds.length > 0 ? input.menuItemIds : null,
                    categoryIds: input.categoryIds && input.categoryIds.length > 0 ? input.categoryIds : null,
                    createdBy: currentStaff.id,
                    createdByName: `${currentStaff.firstName} ${currentStaff.lastName}`,
                })
                .returning();

            // Level 1 branch split — fixed permanently at creation, never
            // recalculated later even if maxUses or branchIds are edited.
            // Only needed when the coupon is both capped and multi-branch;
            // a single eligible branch just uses coupons.maxUses directly.
            if (input.maxUses) {
                let eligibleBranchIds: string[];

                if (branchIds === null) {
                    const allBranches = await tx.query.branches.findMany({
                        where: and(eq(branches.tenantId, currentStaff.tenantId), eq(branches.isActive, true)),
                    });
                    eligibleBranchIds = allBranches.map((b) => b.id);
                } else {
                    eligibleBranchIds = branchIds;
                }

                if (eligibleBranchIds.length >= 2) {
                    const base = Math.floor(input.maxUses / eligibleBranchIds.length);
                    const remainder = input.maxUses % eligibleBranchIds.length;

                    await tx.insert(couponBranchAllocations).values(
                        eligibleBranchIds.map((branchId, idx) => ({
                            tenantId: currentStaff.tenantId,
                            couponId: created.id,
                            branchId,
                            // First branch absorbs the remainder — doesn't
                            // matter who gets the extra one.
                            allocatedUses: base + (idx === 0 ? remainder : 0),
                        }))
                    );
                }
            }

            return created;
        });

        await logAudit(db, currentStaff, "coupon", result.id, "create", {
            newValue: {
                name: result.name,
                discountType: result.discountType,
                discountValue: result.discountValue,
                maxUses: result.maxUses,
            },
            description: `Created coupon "${result.name}"`,
        });

        revalidatePath("/settings/coupons");
        return { success: true, coupon: result };
    } catch (err) {
        return { error: `Failed to create coupon: ${(err as Error).message}` };
    }
}

// ─── Admin: Update ───────────────────────────────────────────────────────

export interface UpdateCouponInput {
    name?: string;
    description?: string;
    validFrom?: Date | null;
    validTo?: Date | null;
    isActive?: boolean;
    discountValue?: number;
    // Structural fields — only actually applied when the coupon has never
    // been used (see below). Included here so the form can send them
    // uniformly; the server is the source of truth on whether they land.
    discountType?: NewCoupon["discountType"];
    maxUses?: number | null;
    branchIds?: string[] | null;
    menuItemIds?: string[] | null;
    categoryIds?: string[] | null;
}

export async function updateCouponAction(
    couponId: string,
    input: UpdateCouponInput
): Promise<{ success: true } | { success?: undefined; error: string }> {
    const currentStaff = await getCurrentStaff();
    if (!currentStaff) return { error: "Not authenticated." };
    if (!["ADMIN", "SUPER_ADMIN"].includes(currentStaff.role)) {
        return { error: "You don't have permission to edit coupons." };
    }

    const existing = await db.query.coupons.findFirst({
        where: and(eq(coupons.id, couponId), eq(coupons.tenantId, currentStaff.tenantId)),
    });
    if (!existing) return { error: "Coupon not found." };

if (currentStaff.role === "ADMIN") {
    const isOwnBranchCoupon = existing.branchIds?.length === 1 && existing.branchIds[0] === currentStaff.branchId;
    if (!isOwnBranchCoupon) {
        return { error: "You can only edit coupons created for your own branch." };
    }
    input.branchIds = undefined;
}

    const triesToChangeStructural =
        input.discountType !== undefined ||
        input.maxUses !== undefined ||
        input.branchIds !== undefined ||
        input.menuItemIds !== undefined ||
        input.categoryIds !== undefined;

    if (triesToChangeStructural) {
        const newMaxUses = input.maxUses !== undefined ? input.maxUses : existing.maxUses;
        const newBranchIds = input.branchIds !== undefined ? input.branchIds : existing.branchIds;

        if (newMaxUses !== null) {
            let eligibleBranchIds: string[];
            if (newBranchIds === null) {
                const allBranches = await db.query.branches.findMany({
                    where: and(eq(branches.tenantId, currentStaff.tenantId), eq(branches.isActive, true)),
                });
                eligibleBranchIds = allBranches.map((b) => b.id);
            } else {
                eligibleBranchIds = newBranchIds;
            }

            if (eligibleBranchIds.length >= 2) {
                const base = Math.floor(newMaxUses / eligibleBranchIds.length);
                const remainder = newMaxUses % eligibleBranchIds.length;

                // Compare each branch's new fair share against what it has
                // already actually used — if lowering maxUses/branches
                // would put any branch below its real usage, block rather
                // than silently producing a negative/zero-with-drift state.
                const existingAllocations = await db.query.couponBranchAllocations.findMany({
                    where: eq(couponBranchAllocations.couponId, couponId),
                });
                const usedByBranch = new Map(existingAllocations.map((a) => [a.branchId, a.usedCount]));

                for (let idx = 0; idx < eligibleBranchIds.length; idx++) {
                    const branchId = eligibleBranchIds[idx];
                    const newShare = base + (idx === 0 ? remainder : 0);
                    const alreadyUsed = usedByBranch.get(branchId) ?? 0;
                    if (alreadyUsed > newShare) {
                        const branchRow = await db.query.branches.findFirst({ where: eq(branches.id, branchId) });
                        return {
                            error: `Can't set Max Uses that low — ${branchRow?.name ?? "a branch"} has already used ${alreadyUsed}, more than the new share of ${newShare}.`,
                        };
                    }
                }
            }
        }
    }

    await db.transaction(async (tx) => {
        await tx
            .update(coupons)
            .set({
                name: input.name?.trim() ?? existing.name,
                description: input.description !== undefined ? input.description.trim() || null : existing.description,
                validFrom: input.validFrom !== undefined ? input.validFrom : existing.validFrom,
                validTo: input.validTo !== undefined ? input.validTo : existing.validTo,
                isActive: input.isActive ?? existing.isActive,
                discountValue: input.discountValue ?? existing.discountValue,
                discountType: triesToChangeStructural ? (input.discountType ?? existing.discountType) : existing.discountType,
                maxUses: triesToChangeStructural ? (input.maxUses !== undefined ? input.maxUses : existing.maxUses) : existing.maxUses,
                branchIds: triesToChangeStructural ? (input.branchIds !== undefined ? input.branchIds : existing.branchIds) : existing.branchIds,
                menuItemIds: triesToChangeStructural ? (input.menuItemIds !== undefined ? input.menuItemIds : existing.menuItemIds) : existing.menuItemIds,
                categoryIds: triesToChangeStructural ? (input.categoryIds !== undefined ? input.categoryIds : existing.categoryIds) : existing.categoryIds,
                updatedAt: new Date(),
            })
            .where(eq(coupons.id, couponId));

        if (triesToChangeStructural) {
            const newMaxUses = input.maxUses !== undefined ? input.maxUses : existing.maxUses;
            const newBranchIds = input.branchIds !== undefined ? input.branchIds : existing.branchIds;

            const existingAllocations = await tx.query.couponBranchAllocations.findMany({
                where: eq(couponBranchAllocations.couponId, couponId),
            });
            const usedByBranch = new Map(existingAllocations.map((a) => [a.branchId, a.usedCount]));

            // Safe to fully replace now — the pre-check above already
            // confirmed no branch's real usage exceeds its new share.
            await tx.delete(couponBranchAllocations).where(eq(couponBranchAllocations.couponId, couponId));

            if (newMaxUses !== null) {
                let eligibleBranchIds: string[];
                if (newBranchIds === null) {
                    const allBranches = await tx.query.branches.findMany({
                        where: and(eq(branches.tenantId, currentStaff.tenantId), eq(branches.isActive, true)),
                    });
                    eligibleBranchIds = allBranches.map((b) => b.id);
                } else {
                    eligibleBranchIds = newBranchIds;
                }

                if (eligibleBranchIds.length >= 2) {
                    const base = Math.floor(newMaxUses / eligibleBranchIds.length);
                    const remainder = newMaxUses % eligibleBranchIds.length;

                    await tx.insert(couponBranchAllocations).values(
                        eligibleBranchIds.map((branchId, idx) => ({
                            tenantId: currentStaff.tenantId,
                            couponId,
                            branchId,
                            allocatedUses: base + (idx === 0 ? remainder : 0),
                            // Preserve real usage — recalculating the split
                            // must never erase what a branch has already
                            // legitimately used.
                            usedCount: usedByBranch.get(branchId) ?? 0,
                        }))
                    );
                }
            }
        }
    });

    await logAudit(db, currentStaff, "coupon", couponId, "update", {
        oldValue: { name: existing.name, isActive: existing.isActive },
        newValue: { name: input.name ?? existing.name, isActive: input.isActive ?? existing.isActive },
        description: `Updated coupon "${existing.name}"`,
    });

    revalidatePath("/settings/coupons");
    return { success: true };
}

// ─── Admin: Delete ───────────────────────────────────────────────────────

export async function deleteCouponAction(
    couponId: string
): Promise<{ success: true } | { success?: undefined; error: string }> {
    const currentStaff = await getCurrentStaff();
    if (!currentStaff) return { error: "Not authenticated." };
    if (!["ADMIN", "SUPER_ADMIN"].includes(currentStaff.role)) {
        return { error: "You don't have permission to delete coupons." };
    }

    const existing = await db.query.coupons.findFirst({
        where: and(eq(coupons.id, couponId), eq(coupons.tenantId, currentStaff.tenantId)),
    });
    if (!existing) return { error: "Coupon not found." };

    if (currentStaff.role === "ADMIN") {
        const isOwnBranchCoupon = existing.branchIds?.length === 1 && existing.branchIds[0] === currentStaff.branchId;
        if (!isOwnBranchCoupon) {
            return { error: "You can only delete coupons created for your own branch." };
        }
    }

    // Never trust a client-side gate alone — a coupon with any real usage
    // must be deactivated, not deleted, to preserve order-history integrity.
    if (existing.usesCount > 0) {
        return { error: "This coupon has already been used and can't be deleted. Deactivate it instead." };
    }

    await db.delete(coupons).where(eq(coupons.id, couponId));
    // couponBranchAllocations rows cascade-delete automatically via FK.

    await logAudit(db, currentStaff, "coupon", couponId, "delete", {
        oldValue: { name: existing.name },
        description: `Deleted unused coupon "${existing.name}"`,
    });

    revalidatePath("/settings/coupons");
    return { success: true };
}

// ─── Admin: Deactivate ───────────────────────────────────────────────────

export async function deactivateCouponAction(
    couponId: string
): Promise<{ success: true } | { success?: undefined; error: string }> {
    const currentStaff = await getCurrentStaff();
    if (!currentStaff) return { error: "Not authenticated." };
    if (!["ADMIN", "SUPER_ADMIN"].includes(currentStaff.role)) {
        return { error: "You don't have permission to deactivate coupons." };
    }

    const existing = await db.query.coupons.findFirst({
        where: and(eq(coupons.id, couponId), eq(coupons.tenantId, currentStaff.tenantId)),
    });
    if (!existing) return { error: "Coupon not found." };

    if (currentStaff.role === "ADMIN") {
        const isOwnBranchCoupon = existing.branchIds?.length === 1 && existing.branchIds[0] === currentStaff.branchId;
        if (!isOwnBranchCoupon) {
            return { error: "You can only deactivate coupons created for your own branch." };
        }
    }

    await db.update(coupons).set({ isActive: false, updatedAt: new Date() }).where(eq(coupons.id, couponId));

    await logAudit(db, currentStaff, "coupon", couponId, "status_change", {
        oldValue: { isActive: true },
        newValue: { isActive: false },
        description: `Deactivated coupon "${existing.name}"`,
    });

    revalidatePath("/settings/coupons");
    return { success: true };
}

// ─── Admin: List (for the settings page table) ──────────────────────────

export async function listCouponsAdminAction(): Promise <
    { data: Coupon[]; currentBranchId: string | null; error?: undefined } | { data: null; error: string }
> {
    const currentStaff = await getCurrentStaff();
    if (!currentStaff) return { data: null, error: "Not authenticated." };
    if (!["ADMIN", "SUPER_ADMIN"].includes(currentStaff.role)) {
        return { data: null, error: "You don't have permission to view coupons." };
    }

    const allCoupons = await db.query.coupons.findMany({
        where: eq(coupons.tenantId, currentStaff.tenantId),
        orderBy: (c, { desc }) => [desc(c.createdAt)],
    });

    if (currentStaff.role === "SUPER_ADMIN") {
        return { data: allCoupons, currentBranchId: null };
    }

    // ADMIN sees only coupons applicable to their own branch: either
    // scoped to all branches (branchIds null) or explicitly including theirs.
    const scoped = allCoupons.filter(
        (c) => c.branchIds === null || c.branchIds.includes(currentStaff.branchId ?? "")
    );
    return { data: scoped, currentBranchId: currentStaff.branchId ?? null };
}