"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/useMockQuery";
import type { MenuCategory, MenuItem } from "@/types";

// ─── Input Types ──────────────────────────────────────────────────────────────

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
    status: MenuItem["status"];
    isFeatured: boolean;
    isPopular: boolean;
    spiceLevel: MenuItem["spiceLevel"];
    dietaryTags: MenuItem["dietaryTags"];
    preparationTimeMinutes: number;
    calories?: number;
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function slugify(name: string): string {
    return name.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^\w-]/g, "");
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useMenuActions() {
    const queryClient = useQueryClient();

    // ── Add Category ───────────────────────────────────────────────
    const { mutate: addCategory, isPending: isAddingCategory } = useMutation({
        mutationFn: (input: CategoryFormInput): Promise<MenuCategory> =>
            new Promise((resolve) =>
                setTimeout(() => {
                    const categories = queryClient.getQueryData<MenuCategory[]>(queryKeys.menu.categories) ?? [];
                    resolve({
                        id: generateId("cat"),
                        restaurantId: "rest_001",
                        slug: slugify(input.name),
                        sortOrder: categories.length + 1,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        ...input,
                    });
                }, 400)
            ),
        onSuccess: (newCategory) => {
            queryClient.setQueryData<MenuCategory[]>(
                queryKeys.menu.categories,
                (old) => [...(old ?? []), newCategory]
            );
        },
    });

    // ── Edit Category ──────────────────────────────────────────────
    const { mutate: editCategory, isPending: isEditingCategory } = useMutation({
        mutationFn: ({ id, input }: { id: string; input: CategoryFormInput }): Promise<{ id: string; input: CategoryFormInput }> =>
            new Promise((resolve) => setTimeout(() => resolve({ id, input }), 400)),
        onSuccess: ({ id, input }) => {
            queryClient.setQueryData<MenuCategory[]>(
                queryKeys.menu.categories,
                (old) => old?.map((c) =>
                    c.id === id
                        ? { ...c, ...input, slug: slugify(input.name), updatedAt: new Date().toISOString() }
                        : c
                ) ?? []
            );
        },
    });

    // ── Delete Category ────────────────────────────────────────────
    const { mutate: deleteCategory, isPending: isDeletingCategory } = useMutation({
        mutationFn: (categoryId: string): Promise<string> =>
            new Promise((resolve) => setTimeout(() => resolve(categoryId), 400)),
        onSuccess: (categoryId) => {
            queryClient.setQueryData<MenuCategory[]>(
                queryKeys.menu.categories,
                (old) => old?.filter((c) => c.id !== categoryId) ?? []
            );
            // Also remove all items in this category
            queryClient.setQueryData<MenuItem[]>(
                queryKeys.menu.items,
                (old) => old?.filter((i) => i.categoryId !== categoryId) ?? []
            );
        },
    });

    // ── Add Item ───────────────────────────────────────────────────
    const { mutate: addItem, isPending: isAddingItem } = useMutation({
        mutationFn: (input: ItemFormInput): Promise<MenuItem> =>
            new Promise((resolve) =>
                setTimeout(() => {
                    const items = queryClient.getQueryData<MenuItem[]>(queryKeys.menu.items) ?? [];
                    const categoryItems = items.filter((i) => i.categoryId === input.categoryId);
                    resolve({
                        id: generateId("item"),
                        restaurantId: "rest_001",
                        slug: slugify(input.name),
                        image: undefined,
                        sortOrder: categoryItems.length + 1,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        ...input,
                        variants: input.variants.map((v) => ({
                            ...v,
                            id: v.id ?? generateId("var"),
                        })),
                        modifierGroups: input.modifierGroups.map((g) => ({
                            ...g,
                            id: g.id ?? generateId("mod"),
                            options: g.options.map((o) => ({
                                ...o,
                                id: o.id ?? generateId("opt"),
                            })),
                        })),
                    });
                }, 400)
            ),
        onSuccess: (newItem) => {
            queryClient.setQueryData<MenuItem[]>(
                queryKeys.menu.items,
                (old) => [...(old ?? []), newItem]
            );
        },
    });

    // ── Edit Item ──────────────────────────────────────────────────
    const { mutate: editItem, isPending: isEditingItem } = useMutation({
        mutationFn: ({ id, input }: { id: string; input: ItemFormInput }): Promise<{ id: string; input: ItemFormInput }> =>
            new Promise((resolve) => setTimeout(() => resolve({ id, input }), 400)),
        onSuccess: ({ id, input }) => {
            queryClient.setQueryData<MenuItem[]>(
                queryKeys.menu.items,
                (old) => old?.map((i) =>
                    i.id === id
                        ? {
                            ...i,
                            ...input,
                            slug: slugify(input.name),
                            updatedAt: new Date().toISOString(),
                            variants: input.variants.map((v) => ({ ...v, id: v.id ?? generateId("var") })),
                            modifierGroups: input.modifierGroups.map((g) => ({
                                ...g,
                                id: g.id ?? generateId("mod"),
                                options: g.options.map((o) => ({ ...o, id: o.id ?? generateId("opt") })),
                            })),
                        }
                        : i
                ) ?? []
            );
        },
    });

    // ── Delete Item ────────────────────────────────────────────────
    const { mutate: deleteItem, isPending: isDeletingItem } = useMutation({
        mutationFn: (itemId: string): Promise<string> =>
            new Promise((resolve) => setTimeout(() => resolve(itemId), 400)),
        onSuccess: (itemId) => {
            queryClient.setQueryData<MenuItem[]>(
                queryKeys.menu.items,
                (old) => old?.filter((i) => i.id !== itemId) ?? []
            );
        },
    });

    return {
        addCategory, isAddingCategory,
        editCategory, isEditingCategory,
        deleteCategory, isDeletingCategory,
        addItem, isAddingItem,
        editItem, isEditingItem,
        deleteItem, isDeletingItem,
    };
}