"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowRight, Clock, UtensilsCrossed, ShoppingBag, Bike } from "lucide-react";
import { OrderStatusBadge } from "@/components/data-display/OrderStatusBadge";
import { useRecentOrders } from "../hooks/useDashboardData";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";
import type { OrderType } from "@/types";

function useIsMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

const ORDER_TYPE_META: Record<OrderType, { label: string; icon: React.ElementType; className: string }> = {
  dine_in:  { label: "Dine-in",  icon: UtensilsCrossed, className: "bg-orange-50 text-[#e8570e]"    },
  takeaway: { label: "Takeaway", icon: ShoppingBag,     className: "bg-blue-50 text-blue-600"       },
  delivery: { label: "Delivery", icon: Bike,            className: "bg-emerald-50 text-emerald-600" },
};

function OrderTypePill({ type }: { type: OrderType }) {
  const meta = ORDER_TYPE_META[type];
  if (!meta) return null;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${meta.className}`}>
      <Icon className="w-2.5 h-2.5" />
      {meta.label}
    </span>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5">
      <div className="flex flex-col gap-2 flex-1">
        <div className="flex items-center gap-2">
          <div className="h-4 w-14 rounded bg-[#f0ede8] animate-pulse" />
          <div className="h-4 w-16 rounded-full bg-[#f0ede8] animate-pulse" />
        </div>
        <div className="h-3 w-32 rounded bg-[#f0ede8] animate-pulse" />
      </div>
      <div className="flex flex-col items-end gap-2 shrink-0">
        <div className="h-4 w-16 rounded bg-[#f0ede8] animate-pulse" />
        <div className="h-4 w-14 rounded bg-[#f0ede8] animate-pulse" />
      </div>
    </div>
  );
}

export function RecentOrdersWidget() {
  const { data: orders, isLoading } = useRecentOrders();
  const mounted = useIsMounted();

  return (
    <div className="bg-white rounded-xl border border-[#ebe9e4] flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#ebe9e4] shrink-0">
        <div>
          <h3 className="text-sm font-semibold text-[#1a1815]">Recent Orders</h3>
          <p className="text-xs text-[#8a8680] mt-0.5">Latest activity</p>
        </div>
        <Link
          href="/orders"
          className="flex items-center gap-1 text-xs font-medium text-[#e8570e] hover:text-[#c44a0c] transition-colors"
        >
          View all
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-[#f4f2ef]">
        {!mounted || isLoading
          ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
          : orders?.map((order) => (
              <div
                key={order.id}
                className="flex items-center gap-3 px-5 py-3.5 hover:bg-[#faf9f7] transition-colors"
              >
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[#1a1815] shrink-0">
                      #{order.orderNumber}
                    </span>
                    <OrderTypePill type={order.orderType} />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#8a8680]">
                    <span>{order.items.length} item{order.items.length !== 1 ? "s" : ""}</span>
                    {order.tableNumber && (
                      <>
                        <span className="text-[#d4d0ca]">·</span>
                        <span>Table {order.tableNumber}</span>
                      </>
                    )}
                    <span className="text-[#d4d0ca]">·</span>
                    <Clock className="w-3 h-3 shrink-0" />
                    <span>{formatRelativeTime(order.createdAt)}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-sm font-semibold text-[#1a1815]">
                    {formatCurrency(order.total)}
                  </span>
                  <OrderStatusBadge status={order.status} />
                </div>
              </div>
            ))}
      </div>
    </div>
  );
}