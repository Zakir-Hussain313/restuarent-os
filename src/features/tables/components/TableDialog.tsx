"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    createTableAction,
    updateTableAction,
    deleteTableAction,
    updateTableStatusAction,
} from "@/features/tables/actions";
import type { Table, TableShape, TableStatus } from "@/types/table";
import type { TableSection } from "@/db/schema";

const STATUS_OPTIONS: { value: TableStatus; label: string }[] = [
    { value: "available", label: "Available" },
    { value: "occupied", label: "Occupied" },
    { value: "reserved", label: "Reserved" },
    { value: "out_of_service", label: "Out of service" },
];

const SHAPE_OPTIONS: { value: TableShape; label: string }[] = [
    { value: "square", label: "Square" },
    { value: "rectangle", label: "Rectangle" },
    { value: "circle", label: "Circle" },
    { value: "oval", label: "Oval" },
];

interface TableDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** null = create mode. */
    table: Table | null;
    sections: TableSection[];
    branchId?: string;
    /** ADMIN/SUPER_ADMIN see the full form + delete. STAFF only sees status. */
    canManageCrud: boolean;
}

export function TableDialog({ open, onOpenChange, table, sections, branchId, canManageCrud }: TableDialogProps) {
    const router = useRouter();
    const isEditMode = !!table;

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<TableStatus>(table?.status ?? "available");
    const [sectionId, setSectionId] = useState(table?.sectionId ?? "");
    const [tableNumber, setTableNumber] = useState(table?.tableNumber ?? "");
    const [capacity, setCapacity] = useState(table?.capacity?.toString() ?? "");
    const [shape, setShape] = useState<TableShape>(table?.shape ?? "square");

    async function handleStatusChange(next: TableStatus) {
        setStatus(next);
        if (!isEditMode) return; // shouldn't happen — status select is edit-only
        setIsLoading(true);
        setError(null);
        const result = await updateTableStatusAction(table!.id, next);
        setIsLoading(false);
        if (result.error) {
            setError(result.error);
            setStatus(table!.status); // revert on failure
            return;
        }
        router.refresh();
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        if (!sectionId) {
            setError("Select a section.");
            return;
        }
        const capacityNum = Number(capacity);
        if (!Number.isInteger(capacityNum) || capacityNum < 1) {
            setError("Capacity must be a positive whole number.");
            return;
        }

        setIsLoading(true);
        try {
            const result = isEditMode
                ? await updateTableAction(table!.id, {
                      sectionId,
                      tableNumber,
                      capacity: capacityNum,
                      shape,
                  })
                : await createTableAction({
                      sectionId,
                      tableNumber,
                      capacity: capacityNum,
                      shape,
                      branchId,
                  });

            if (result.error) {
                setError(result.error);
                return;
            }

            onOpenChange(false);
            router.refresh();
        } catch {
            setError("Something went wrong. Please try again.");
        } finally {
            setIsLoading(false);
        }
    }

    async function handleDelete() {
        if (!table) return;
        setIsLoading(true);
        setError(null);
        const result = await deleteTableAction(table.id);
        setIsLoading(false);
        if (result.error) {
            setError(result.error);
            return;
        }
        onOpenChange(false);
        router.refresh();
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>
                        {isEditMode ? `Table ${table!.tableNumber}` : "New table"}
                    </DialogTitle>
                    <DialogDescription>
                        {canManageCrud
                            ? isEditMode
                                ? "Update this table's details or status."
                                : "Add a new physical table."
                            : "Change this table's status."}
                    </DialogDescription>
                </DialogHeader>

                {error && (
                    <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                        {error}
                    </div>
                )}

                {/* Status — available to anyone with page access, edit-mode only */}
                {isEditMode && (
                    <div className="space-y-2">
                        <Label>Status</Label>
                        <Select value={status} onValueChange={(v) => v && handleStatusChange(v as TableStatus)} disabled={isLoading}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {STATUS_OPTIONS.map((o) => (
                                    <SelectItem key={o.value} value={o.value}>
                                        {o.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {canManageCrud && (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="tableNumber">Table number</Label>
                            <Input
                                id="tableNumber"
                                value={tableNumber}
                                onChange={(e) => setTableNumber(e.target.value)}
                                placeholder="T1"
                                required
                                disabled={isLoading}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label htmlFor="capacity">Capacity</Label>
                                <Input
                                    id="capacity"
                                    type="number"
                                    min="1"
                                    value={capacity}
                                    onChange={(e) => setCapacity(e.target.value)}
                                    required
                                    disabled={isLoading}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Shape</Label>
                                <Select value={shape} onValueChange={(v) => v && setShape(v as TableShape)} disabled={isLoading}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {SHAPE_OPTIONS.map((o) => (
                                            <SelectItem key={o.value} value={o.value}>
                                                {o.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Section</Label>
                            <Select value={sectionId} onValueChange={(v) => v && setSectionId(v)} disabled={isLoading}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select section" />
                                </SelectTrigger>
                                <SelectContent>
                                    {sections.map((s) => (
                                        <SelectItem key={s.id} value={s.id}>
                                            {s.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <DialogFooter className="flex-col gap-2 sm:flex-col">
                            {isEditMode && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full text-destructive hover:text-destructive"
                                    disabled={isLoading}
                                    onClick={handleDelete}
                                >
                                    Delete table
                                </Button>
                            )}
                            <Button type="submit" className="w-full bg-[#e8570e] hover:bg-[#d44f0c] text-white" disabled={isLoading}>
                                {isLoading ? "Saving..." : isEditMode ? "Save changes" : "Create table"}
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}