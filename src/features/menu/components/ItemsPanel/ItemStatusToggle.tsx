"use client";

import { cn } from "@/lib/utils";
import type { MenuItemStatus } from "@/types";

interface ItemStatusToggleProps {
  status: MenuItemStatus;
  isLoading?: boolean;
  onChange: (status: MenuItemStatus) => void;
}

const STATUS_OPTIONS: { value: MenuItemStatus; label: string }[] = [
  { value: "available",    label: "Available"    },
  { value: "out_of_stock", label: "Out of Stock" },
  { value: "unavailable",  label: "Unavailable"  },
];

const STATUS_STYLES: Record<MenuItemStatus, string> = {
  available:    "bg-emerald-500 text-white",
  out_of_stock: "bg-amber-500 text-white",
  unavailable:  "bg-muted text-muted-foreground",
};

export function ItemStatusToggle({ status, isLoading, onChange }: ItemStatusToggleProps) {
  return (
    <div className="flex items-center rounded-lg border overflow-hidden w-fit">
      {STATUS_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          disabled={isLoading}
          onClick={() => onChange(opt.value)}
          className={cn(
            "px-2.5 py-1 text-[11px] font-medium transition-colors whitespace-nowrap",
            status === opt.value
              ? STATUS_STYLES[opt.value]
              : "bg-background text-muted-foreground hover:bg-muted disabled:opacity-50"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}