"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { TableFloorPlan } from "@/features/tables/components/TableFloorPlan";
import { TableSectionDialog } from "@/features/tables/components/TableSectionDialog";
import { TableDialog } from "@/features/tables/components/TableDialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { updateTableAction, deleteTableSectionAction, updateTableChairLayoutAction } from "@/features/tables/actions";
import { getNextPlacement } from "@/features/tables/components/TableFloorPlan";
import { useAlertModal } from "@/components/providers/AlertModalProvider";
import { useRouter } from "next/navigation";
import type { Table, ChairSeat } from "@/types/table";
import type { TableSection } from "@/db/schema";

interface TablesTabProps {
    tables: Table[];
    sections: TableSection[];
    branchId?: string;
    canManageCrud: boolean;
}

export function TablesTab({ tables, sections, branchId, canManageCrud }: TablesTabProps) {
    const router = useRouter();
    const { showConfirm, showAlert } = useAlertModal();
    const [selectedTable, setSelectedTable] = useState<Table | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [requestedSectionId, setRequestedSectionId] = useState<string | null>(null);
    const [editSectionOpen, setEditSectionOpen] = useState(false);

    const [editingSeats, setEditingSeats] = useState(false);
    const [pendingSeats, setPendingSeats] = useState<Record<string, ChairSeat[] | null>>({});
    const [savingSeats, setSavingSeats] = useState(false);
    const [resetToken, setResetToken] = useState(0);

    const activeSectionId =
        requestedSectionId && sections.some((s) => s.id === requestedSectionId)
            ? requestedSectionId
            : sections[0]?.id ?? null;

    const activeSection = sections.find((s) => s.id === activeSectionId) ?? null;
    const sectionTables = activeSectionId ? tables.filter((t) => t.sectionId === activeSectionId) : [];
    const unplacedTables = sectionTables.filter((t) => t.positionX == null || t.positionY == null);
    const placedCount = sectionTables.length - unplacedTables.length;

    async function handlePositionChange(tableId: string, positionX: number, positionY: number) {
        const result = await updateTableAction(tableId, { positionX, positionY });
        if (!result.error) {
            router.refresh();
        }
    }

    async function handleAutoArrange() {
        for (let i = 0; i < unplacedTables.length; i++) {
            const { positionX, positionY } = getNextPlacement(placedCount + i);
            await updateTableAction(unplacedTables[i].id, { positionX, positionY });
        }
        router.refresh();
    }

    function handleSeatsChange(tableId: string, layout: ChairSeat[]) {
        setPendingSeats((prev) => ({ ...prev, [tableId]: layout }));
    }

    function handleResetSeats() {
        const resets: Record<string, null> = {};
        sectionTables.forEach((t) => {
            resets[t.id] = null;
        });
        setPendingSeats((prev) => ({ ...prev, ...resets }));
        setResetToken((n) => n + 1);
    }

    async function handleSaveSeats() {
        setSavingSeats(true);
        for (const [tableId, layout] of Object.entries(pendingSeats)) {
            await updateTableChairLayoutAction(tableId, layout);
        }
        setSavingSeats(false);
        setPendingSeats({});
        setEditingSeats(false);
        router.refresh();
    }

    function handleCancelSeats() {
        setPendingSeats({});
        setEditingSeats(false);
    }

    function openForCreate() {
        setSelectedTable(null);
        setDialogOpen(true);
    }

    function openForEdit(table: Table) {
        setSelectedTable(table);
        setDialogOpen(true);
    }

    async function handleDeleteSection() {
        if (!activeSection) return;
        const confirmed = await showConfirm(
            `Delete the "${activeSection.name}" section? This can't be undone.`,
            { title: "Delete section", confirmLabel: "Delete", destructive: true }
        );
        if (!confirmed) return;

        const result = await deleteTableSectionAction(activeSection.id);
        if (result.error) {
            showAlert(result.error, "Couldn't delete");
            return;
        }
        setRequestedSectionId(null);
        router.refresh();
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-xs text-muted-foreground">
                    {editingSeats
                        ? "Drag chairs to reposition them, then save."
                        : `Tap a table to change its status${canManageCrud ? " or edit it" : ""}.`}
                </p>
                {canManageCrud && !editingSeats && (
                    <div className="flex items-center gap-2">
                        <TableSectionDialog branchId={branchId} onCreated={setRequestedSectionId} />
                        <Button size="sm" onClick={openForCreate} disabled={!activeSectionId}>
                            <Plus className="w-4 h-4 mr-1.5" />
                            Add Table
                        </Button>
                    </div>
                )}
            </div>

            {sections.length === 0 && canManageCrud && (
                <p className="text-sm text-muted-foreground py-8 text-center">
                    Add a section first (e.g. &quot;Main Hall&quot;), then you can add tables to it.
                </p>
            )}

            {sections.length > 0 && (
                <>
                    <div className="flex items-center gap-1 border-b overflow-x-auto flex-nowrap scrollbar-hide">
                        {sections.map((s) => (
                            <button
                                key={s.id}
                                type="button"
                                onClick={() => setRequestedSectionId(s.id)}
                                disabled={editingSeats}
                                className={cn(
                                    "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors shrink-0 whitespace-nowrap",
                                    activeSectionId === s.id
                                        ? "border-primary text-primary"
                                        : "border-transparent text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {s.name}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-start justify-between flex-wrap gap-2 -mt-2">
                        {activeSection?.description ? (
                            <p className="text-xs text-muted-foreground">{activeSection.description}</p>
                        ) : (
                            <span />
                        )}
                        <div className="flex items-center gap-2 flex-wrap">
                            {canManageCrud && !editingSeats && unplacedTables.length > 0 && (
                                <Button variant="outline" size="sm" onClick={handleAutoArrange}>
                                    Place {unplacedTables.length} on floor
                                </Button>
                            )}
                            {canManageCrud && !editingSeats && (
                                <Button variant="outline" size="sm" onClick={() => setEditingSeats(true)}>
                                    Edit Seating
                                </Button>
                            )}
                            {canManageCrud && editingSeats && (
                                <>
                                    <Button variant="outline" size="sm" onClick={handleResetSeats} disabled={savingSeats}>
                                        Reset to Default
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={handleCancelSeats} disabled={savingSeats}>
                                        Cancel
                                    </Button>
                                    <Button size="sm" onClick={handleSaveSeats} disabled={savingSeats}>
                                        {savingSeats ? "Saving..." : "Save Seating"}
                                    </Button>
                                </>
                            )}
                            {canManageCrud && !editingSeats && activeSection && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger
                                        render={
                                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground">
                                                <MoreVertical className="w-4 h-4" />
                                            </Button>
                                        }
                                    />
                                    <DropdownMenuContent>
                                        <DropdownMenuItem onClick={() => setEditSectionOpen(true)}>
                                            <Pencil className="w-3.5 h-3.5" />
                                            Edit section
                                        </DropdownMenuItem>
                                        <DropdownMenuItem variant="destructive" onClick={handleDeleteSection}>
                                            <Trash2 className="w-3.5 h-3.5" />
                                            Delete section
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>
                    </div>

                    {activeSection && (
                        <TableSectionDialog
                            key={activeSection.id}
                            branchId={branchId}
                            section={activeSection}
                            open={editSectionOpen}
                            onOpenChange={setEditSectionOpen}
                        />
                    )}

                    <TableFloorPlan
                        tables={sectionTables}
                        onTableClick={editingSeats ? undefined : openForEdit}
                        isClickable={() => !editingSeats}
                        draggable={canManageCrud}
                        onPositionChange={handlePositionChange}
                        seatsEditable={editingSeats}
                        onSeatsChange={handleSeatsChange}
                        resetSignal={resetToken}
                    />
                </>
            )}

            <TableDialog
                key={selectedTable?.id ?? "create"}
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                table={selectedTable}
                sections={sections}
                branchId={branchId}
                defaultSectionId={activeSectionId ?? undefined}
                sectionTables={sectionTables}
                canManageCrud={canManageCrud}
            />
        </div>
    );
}