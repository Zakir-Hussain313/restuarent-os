"use client";

import { useState } from "react";
import { Pencil, Trash2, AlertTriangle, Star, UtensilsCrossed } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
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
  const [confirmOpen, setConfirmOpen] = useState(false);

  const displayPrice = item.variants.length > 0
    ? `${formatCurrency(Math.min(...item.variants.map((v) => v.price)))}+`
    : formatCurrency(item.basePrice);

  return (
    <>
      <div className={cn(
        "bg-white border rounded-xl p-4 flex flex-col gap-3 transition-shadow hover:shadow-md",
        item.status === "unavailable" && "opacity-60"
      )}>

        {/* ── Top row: image + name + actions ─────────────── */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted border shrink-0 relative">
              {item.image ? (
                <Image src={item.image} alt={item.name} fill sizes="40px" className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <UtensilsCrossed className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
            </div>
            <p className="text-sm font-semibold leading-tight flex-1 min-w-0 pt-1">{item.name}</p>
          </div>

          {canManage && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => onToggleFeatured(item.id)}
                disabled={isTogglingFeatured}
                title={item.isFeatured ? "Remove from featured" : "Mark as featured"}
                className={cn(
                  "p-1.5 rounded-lg hover:bg-amber-50 transition-colors disabled:opacity-50",
                  item.isFeatured ? "text-amber-500" : "text-muted-foreground hover:text-amber-500"
                )}
              >
                <Star className="w-3.5 h-3.5" fill={item.isFeatured ? "currentColor" : "none"} />
              </button>
              <button
                onClick={() => onEdit(item)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setConfirmOpen(true)}
                className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* ── Price ───────────────────────────────────────── */}
        <span className="text-lg font-bold tabular-nums text-primary">{displayPrice}</span>

        {/* ── Variants preview ─────────────────────────────── */}
        {item.variants.map((v, index) => (
          <span
            key={v.id || `variant-${index}`}
            className="text-[10px] font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full"
          >
            {v.name} — {formatCurrency(v.price)}
          </span>
        ))}

        {/* ── Bottom: status toggle ────────────────────────── */}
        <div className="flex items-center justify-between pt-1 border-t border-border">
          <ItemStatusToggle
            status={item.status}
            isLoading={isToggling}
            onChange={(status) => onToggleStatus(item.id, status)}
          />
        </div>
      </div>

      {/* ── Confirm delete modal ─────────────────────────────── */}
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
                <p className="text-sm font-semibold">Delete &quot;{item.name}&quot;?</p>
                <p className="text-xs text-muted-foreground mt-1">
                  This action cannot be undone.
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
                onClick={() => { onDelete(item); setConfirmOpen(false); }}
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