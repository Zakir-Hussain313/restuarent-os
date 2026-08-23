"use client";

import { Pencil, Trash2, Loader2, UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAlertModal } from "@/components/providers/AlertModalProvider";
import type { MenuCategory } from "@/types";

interface CategoryRowProps {
  category: MenuCategory;
  itemCount: number;
  isSelected: boolean;
  isTogglingCategory: boolean;
  canManage: boolean;
  onClick: () => void;
  onEdit: (category: MenuCategory) => void;
  onDelete: (category: MenuCategory) => void;
  onToggleActive: (categoryId: string, isActive: boolean) => void;
}

export function CategoryRow({
  category,
  itemCount,
  isSelected,
  isTogglingCategory,
  canManage,
  onClick,
  onEdit,
  onDelete,
  onToggleActive,
}: CategoryRowProps) {
  const { showConfirm } = useAlertModal();

  async function handleDeleteClick(e: React.MouseEvent) {
    e.stopPropagation();
    const confirmed = await showConfirm(
      "All items in this category will also be deleted.",
      {
        title: `Delete "${category.name}"?`,
        confirmLabel: "Delete",
        destructive: true,
      }
    );
    if (confirmed) onDelete(category);
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        "group flex items-center gap-3 px-3 py-3 cursor-pointer transition-colors border-b border-border w-full",
        isSelected
          ? "bg-primary/5 border-l-2 border-l-primary"
          : "hover:bg-muted/50 border-l-2 border-l-transparent"
      )}
    >
      {/* Icon */}
      <div className="shrink-0 w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-lg">
        {category.icon ?? <UtensilsCrossed className="w-4 h-4" />}
      </div>

      {/* Name + count */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm font-medium truncate",
          !category.isActive && "text-muted-foreground line-through"
        )}>
          {category.name}
        </p>
        <p className="text-xs text-muted-foreground">{itemCount} items</p>
      </div>

      {/* Actions */}
      {canManage && (
        <div className={cn(
          "flex items-center gap-1 shrink-0 transition-opacity",
          isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}>
          {isTogglingCategory ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleActive(category.id, !category.isActive); }}
              className={cn(
                "w-8 h-4 rounded-full transition-colors shrink-0 cursor-pointer",
                category.isActive ? "bg-emerald-500" : "bg-muted-foreground/30"
              )}
            >
              <div className={cn(
                "w-3 h-3 rounded-full bg-white shadow transition-transform mx-0.5",
                category.isActive ? "translate-x-4" : "translate-x-0"
              )} />
            </button>
          )}

          <button
            onClick={(e) => { e.stopPropagation(); onEdit(category); }}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleDeleteClick}
            className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}