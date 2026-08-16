"use client";

import { Pencil, Ban, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { RESTAURANT_CONFIG } from "@/config/restaurant";
import type { Coupon } from "@/db/schema/orders";

interface CouponRowProps {
  coupon: Coupon;
  branchNameMap: Map<string, string>;
  canManage: boolean;
  onEdit: () => void;
  onDeactivate: () => void;
  onDelete: () => void;
}

export function CouponRow({ coupon, branchNameMap, canManage, onEdit, onDeactivate, onDelete }: CouponRowProps) {
  const isUnused = coupon.usesCount === 0;
  const discountLabel =
    coupon.discountType === "percentage"
      ? `${coupon.discountValue}% off`
      : `${RESTAURANT_CONFIG.currencySymbol} ${coupon.discountValue} off`;

  const branchLabel =
    coupon.branchIds === null
      ? "All branches"
      : coupon.branchIds.length === 1
        ? branchNameMap.get(coupon.branchIds[0]) ?? "1 branch"
        : `${coupon.branchIds.length} branches`;

  const usageLabel = `${coupon.usesCount}/${coupon.maxUses ?? "∞"} used`;

  return (
    <div className="flex items-center justify-between px-4 py-3 border rounded-lg bg-background">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{coupon.name}</p>
          <span
            className={cn(
              "text-xs px-1.5 py-0.5 rounded-full shrink-0",
              coupon.isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            )}
          >
            {coupon.isActive ? "Active" : "Inactive"}
          </span>
        </div>
        {coupon.description && (
          <p className="text-xs text-muted-foreground truncate">{coupon.description}</p>
        )}
        <p className="text-xs text-muted-foreground mt-0.5">
          {discountLabel} · {branchLabel} · {usageLabel}
        </p>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => {
            if (!canManage) return;
            onEdit();
          }}
          disabled={!canManage}
          className={cn(
            "p-1.5 rounded-lg transition-colors",
            canManage
              ? "hover:bg-muted text-muted-foreground hover:text-foreground"
              : "text-muted-foreground/40 cursor-not-allowed"
          )}
          aria-label="Edit coupon"
          title={
            canManage
              ? undefined
              : "Only the branch that owns this coupon (or a super admin) can edit it"
          }
        >
          <Pencil className="w-4 h-4" />
        </button>
        {isUnused ? (
          <button
            onClick={() => {
              if (!canManage) return;
              if (confirm(`Permanently delete "${coupon.name}"? It has never been used, so this can't be undone.`)) {
                onDelete();
              }
            }}
            disabled={!canManage}
            className={cn(
              "p-1.5 rounded-lg transition-colors",
              canManage
                ? "hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                : "text-muted-foreground/40 cursor-not-allowed"
            )}
            aria-label="Delete coupon"
            title={
              canManage
                ? "Never used — safe to delete permanently"
                : "Only the branch that owns this coupon (or a super admin) can delete it"
            }
          >
            <Trash2 className="w-4 h-4" />
          </button>
        ) : (
          coupon.isActive && (
            <button
              onClick={() => {
                if (!canManage) return;
                if (confirm(`Deactivate "${coupon.name}"? Staff will no longer be able to apply it.`)) {
                  onDeactivate();
                }
              }}
              disabled={!canManage}
              className={cn(
                "p-1.5 rounded-lg transition-colors",
                canManage
                  ? "hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                  : "text-muted-foreground/40 cursor-not-allowed"
              )}
              aria-label="Deactivate coupon"
              title={
                canManage
                  ? undefined
                  : "Only the branch that owns this coupon (or a super admin) can deactivate it"
              }
            >
              <Ban className="w-4 h-4" />
            </button>
          )
        )}
      </div>
    </div>
  );
}