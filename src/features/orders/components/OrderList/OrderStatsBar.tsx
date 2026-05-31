"use client";

import { useMemo } from "react";
import { ShoppingBag, DollarSign, UtensilsCrossed, ShoppingBag as TakeawayIcon, Bike, Package } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { Order } from "@/types";

interface OrderStatsBarProps {
  orders: Order[];
}

export function OrderStatsBar({ orders }: OrderStatsBarProps) {
  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const revenue = orders.reduce((sum, o) => sum + o.total, 0);
    const dineIn = orders.filter((o) => o.orderType === "dine_in").length;
    const takeaway = orders.filter((o) => o.orderType === "takeaway").length;
    const delivery = orders.filter((o) => o.orderType === "delivery").length;
    const totalItems = orders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0), 0);

    return { totalOrders, revenue, dineIn, takeaway, delivery, totalItems };
  }, [orders]);

  const STAT_CONFIG = [
    { label: "Total Orders",  value: String(stats.totalOrders),        icon: ShoppingBag,    color: "text-blue-600",    bg: "bg-blue-50"    },
    { label: "Revenue",       value: formatCurrency(stats.revenue),    icon: DollarSign,     color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Dine In",       value: String(stats.dineIn),             icon: UtensilsCrossed,color: "text-violet-600",  bg: "bg-violet-50"  },
    { label: "Takeaway",      value: String(stats.takeaway),           icon: TakeawayIcon,   color: "text-orange-600",  bg: "bg-orange-50"  },
    { label: "Delivery",      value: String(stats.delivery),           icon: Bike,           color: "text-pink-600",    bg: "bg-pink-50"    },
    { label: "Items Sold",    value: String(stats.totalItems),         icon: Package,        color: "text-amber-600",   bg: "bg-amber-50"   },
  ];

  return (
    <div className="grid grid-cols-6 gap-px bg-border border-b shrink-0">
      {STAT_CONFIG.map(({ label, value, icon: Icon, color, bg }) => (
        <div
          key={label}
          className="bg-background px-4 py-4 flex items-center gap-2.5 hover:bg-muted/40 transition-colors"
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