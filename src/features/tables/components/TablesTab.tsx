"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { TableFloorPlan } from "@/features/tables/components/TableFloorPlan";
import { TableSectionDialog } from "@/features/tables/components/TableSectionDialog";
import { TableDialog } from "@/features/tables/components/TableDialog";
import type { Table } from "@/types/table";
import type { TableSection } from "@/db/schema";

interface TablesTabProps {
    tables: Table[];
    sections: TableSection[];
    branchId?: string;
    canManageCrud: boolean;
}

export function TablesTab({ tables, sections, branchId, canManageCrud }: TablesTabProps) {
    const [selectedTable, setSelectedTable] = useState<Table | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);

    function openForCreate() {
        setSelectedTable(null);
        setDialogOpen(true);
    }

    function openForEdit(table: Table) {
        setSelectedTable(table);
        setDialogOpen(true);
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-xs text-[#8a8680]">Tap a table to change its status{canManageCrud ? " or edit it" : ""}.</p>
                {canManageCrud && (
                    <div className="flex items-center gap-2">
                        <TableSectionDialog branchId={branchId} />
                        <Button size="sm" onClick={openForCreate} className="bg-[#e8570e] hover:bg-[#d44f0c] text-white">
                            <Plus className="w-4 h-4 mr-1.5" />
                            Add Table
                        </Button>
                    </div>
                )}
            </div>

            {sections.length === 0 && canManageCrud && (
                <p className="text-sm text-[#8a8680] py-8 text-center">
                    Add a section first (e.g. &quot;Main Hall&quot;), then you can add tables to it.
                </p>
            )}

            {sections.length > 0 && (
                <TableFloorPlan
                    tables={tables}
                    onTableClick={openForEdit}
                    isClickable={() => true}
                />
            )}

            <TableDialog
                key={selectedTable?.id ?? "create"}
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                table={selectedTable}
                sections={sections}
                branchId={branchId}
                canManageCrud={canManageCrud}
            />
        </div>
    );
}