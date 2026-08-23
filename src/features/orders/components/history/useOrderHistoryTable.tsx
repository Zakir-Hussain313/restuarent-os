"use no memo";

import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table";
import { useState } from "react";
import { OrderStatusBadge } from "../OrderDetail/OrderStatusBadge";
import { cn, formatCurrency } from "@/lib/utils";
import { RESTAURANT_CONFIG } from "@/config/restaurant";
import type { Order } from "@/types";

const columnHelper = createColumnHelper<Order>();

const ORDER_TYPE_LABEL: Record<string, string> = {
  dine_in: "Dine In",
  takeaway: "Takeaway",
  delivery: "Delivery",
};

const PAYMENT_STATUS_STYLES: Record<string, string> = {
  paid: "text-emerald-600 bg-emerald-500/10",
  unpaid: "text-destructive bg-destructive/10",
  partial: "text-amber-600 bg-amber-50",
  refunded: "text-muted-foreground bg-muted",
};

function getRelativeTime(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString(RESTAURANT_CONFIG.locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const columns = [
  columnHelper.accessor("orderNumber", {
    header: "Order",
    cell: (info) => {
      const order = info.row.original;
      return (
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-xs font-medium text-foreground">
            {info.getValue()}
          </span>
          {order.wasOfflineOrder && order.offlineRef && (
            <span
              title={`Placed offline — ${order.offlineRef}`}
              className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap"
            >
              Offline
            </span>
          )}
        </div>
      );
    },
  }),
  columnHelper.accessor("orderType", {
    header: "Type",
    cell: (info) => (
      <span className="text-xs text-muted-foreground">
        {ORDER_TYPE_LABEL[info.getValue()]}
      </span>
    ),
  }),
  columnHelper.accessor("items", {
    header: "Items",
    enableSorting: false,
    cell: (info) => {
      const items = info.getValue();
      const active = items.filter((i) => i.status !== "cancelled");
      const label =
        active.length === 1
          ? active[0].menuItemName
          : `${active[0]?.menuItemName ?? "—"} +${active.length - 1}`;
      return (
        <span className="text-xs text-muted-foreground truncate max-w-40 block">
          {label}
        </span>
      );
    },
  }),
  columnHelper.accessor("total", {
    header: "Total",
    cell: (info) => (
      <span className="text-sm font-medium">
        {formatCurrency(info.getValue())}
      </span>
    ),
  }),
  columnHelper.accessor("paymentStatus", {
    header: "Payment",
    cell: (info) => {
      const val = info.getValue();
      return (
        <span
          className={cn(
            "text-[10px] font-medium px-2 py-0.5 rounded-full capitalize",
            PAYMENT_STATUS_STYLES[val] ?? "bg-muted text-muted-foreground"
          )}
        >
          {val}
        </span>
      );
    },
  }),
  columnHelper.accessor("status", {
    header: "Status",
    cell: (info) => <OrderStatusBadge status={info.getValue()} />,
  }),
  columnHelper.accessor("createdAt", {
    header: "Date",
    cell: (info) => (
      <div className="text-xs">
        <p className="text-foreground">{formatDate(info.getValue())}</p>
        <p className="text-muted-foreground">
          {getRelativeTime(info.getValue())}
        </p>
      </div>
    ),
  }),
];

export function useOrderHistoryTable(data: Order[]) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);

  return useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });
}