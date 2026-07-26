"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { usePosStore } from "@/store/usePosStore";
import { getTablesAction } from "@/features/tables/actions";
import type { Table } from "@/types";

export function TableSelector() {
  const orderType = usePosStore((s) => s.orderType);
  const tableId = usePosStore((s) => s.tableId);
  const setTable = usePosStore((s) => s.setTable);
  const clearTable = usePosStore((s) => s.clearTable);
  const [search, setSearch] = useState("");

  const { data: tables = [] } = useQuery<Table[]>({
    queryKey: ["tables", undefined],
    queryFn: async () => {
      const res = await getTablesAction(undefined);
      if (res.data === null) throw new Error(res.error);
      return res.data;
    },
    enabled: orderType === "dine_in",
  });

  if (orderType !== "dine_in") return null;

  const filtered = tables.filter(
    (t) =>
      t.isActive &&
      t.tableNumber.toLowerCase().includes(search.toLowerCase())
  );

  function handleSelect(table: Table) {
    if (tableId === table.id) {
      clearTable();
    } else {
      setTable(table.id, table.tableNumber);
    }
  }

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Select Table
      </label>
      <input
        type="text"
        placeholder="Search tables..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-3 py-1.5 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      <div className="grid grid-cols-4 gap-1.5 max-h-36 overflow-y-auto">
        {filtered.map((table) => {
          const isSelected = tableId === table.id;
          const isOccupied = table.status === "occupied" && !isSelected;

          return (
            <button
              key={table.id}
              onClick={() => handleSelect(table)}
              disabled={isOccupied}
              className={cn(
                "flex flex-col items-center justify-center py-2 px-1 rounded-md border text-xs font-medium transition-all",
                isSelected
                  ? "bg-primary text-primary-foreground border-primary"
                  : isOccupied
                  ? "bg-muted text-muted-foreground border-muted cursor-not-allowed opacity-50"
                  : "bg-background hover:bg-muted border-border"
              )}
            >
              <span className="font-semibold">{table.tableNumber}</span>
              <span className="text-[10px] opacity-70">{table.capacity}p</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}