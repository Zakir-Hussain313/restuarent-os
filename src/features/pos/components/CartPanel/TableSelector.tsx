"use client";
import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { usePosStore } from "@/store/usePosStore";
import { getTablesAction, getTableSectionsAction } from "@/features/tables/actions";
import { useBranchChannel } from "@/lib/realtime/useBranchChannel";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import type { Table } from "@/types";
interface TableSelectorProps {
  branchId?: string;
}

export function TableSelector({ branchId }: TableSelectorProps) {
  const orderType = usePosStore((s) => s.orderType);
  const tableId = usePosStore((s) => s.tableId);
  const setTable = usePosStore((s) => s.setTable);
  const clearTable = usePosStore((s) => s.clearTable);
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: tables = [] } = useQuery<Table[]>({
    queryKey: ["tables", undefined],
    queryFn: async () => {
      const res = await getTablesAction(undefined);
      if (res.data === null) throw new Error(res.error);
      return res.data;
    },
    enabled: orderType === "dine_in",
  });

  const { data: sections = [] } = useQuery({
    queryKey: ["table-sections", undefined],
    queryFn: async () => {
      const res = await getTableSectionsAction(undefined);
      if (res.data === null) throw new Error(res.error);
      return res.data;
    },
    enabled: orderType === "dine_in",
  });

  const onRealtimeEvent = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["tables", undefined] });
  }, [queryClient]);

  useBranchChannel(orderType === "dine_in" ? branchId : undefined, "tables", onRealtimeEvent);

  if (orderType !== "dine_in") return null;

  const selectedTable = tables.find((t) => t.id === tableId);

  const filtered = tables.filter(
    (t) =>
      t.isActive &&
      t.tableNumber.toLowerCase().includes(search.toLowerCase())
  );

  const grouped = sections
    .map((section) => ({
      section,
      tables: filtered.filter((t) => t.sectionId === section.id),
    }))
    .filter((g) => g.tables.length > 0);

  function handleSelect(table: Table) {
    if (tableId === table.id) {
      clearTable();
    } else {
      setTable(table.id, table.tableNumber);
    }
  }

  return (
    <CollapsibleSection
      label="Table"
      summary={selectedTable ? `${selectedTable.tableNumber}` : "Not selected"}
      defaultOpen={!tableId}
    >
      <Input
        type="text"
        placeholder="Search tables..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-auto px-3 py-1.5 text-sm"
      />
      <div className="space-y-3 max-h-64 min-[760px]:max-h-48 overflow-y-auto">
        {grouped.map(({ section, tables: sectionTables }) => (
          <div key={section.id}>
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              {section.name}
            </div>
            <div className="grid grid-cols-4 gap-2 min-[760px]:gap-1.5">
              {sectionTables.map((table) => {
                const isSelected = tableId === table.id;
                const isUnavailable =
                  (table.status === "occupied" ||
                    table.status === "reserved" ||
                    table.status === "out_of_service") &&
                  !isSelected;

                const statusStyles = isSelected
                  ? "bg-primary text-primary-foreground border-primary"
                  : table.status === "occupied"
                  ? "bg-red-50 text-red-700 border-red-200 cursor-not-allowed opacity-70"
                  : table.status === "reserved"
                  ? "bg-amber-50 text-amber-700 border-amber-200 cursor-not-allowed opacity-70"
                  : table.status === "out_of_service"
                  ? "bg-muted text-muted-foreground border-muted cursor-not-allowed opacity-50"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100";

                return (
                  <button
                    key={table.id}
                    onClick={() => handleSelect(table)}
                    disabled={isUnavailable}
                    title={
                      isUnavailable
                        ? `Table ${table.tableNumber} is ${table.status.replace("_", " ")}`
                        : undefined
                    }
                    className={cn(
                      "flex flex-col items-center justify-center min-h-14 min-[760px]:min-h-0 min-[760px]:py-2 px-1 rounded-md border text-sm min-[760px]:text-xs font-medium transition-all",
                      statusStyles
                    )}
                  >
                    <span className="font-semibold">{table.tableNumber}</span>
                    <span className="text-[10px] opacity-70">{table.capacity}p</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </CollapsibleSection>
  );
}