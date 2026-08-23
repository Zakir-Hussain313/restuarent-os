"use client";

import { flexRender } from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronUp, ChevronDown, ChevronsUpDown, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Order } from "@/types";
import { useOrderHistoryTable } from "./useOrderHistoryTable";

interface OrderHistoryTableProps {
  orders: Order[];
  isLoading: boolean;
  selectedOrderId: string | null;
  onSelectOrder: (orderId: string) => void;
}

export function OrderHistoryTable({
  orders,
  isLoading,
  selectedOrderId,
  onSelectOrder,
}: OrderHistoryTableProps) {
  const table = useOrderHistoryTable(orders);

  if (isLoading) {
    return <OrderHistoryTableSkeleton />;
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
        <Inbox className="w-10 h-10 opacity-30" />
        <p className="text-sm">No orders found</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-x-auto">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent">
              {headerGroup.headers.map((header) => {
                const canSort = header.column.getCanSort();
                const sorted = header.column.getIsSorted();
                return (
                  <TableHead
                    key={header.id}
                    onClick={
                      canSort
                        ? header.column.getToggleSortingHandler()
                        : undefined
                    }
                    className={cn(
                      "text-xs font-medium select-none whitespace-nowrap",
                      canSort && "cursor-pointer hover:text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {canSort && (
                        <span className="text-muted-foreground/50">
                          {sorted === "asc" ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : sorted === "desc" ? (
                            <ChevronDown className="w-3 h-3" />
                          ) : (
                            <ChevronsUpDown className="w-3 h-3" />
                          )}
                        </span>
                      )}
                    </div>
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>

        <TableBody>
          {table.getRowModel().rows.map((row) => {
            const isSelected = row.original.id === selectedOrderId;
            return (
              <TableRow
                key={row.id}
                onClick={() => onSelectOrder(row.original.id)}
                className={cn(
                  "cursor-pointer transition-colors",
                  isSelected && "bg-muted/60"
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="py-3">
                    {flexRender(
                      cell.column.columnDef.cell,
                      cell.getContext()
                    )}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function OrderHistoryTableSkeleton() {
  return (
    <div className="rounded-lg border overflow-hidden animate-pulse">
      <div className="h-10 bg-muted/40 border-b" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4 py-3 border-b last:border-0"
        >
          <div className="h-3 w-20 bg-muted rounded" />
          <div className="h-3 w-28 bg-muted rounded" />
          <div className="h-3 w-16 bg-muted rounded" />
          <div className="h-3 w-32 bg-muted rounded" />
          <div className="h-3 w-20 bg-muted rounded" />
          <div className="h-3 w-16 bg-muted rounded" />
          <div className="h-5 w-20 bg-muted rounded-full" />
          <div className="h-3 w-24 bg-muted rounded" />
        </div>
      ))}
    </div>
  );
}