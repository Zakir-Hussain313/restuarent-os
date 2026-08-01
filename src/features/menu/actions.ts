// src/features/menu/actions.ts
"use server";

import { db } from "@/db";
import {
    menuCategories,
    menuItems,
    menuItemVariants,
    modifierGroups,
    modifierOptions,
    Staff,
    staff,
} from "@/db/schema";
import { getSupabaseServerClient } from "@/lib/supabase";
import { eq, and, asc, count } from "drizzle-orm";
import type {
    MenuCategory,
    MenuItem,
    MenuItemStatus,
} from "@/types";

// ─── Shared input types (mirrors useMenuActions.ts exactly) ───────────────

export interface CategoryFormInput {
    name: string;
    description?: string;
    icon?: string;
    isActive: boolean;
}

export interface ItemFormInput {
    categoryId: string;
    name: string;
    description: string;
    basePrice: number;
    status: MenuItemStatus;
    image?: string;
    variants: Array<{
        id?: string;
        name: string;
        price: number;
        isDefault: boolean;
        isAvailable: boolean;
    }>;
    modifierGroups: Array<{
        id?: string;
        name: string;
        isRequired: boolean;
        minSelections: number;
        maxSelections: number;
        options: Array<{
            id?: string;
            name: string;
            priceAdjustment: number;
            isDefault: boolean;
            isAvailable: boolean;
        }>;
    }>;
}

function slugify(name: string): string {
    return name.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^\w-]/g, "");
}

// ─── Shared auth helper ─────────────────────────────────────────────────
// Not extracted to a top-level shared file yet (matches this project's
// existing pattern of inline checks per action file, e.g. dashboard/actions.ts)

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

function resolveBranchForWrite(
    currentStaffRow: Staff,
    targetBranchId?: string
): { ok: true; branchId: string } | { ok: false; error: string } {
    const isAdmin = currentStaffRow.role === "ADMIN";
    const isSuperAdmin = currentStaffRow.role === "SUPER_ADMIN";

    if (isAdmin) {
        if (!currentStaffRow.branchId) {
            return { ok: false, error: "Your account has no branch assigned." };
        }
        return { ok: true, branchId: currentStaffRow.branchId };
    }

    if (isSuperAdmin) {
        if (!targetBranchId) {
            return { ok: false, error: "Select a branch before making changes." };
        }
        return { ok: true, branchId: targetBranchId };
    }

    return { ok: false, error: "You don't have permission to manage the menu." };
}

// Resolves which branch an action should target, and whether the caller
// is allowed to touch it. ADMIN is always forced to their own branch.
// SUPER_ADMIN must explicitly pass targetBranchId for writes (there's no
// sensible "default" branch to write into on their behalf).

// ─── Reads ──────────────────────────────────────────────────────────────

export async function getMenuCategoriesAction(
    overrideBranchId?: string
): Promise<{ data: MenuCategory[]; error?: undefined } | { data: null; error: string }> {
    const auth = await getCurrentStaff();
    if (!auth.ok) return { data: null, error: auth.error };
    const { staff: currentStaffRow } = auth;

    const isBranchLocked = currentStaffRow.role === "ADMIN" || currentStaffRow.role === "STAFF";
    if (isBranchLocked && !currentStaffRow.branchId) {
        return { data: null, error: "Your account has no branch assigned." };
    }

    const tenantId = currentStaffRow.tenantId;
    const branchId = isBranchLocked ? currentStaffRow.branchId! : overrideBranchId;

    const rows = await db.query.menuCategories.findMany({
        where: and(
            eq(menuCategories.tenantId, tenantId),
            branchId ? eq(menuCategories.branchId, branchId) : undefined
        ),
        orderBy: [asc(menuCategories.sortOrder)],
    });

    const data: MenuCategory[] = rows.map((c) => ({
        id: c.id,
        branchId: c.branchId, // see naming note above
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

    return { data };
}

export async function getMenuItemsAction(
    overrideBranchId?: string
): Promise<{ data: MenuItem[]; error?: undefined } | { data: null; error: string }> {
    const auth = await getCurrentStaff();
    if (!auth.ok) return { data: null, error: auth.error };
    const { staff: currentStaffRow } = auth;

    const isBranchLocked = currentStaffRow.role === "ADMIN" || currentStaffRow.role === "STAFF";
    if (isBranchLocked && !currentStaffRow.branchId) {
        return { data: null, error: "Your account has no branch assigned." };
    }

    const tenantId = currentStaffRow.tenantId;
    const branchId = isBranchLocked ? currentStaffRow.branchId! : overrideBranchId;

    const rows = await db.query.menuItems.findMany({
        where: and(
            eq(menuItems.tenantId, tenantId),
            branchId ? eq(menuItems.branchId, branchId) : undefined
        ),
        orderBy: [asc(menuItems.sortOrder)],
        with: {
            variants: true,
            modifierGroups: {
                with: { options: true },
            },
        },
    });

    const data: MenuItem[] = rows.map((i) => ({
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

    return { data };
}

// ─── Category mutations (ADMIN / SUPER_ADMIN only) ─────────────────────

export async function createCategoryAction(
    input: CategoryFormInput,
    targetBranchId?: string
): Promise<{ success: true; category: MenuCategory } | { success?: undefined; error: string }> {
    const auth = await getCurrentStaff();
    if (!auth.ok) return { error: auth.error };
    const { staff: currentStaffRow } = auth;

    if (currentStaffRow.role !== "ADMIN" && currentStaffRow.role !== "SUPER_ADMIN") {
        return { error: "You don't have permission to manage the menu." };
    }

    const resolved = resolveBranchForWrite(currentStaffRow, targetBranchId);
    if (!resolved.ok) return { error: resolved.error };
    // use resolved.branchId

    try {
        const [created] = await db
            .insert(menuCategories)
            .values({
                tenantId: currentStaffRow.tenantId,
                branchId: resolved.branchId,
                name: input.name,
                slug: slugify(input.name),
                description: input.description ?? null,
                icon: input.icon ?? null,
                isActive: input.isActive,
                sortOrder: 0, // TODO: compute real next sortOrder if ordering matters at creation time
            })
            .returning();

        return {
            success: true,
            category: {
                id: created.id,
                branchId: created.branchId,
                name: created.name,
                slug: created.slug,
                description: created.description ?? undefined,
                image: created.image ?? undefined,
                icon: created.icon ?? undefined,
                sortOrder: created.sortOrder,
                isActive: created.isActive,
                createdAt: created.createdAt.toISOString(),
                updatedAt: created.updatedAt.toISOString(),
            },
        };
    } catch (err) {
        const error = err as Error & { cause?: { message?: string } };
        const causeMessage = error.cause?.message ?? "";
        if (causeMessage.includes("menu_categories_branch_name_unique")) {
            return { error: `A category named "${input.name}" already exists in this branch.` };
        }
        return { error: `Failed to create category: ${error.message}` };
    }
}

export async function updateCategoryAction(
    id: string,
    input: CategoryFormInput
): Promise<{ success: true } | { success?: undefined; error: string }> {
    const auth = await getCurrentStaff();
    if (!auth.ok) return { error: auth.error };
    const { staff: currentStaffRow } = auth;

    if (currentStaffRow.role !== "ADMIN" && currentStaffRow.role !== "SUPER_ADMIN") {
        return { error: "You don't have permission to manage the menu." };
    }

    const target = await db.query.menuCategories.findFirst({
        where: eq(menuCategories.id, id),
    });
    if (!target || target.tenantId !== currentStaffRow.tenantId) {
        return { error: "Category not found." };
    }
    if (currentStaffRow.role === "ADMIN" && target.branchId !== currentStaffRow.branchId) {
        return { error: "You can only manage your own branch's menu." };
    }

    await db
        .update(menuCategories)
        .set({
            name: input.name,
            slug: slugify(input.name),
            description: input.description ?? null,
            icon: input.icon ?? null,
            isActive: input.isActive,
            updatedAt: new Date(),
        })
        .where(eq(menuCategories.id, id));

    return { success: true };
}

export async function deleteCategoryAction(
    id: string
): Promise<{ success: true } | { success?: undefined; error: string }> {
    const auth = await getCurrentStaff();
    if (!auth.ok) return { error: auth.error };
    const { staff: currentStaffRow } = auth;

    if (currentStaffRow.role !== "ADMIN" && currentStaffRow.role !== "SUPER_ADMIN") {
        return { error: "You don't have permission to manage the menu." };
    }

    const target = await db.query.menuCategories.findFirst({
        where: eq(menuCategories.id, id),
    });
    if (!target || target.tenantId !== currentStaffRow.tenantId) {
        return { error: "Category not found." };
    }
    if (currentStaffRow.role === "ADMIN" && target.branchId !== currentStaffRow.branchId) {
        return { error: "You can only manage your own branch's menu." };
    }

    // menuItems.categoryId cascades on delete (per schema), so items in this
    // category are removed automatically at the DB level.
    await db.delete(menuCategories).where(eq(menuCategories.id, id));

    return { success: true };
}

export async function toggleCategoryActiveAction(
    id: string,
    isActive: boolean
): Promise<{ success: true } | { success?: undefined; error: string }> {
    const auth = await getCurrentStaff();
    if (!auth.ok) return { error: auth.error };
    const { staff: currentStaffRow } = auth;

    if (currentStaffRow.role !== "ADMIN" && currentStaffRow.role !== "SUPER_ADMIN") {
        return { error: "You don't have permission to manage the menu." };
    }

    const target = await db.query.menuCategories.findFirst({
        where: eq(menuCategories.id, id),
    });
    if (!target || target.tenantId !== currentStaffRow.tenantId) {
        return { error: "Category not found." };
    }
    if (currentStaffRow.role === "ADMIN" && target.branchId !== currentStaffRow.branchId) {
        return { error: "You can only manage your own branch's menu." };
    }

    await db
        .update(menuCategories)
        .set({ isActive, updatedAt: new Date() })
        .where(eq(menuCategories.id, id));

    return { success: true };
}

// ─── Item mutations ──────────────────────────────────────────────────────

export async function createMenuItemAction(
    input: ItemFormInput,
    targetBranchId?: string
): Promise<{ success: true; item: MenuItem } | { success?: undefined; error: string }> {
    const auth = await getCurrentStaff();
    if (!auth.ok) return { error: auth.error };
    const { staff: currentStaffRow } = auth;

    if (currentStaffRow.role !== "ADMIN" && currentStaffRow.role !== "SUPER_ADMIN") {
        return { error: "You don't have permission to manage the menu." };
    }

    const resolved = resolveBranchForWrite(currentStaffRow, targetBranchId);
    if (!resolved.ok) return { error: resolved.error };
    // use resolved.branchId

    try {
        const created = await db.transaction(async (tx) => {
            const [item] = await tx
                .insert(menuItems)
                .values({
                    tenantId: currentStaffRow.tenantId,
                    branchId: resolved.branchId,
                    categoryId: input.categoryId,
                    name: input.name,
                    slug: slugify(input.name),
                    description: input.description,
                    basePrice: input.basePrice,
                    status: input.status,
                    sortOrder: 0,
                })
                .returning();

            const insertedVariants = input.variants.length
                ? await tx
                    .insert(menuItemVariants)
                    .values(
                        input.variants.map((v) => ({
                            tenantId: currentStaffRow.tenantId,
                            menuItemId: item.id,
                            name: v.name,
                            price: v.price,
                            isDefault: v.isDefault,
                            isAvailable: v.isAvailable,
                        }))
                    )
                    .returning()
                : [];

            const insertedGroups = [];
            for (const g of input.modifierGroups) {
                const [group] = await tx
                    .insert(modifierGroups)
                    .values({
                        tenantId: currentStaffRow.tenantId,
                        menuItemId: item.id,
                        name: g.name,
                        isRequired: g.isRequired,
                        minSelections: g.minSelections,
                        maxSelections: g.maxSelections,
                    })
                    .returning();

                const insertedOptions = g.options.length
                    ? await tx
                        .insert(modifierOptions)
                        .values(
                            g.options.map((o) => ({
                                tenantId: currentStaffRow.tenantId,
                                modifierGroupId: group.id,
                                name: o.name,
                                priceAdjustment: o.priceAdjustment,
                                isDefault: o.isDefault,
                                isAvailable: o.isAvailable,
                            }))
                        )
                        .returning()
                    : [];

                insertedGroups.push({ ...group, options: insertedOptions });
            }

            return { item, variants: insertedVariants, modifierGroups: insertedGroups };
        });

        return {
            success: true,
            item: {
                id: created.item.id,
                branchId: created.item.branchId,
                categoryId: created.item.categoryId,
                name: created.item.name,
                slug: created.item.slug,
                description: created.item.description,
                image: created.item.image ?? undefined,
                basePrice: created.item.basePrice,
                variants: created.variants.map((v) => ({
                    id: v.id,
                    name: v.name,
                    price: v.price,
                    isDefault: v.isDefault,
                    isAvailable: v.isAvailable,
                })),
                modifierGroups: created.modifierGroups.map((g) => ({
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
                status: created.item.status,
                sortOrder: created.item.sortOrder,
                isFeatured: created.item.isFeatured,
                createdAt: created.item.createdAt.toISOString(),
                updatedAt: created.item.updatedAt.toISOString(),
            },
        };
    } catch (err) {
        const error = err as Error & { cause?: { message?: string } };
        const causeMessage = error.cause?.message ?? "";
        if (causeMessage.includes("menu_items_branch_name_unique")) {
            return { error: `An item named "${input.name}" already exists in this branch.` };
        }
        return { error: `Failed to create menu item: ${error.message}` };
    }
}

export async function updateMenuItemAction(
    id: string,
    input: ItemFormInput
): Promise<{ success: true } | { success?: undefined; error: string }> {
    const auth = await getCurrentStaff();
    if (!auth.ok) return { error: auth.error };
    const { staff: currentStaffRow } = auth;

    if (currentStaffRow.role !== "ADMIN" && currentStaffRow.role !== "SUPER_ADMIN") {
        return { error: "You don't have permission to manage the menu." };
    }

    const target = await db.query.menuItems.findFirst({
        where: eq(menuItems.id, id),
    });
    if (!target || target.tenantId !== currentStaffRow.tenantId) {
        return { error: "Menu item not found." };
    }
    if (currentStaffRow.role === "ADMIN" && target.branchId !== currentStaffRow.branchId) {
        return { error: "You can only manage your own branch's menu." };
    }

    try {
        await db.transaction(async (tx) => {
            await tx
                .update(menuItems)
                .set({
                    categoryId: input.categoryId,
                    name: input.name,
                    slug: slugify(input.name),
                    description: input.description,
                    basePrice: input.basePrice,
                    status: input.status,
                    image: input.image,
                    updatedAt: new Date(),
                })
                .where(eq(menuItems.id, id));

            // Option B: wipe and rebuild all nested config rows on every edit.
            // Simple, correct, and safe — nothing else references these rows by ID.
            await tx.delete(menuItemVariants).where(eq(menuItemVariants.menuItemId, id));
            await tx.delete(modifierGroups).where(eq(modifierGroups.menuItemId, id));
            // modifierOptions cascade-delete automatically via modifierGroupId FK.

            if (input.variants.length) {
                await tx.insert(menuItemVariants).values(
                    input.variants.map((v) => ({
                        tenantId: currentStaffRow.tenantId,
                        menuItemId: id,
                        name: v.name,
                        price: v.price,
                        isDefault: v.isDefault,
                        isAvailable: v.isAvailable,
                    }))
                );
            }

            for (const g of input.modifierGroups) {
                const [group] = await tx
                    .insert(modifierGroups)
                    .values({
                        tenantId: currentStaffRow.tenantId,
                        menuItemId: id,
                        name: g.name,
                        isRequired: g.isRequired,
                        minSelections: g.minSelections,
                        maxSelections: g.maxSelections,
                    })
                    .returning();

                if (g.options.length) {
                    await tx.insert(modifierOptions).values(
                        g.options.map((o) => ({
                            tenantId: currentStaffRow.tenantId,
                            modifierGroupId: group.id,
                            name: o.name,
                            priceAdjustment: o.priceAdjustment,
                            isDefault: o.isDefault,
                            isAvailable: o.isAvailable,
                        }))
                    );
                }
            }
        });

        return { success: true };
    } catch (err) {
        return { error: `Failed to update menu item: ${(err as Error).message}` };
    }
}

export async function deleteMenuItemAction(
    id: string
): Promise<{ success: true } | { success?: undefined; error: string }> {
    const auth = await getCurrentStaff();
    if (!auth.ok) return { error: auth.error };
    const { staff: currentStaffRow } = auth;

    if (currentStaffRow.role !== "ADMIN" && currentStaffRow.role !== "SUPER_ADMIN") {
        return { error: "You don't have permission to manage the menu." };
    }

    const target = await db.query.menuItems.findFirst({
        where: eq(menuItems.id, id),
    });
    if (!target || target.tenantId !== currentStaffRow.tenantId) {
        return { error: "Menu item not found." };
    }
    if (currentStaffRow.role === "ADMIN" && target.branchId !== currentStaffRow.branchId) {
        return { error: "You can only manage your own branch's menu." };
    }

    // variants/modifierGroups/modifierOptions all cascade on menuItemId FK.
    await db.delete(menuItems).where(eq(menuItems.id, id));

    return { success: true };
}

export async function toggleItemStatusAction(
    id: string,
    status: MenuItemStatus
): Promise<{ success: true } | { success?: undefined; error: string }> {
    const auth = await getCurrentStaff();
    if (!auth.ok) return { error: auth.error };
    const { staff: currentStaffRow } = auth;

    // STAFF is allowed here specifically — per project brief, marking items
    // available/unavailable is an explicit STAFF capability, unlike full CRUD.
    const allowedRoles = ["ADMIN", "SUPER_ADMIN", "STAFF"];
    if (!allowedRoles.includes(currentStaffRow.role)) {
        return { error: "You don't have permission to update menu items." };
    }

    const target = await db.query.menuItems.findFirst({
        where: eq(menuItems.id, id),
    });
    if (!target || target.tenantId !== currentStaffRow.tenantId) {
        return { error: "Menu item not found." };
    }
    // STAFF and ADMIN both locked to their own branch; SUPER_ADMIN unrestricted.
    if (currentStaffRow.role !== "SUPER_ADMIN" && target.branchId !== currentStaffRow.branchId) {
        return { error: "You can only manage your own branch's menu." };
    }

    await db
        .update(menuItems)
        .set({ status, updatedAt: new Date() })
        .where(eq(menuItems.id, id));

    return { success: true };
}


export async function toggleItemFeaturedAction(
    id: string
): Promise<{ success: true; isFeatured: boolean } | { success?: undefined; error: string }> {
    const auth = await getCurrentStaff();
    if (!auth.ok) return { error: auth.error };
    const { staff: currentStaffRow } = auth;

    // Curation decision, not an availability toggle — STAFF excluded on purpose.
    if (currentStaffRow.role !== "ADMIN" && currentStaffRow.role !== "SUPER_ADMIN") {
        return { error: "You don't have permission to manage featured items." };
    }

    const target = await db.query.menuItems.findFirst({
        where: eq(menuItems.id, id),
    });
    if (!target || target.tenantId !== currentStaffRow.tenantId) {
        return { error: "Menu item not found." };
    }
    // ADMIN locked to their own branch; SUPER_ADMIN unrestricted.
    if (currentStaffRow.role !== "SUPER_ADMIN" && target.branchId !== currentStaffRow.branchId) {
        return { error: "You can only manage your own branch's menu." };
    }

    const nextFeatured = !target.isFeatured;

    if (nextFeatured) {
        const featuredCount = await db
            .select({ count: count() })
            .from(menuItems)
            .where(and(eq(menuItems.branchId, target.branchId), eq(menuItems.isFeatured, true)));

        if ((featuredCount[0]?.count ?? 0) >= 6) {
            return { error: "You can only feature up to 6 items per branch. Unfeature another item first." };
        }
    }

    await db
        .update(menuItems)
        .set({ isFeatured: nextFeatured, updatedAt: new Date() })
        .where(eq(menuItems.id, id));

    return { success: true, isFeatured: nextFeatured };
}