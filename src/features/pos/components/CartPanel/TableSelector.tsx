"use client";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { usePosStore } from "@/store/usePosStore";
import { getTablesAction, getTableSectionsAction } from "@/features/tables/actions";
import { useBranchChannel } from "@/lib/realtime/useBranchChannel";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import type { Table } from "@/types";
import type { PosInitBundle } from "@/features/pos/actions";

interface TableSelectorProps {
  branchId?: string;
  posInit?: PosInitBundle;
}

export function TableSelector({ branchId, posInit }: TableSelectorProps) {
  const orderType = usePosStore((s) => s.orderType);
  const tableId = usePosStore((s) => s.tableId);
  const setTable = usePosStore((s) => s.setTable);
  const clearTable = usePosStore((s) => s.clearTable);
  const [search, setSearch] = useState("");

  const [tables, setTables] = useState<Table[]>(posInit?.tables ?? []);
  const [sections, setSections] = useState(posInit?.sections ?? []);

  // Seed local state from the POS init bundle when it changes (first load,
  // or a branch switch) — render-time adjustment, not an effect.
  const [seededFrom, setSeededFrom] = useState<PosInitBundle | undefined>(undefined);
  if (posInit && posInit !== seededFrom) {
    setSeededFrom(posInit);
    setTables(posInit.tables);
    setSections(posInit.sections);
  }

  const refetchTables = useCallback(async () => {
    const res = await getTablesAction(undefined);
    if (res.data !== null) setTables(res.data);
  }, []);

  // On mount without a seeded bundle yet (e.g. dine-in selected before
  // posInit resolves), fall back to a direct fetch once.
  useEffect(() => {
    if (orderType !== "dine_in" || posInit) return;
    let cancelled = false;
    (async () => {
      const [tablesRes, sectionsRes] = await Promise.all([
        getTablesAction(undefined),
        getTableSectionsAction(undefined),
      ]);
      if (cancelled) return;
      if (tablesRes.data !== null) setTables(tablesRes.data);
      if (sectionsRes.data !== null) setSections(sectionsRes.data);
    })();
    return () => {
      cancelled = true;
    };
  }, [orderType, posInit]);

  const onRealtimeEvent = useCallback(() => {
    refetchTables();
  }, [refetchTables]);

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