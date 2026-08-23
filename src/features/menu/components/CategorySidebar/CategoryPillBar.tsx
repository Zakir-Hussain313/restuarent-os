"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Pencil, Trash2, Loader2, UtensilsCrossed } from "lucide-react";
import { useAlertModal } from "@/components/providers/AlertModalProvider";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { MenuCategory } from "@/types";

interface CategoryPillBarProps {
    categories: MenuCategory[];
    itemCounts: Record<string, number>;
    totalItemCount: number;
    selectedCategoryId: string | null;
    isLoading: boolean;
    isTogglingCategory: boolean;
    canManage: boolean;
    onSelectCategory: (id: string | null) => void;
    onEditCategory: (category: MenuCategory) => void;
    onDeleteCategory: (category: MenuCategory) => void;
    onToggleActive: (categoryId: string, isActive: boolean) => void;
}

const LONG_PRESS_MS = 500;

function PillSkeleton() {
    return (
        <div className="flex gap-2 p-2">
            {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-8 w-20 shrink-0 rounded-full bg-secondary animate-pulse" />
            ))}
        </div>
    );
}

export function CategoryPillBar({
    categories,
    itemCounts,
    totalItemCount,
    selectedCategoryId,
    isLoading,
    isTogglingCategory,
    canManage,
    onSelectCategory,
    onEditCategory,
    onDeleteCategory,
    onToggleActive,
}: CategoryPillBarProps) {
    const { showConfirm } = useAlertModal();
    const [manageCategory, setManageCategory] = useState<MenuCategory | null>(null);
    const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const suppressClickRef = useRef(false);

    function startPress(category: MenuCategory) {
        if (!canManage) return;
        suppressClickRef.current = false;
        pressTimerRef.current = setTimeout(() => {
            suppressClickRef.current = true;
            setManageCategory(category);
        }, LONG_PRESS_MS);
    }

    function cancelPress() {
        if (pressTimerRef.current) {
            clearTimeout(pressTimerRef.current);
            pressTimerRef.current = null;
        }
    }

    function handlePillClick(id: string | null) {
        if (suppressClickRef.current) {
            suppressClickRef.current = false;
            return;
        }
        onSelectCategory(id);
    }

    async function handleDelete() {
        if (!manageCategory) return;
        const confirmed = await showConfirm(
            "All items in this category will also be deleted.",
            { title: `Delete "${manageCategory.name}"?`, confirmLabel: "Delete", destructive: true }
        );
        if (confirmed) {
            onDeleteCategory(manageCategory);
            setManageCategory(null);
        }
    }

    if (isLoading) return <PillSkeleton />;

    return (
        <>
            <nav className="flex gap-2 p-2 overflow-x-auto scrollbar-hide">
                <button
                    type="button"
                    onClick={() => handlePillClick(null)}
                    className={cn(
                        "shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-150",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        selectedCategoryId === null
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-secondary text-foreground/80 hover:text-foreground"
                    )}
                >
                    All Items ({totalItemCount})
                </button>
                {categories.map((category) => (
                    <button
                        key={category.id}
                        type="button"
                        onClick={() => handlePillClick(category.id)}
                        onPointerDown={() => startPress(category)}
                        onPointerUp={cancelPress}
                        onPointerLeave={cancelPress}
                        onContextMenu={(e) => {
                            if (canManage) e.preventDefault();
                        }}
                        className={cn(
                            "shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-150 touch-none",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                            selectedCategoryId === category.id
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "bg-secondary text-foreground/80 hover:text-foreground",
                            !category.isActive && "opacity-50"
                        )}
                    >
                        <span className="flex items-center gap-1.5">
                            {category.icon ?? <UtensilsCrossed className="w-3.5 h-3.5" />}
                            {category.name} ({itemCounts[category.id] ?? 0})
                        </span>
                    </button>
                ))}
            </nav>

            <Dialog open={manageCategory !== null} onOpenChange={(open) => !open && setManageCategory(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{manageCategory?.name}</DialogTitle>
                    </DialogHeader>

                    {manageCategory && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between px-1">
                                <span className="text-sm text-muted-foreground">Active</span>
                                {isTogglingCategory ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                ) : (
                                    <button
                                        onClick={() => onToggleActive(manageCategory.id, !manageCategory.isActive)}
                                        className={cn(
                                            "w-9 h-5 rounded-full transition-colors shrink-0 cursor-pointer",
                                            manageCategory.isActive ? "bg-emerald-500" : "bg-muted-foreground/30"
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                "w-4 h-4 rounded-full bg-white shadow transition-transform mx-0.5",
                                                manageCategory.isActive ? "translate-x-4" : "translate-x-0"
                                            )}
                                        />
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            variant="outline"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={handleDelete}
                        >
                            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                            Delete
                        </Button>
                        <Button
                            onClick={() => {
                                if (manageCategory) onEditCategory(manageCategory);
                                setManageCategory(null);
                            }}
                        >
                            <Pencil className="w-3.5 h-3.5 mr-1.5" />
                            Edit
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}