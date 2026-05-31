"use client";

import { useState } from "react";
import { Pencil, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MenuCategory } from "@/types";

interface CategoryRowProps {
  category: MenuCategory;
  itemCount: number;
  isSelected: boolean;
  isTogglingCategory: boolean;
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
  onClick,
  onEdit,
  onDelete,
  onToggleActive,
}: CategoryRowProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
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
          {category.icon ?? "🍽️"}
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
                "w-8 h-4 rounded-full transition-colors shrink-0",
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
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); setConfirmOpen(true); }}
            className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Confirm delete modal ──────────────────────────────── */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setConfirmOpen(false)}
          />
          <div className="relative z-10 w-full max-w-sm bg-white rounded-2xl shadow-xl border p-6 mx-4">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-semibold">Delete &quot;{category.name}&quot;?</p>
                <p className="text-xs text-muted-foreground mt-1">
                  All items in this category will also be deleted.
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setConfirmOpen(false)}
                className="flex-1 px-4 py-2 text-sm font-medium rounded-lg border hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { onDelete(category); setConfirmOpen(false); }}
                className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}