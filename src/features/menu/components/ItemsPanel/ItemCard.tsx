"use client";

import { Pencil, Trash2, Star, UtensilsCrossed } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { useAlertModal } from "@/components/providers/AlertModalProvider";
import { ItemStatusToggle } from "./ItemStatusToggle";
import type { MenuItem, MenuItemStatus } from "@/types";

interface ItemCardProps {
  item: MenuItem;
  isToggling: boolean;
  isTogglingFeatured: boolean;
  canManage: boolean;
  onToggleStatus: (itemId: string, status: MenuItemStatus) => void;
  onToggleFeatured: (itemId: string) => void;
  onEdit: (item: MenuItem) => void;
  onDelete: (item: MenuItem) => void;
}

export function ItemCard({
  item,
  isToggling,
  isTogglingFeatured,
  canManage,
  onToggleStatus,
  onToggleFeatured,
  onEdit,
  onDelete,
}: ItemCardProps) {
  const { showConfirm } = useAlertModal();

  const displayPrice = item.variants.length > 0
    ? `${formatCurrency(Math.min(...item.variants.map((v) => v.price)))}+`
    : formatCurrency(item.basePrice);

  async function handleDeleteClick() {
    const confirmed = await showConfirm(
      "This action cannot be undone.",
      {
        title: `Delete "${item.name}"?`,
        confirmLabel: "Delete",
        destructive: true,
      }
    );
    if (confirmed) onDelete(item);
  }

    return (
    <div className={cn(
      "bg-card border border-border rounded-2xl overflow-hidden flex flex-col transition-shadow hover:shadow-md",
      item.status === "unavailable" && "opacity-60"
    )}>

      {/* ── Image block ─────────────────────────────────── */}
      <div className="h-36 bg-secondary relative shrink-0">
        {item.image ? (
          <Image src={item.image} alt={item.name} fill sizes="(max-width: 768px) 50vw, 220px" className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <UtensilsCrossed className="w-7 h-7 text-muted-foreground" />
          </div>
        )}

        {canManage && (
          <div className="absolute top-2 right-2 flex items-center gap-1">
            <button
              onClick={() => onToggleFeatured(item.id)}
              disabled={isTogglingFeatured}
              title={item.isFeatured ? "Remove from featured" : "Mark as featured"}
              className={cn(
                "w-6 h-6 rounded-lg bg-card shadow-sm flex items-center justify-center transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed",
                item.isFeatured ? "text-amber-500" : "text-muted-foreground hover:text-amber-500"
              )}
            >
              <Star className="w-3.5 h-3.5" fill={item.isFeatured ? "currentColor" : "none"} />
            </button>
            <button
              onClick={() => onEdit(item)}
              className="w-6 h-6 rounded-lg bg-card shadow-sm flex items-center justify-center text-muted-foreground hover:text-primary transition-colors cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleDeleteClick}
              className="w-6 h-6 rounded-lg bg-card shadow-sm flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* ── Content ──────────────────────────────────────── */}
      <div className="p-3.5 flex flex-col gap-2.5">
        <div>
          <p className="text-sm font-semibold leading-tight mb-1 line-clamp-1">{item.name}</p>
          <span className="text-lg font-bold tabular-nums text-primary">{displayPrice}</span>
        </div>

        {item.variants.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.variants.map((v, index) => (
              <span
                key={v.id || `variant-${index}`}
                className="text-[10px] font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full"
              >
                {v.name} — {formatCurrency(v.price)}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <ItemStatusToggle
            status={item.status}
            isLoading={isToggling}
            onChange={(status) => onToggleStatus(item.id, status)}
          />
        </div>
      </div>
    </div>
  );
}