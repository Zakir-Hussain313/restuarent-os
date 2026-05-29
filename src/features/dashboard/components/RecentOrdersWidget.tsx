"use client";

import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { OrderStatusBadge } from "@/components/data-display/OrderStatusBadge";
import { TableRowSkeleton } from "@/components/data-display/LoadingSkeleton";
import { useRecentOrders } from "../hooks/useDashboardData";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";

export function RecentOrdersWidget() {
  const { data: orders, isLoading } = useRecentOrders();

  return (
    <div className="bg-white rounded-xl border border-[#ebe9e4] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#ebe9e4]">
        <div>
          <h3 className="text-sm font-semibold text-[#1a1815]">Recent Orders</h3>
          <p className="text-xs text-[#8a8680] mt-0.5">Latest activity across all tables</p>
        </div>
        <Link
          href="/orders"
          className="flex items-center gap-1 text-xs font-medium text-[#e8570e] hover:text-[#c44a0c] transition-colors"
        >
          View all
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#ebe9e4]">
              {["Order", "Items", "Table", "Amount", "Status", "Time"].map((h) => (
                <th
                  key={h}
                  className="text-left text-xs font-medium text-[#8a8680] px-5 py-3"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} columns={6} />)
              : orders?.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-[#f4f2ef] last:border-0 hover:bg-[#faf9f7] transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <span className="text-sm font-medium text-[#1a1815]">
                        #{order.orderNumber}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-[#4a4845]">
                        {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-[#4a4845]">
                        {order.tableId ? `T-${order.tableId.slice(-2)}` : "Takeaway"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm font-medium text-[#1a1815]">
                        {formatCurrency(order.total)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1 text-xs text-[#8a8680]">
                        <Clock className="w-3 h-3" />
                        {formatRelativeTime(order.createdAt)}
                      </div>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}