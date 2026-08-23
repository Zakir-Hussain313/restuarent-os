"use client";

import { useMemo } from "react";
import { UtensilsCrossed, CheckCircle, AlertCircle, LayoutGrid } from "lucide-react";
import type { MenuCategory, MenuItem } from "@/types";

interface MenuStatsBarProps {
  categories: MenuCategory[];
  items: MenuItem[];
}

export function MenuStatsBar({ categories, items }: MenuStatsBarProps) {
  const stats = useMemo(() => {
    const totalItems = items.length;
    const available = items.filter((i) => i.status === "available").length;
    const outOfStock = items.filter((i) => i.status === "out_of_stock").length;
    const totalCategories = categories.filter((c) => c.isActive).length;

    return { totalItems, available, outOfStock, totalCategories };
  }, [categories, items]);

  const STAT_CONFIG = [
    { label: "Total Items",   value: String(stats.totalItems),     icon: UtensilsCrossed, color: "text-blue-600",    bg: "bg-blue-50"    },
    { label: "Available",     value: String(stats.available),      icon: CheckCircle,     color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Out of Stock",  value: String(stats.outOfStock),     icon: AlertCircle,     color: "text-red-600",     bg: "bg-red-50"     },
    { label: "Categories",    value: String(stats.totalCategories),icon: LayoutGrid,      color: "text-violet-600",  bg: "bg-violet-50"  },
  ];

  return (
    <div className="flex sm:grid sm:grid-cols-4 gap-px bg-border border-b shrink-0 overflow-x-auto scrollbar-hide">
      {STAT_CONFIG.map(({ label, value, icon: Icon, color, bg }) => (
        <div
          key={label}
          className="bg-background px-4 py-4 flex items-center gap-2.5 hover:bg-muted/40 transition-colors shrink-0 w-44 sm:w-auto"
        >
          <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
            <Icon className={`w-4 h-4 ${color}`} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground truncate">{label}</p>
            <p className="text-base font-bold tabular-nums leading-tight">{value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}