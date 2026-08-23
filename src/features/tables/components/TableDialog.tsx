"use client";

import { useState, useRef, useEffect } from "react";
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
import { useAlertModal } from "@/components/providers/AlertModalProvider";
import { getNextPlacement } from "@/features/tables/components/TableFloorPlan";
import type { Table, TableShape, TableStatus, TableColor, TableSeatingType, SofaSide } from "@/types/table";
import type { TableSection } from "@/db/schema";
import { TABLE_COLORS, getTableColorStyle } from "@/features/tables/table-status-styles";

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

const SEATING_OPTIONS: { value: TableSeatingType; label: string }[] = [
    { value: "chairs", label: "Chairs" },
    { value: "sofa", label: "Sofa" },
];

interface TableDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** null = create mode. */
    table: Table | null;
    sections: TableSection[];
    branchId?: string;
    /** Pre-selected section for create mode (e.g. the currently active floor tab). */
    defaultSectionId?: string;
    /** Tables already on the active section's floor plan — used to auto-place a new table without overlapping. */
    sectionTables?: Table[];
    /** ADMIN/SUPER_ADMIN see the full form + delete. STAFF only sees status. */
    canManageCrud: boolean;
}

export function TableDialog({ open, onOpenChange, table, sections, branchId, defaultSectionId, sectionTables, canManageCrud }: TableDialogProps) {
    const router = useRouter();
    const { showConfirm } = useAlertModal();
    const isEditMode = !!table;

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<TableStatus>(table?.status ?? "available");
    const [sectionId, setSectionId] = useState(table?.sectionId ?? defaultSectionId ?? "");
    const [tableNumber, setTableNumber] = useState(table?.tableNumber ?? "");
    const [capacity, setCapacity] = useState(table?.capacity?.toString() ?? "");
    const [shape, setShape] = useState<TableShape>(table?.shape ?? "square");
    const [color, setColor] = useState<TableColor>(table?.color ?? "oak");
    const [seatingType, setSeatingType] = useState<TableSeatingType>(table?.seatingType ?? "chairs");
    const [sofaSides, setSofaSides] = useState<SofaSide[]>(
        table?.sofaLayout?.openSides ?? table?.sofaLayout?.gaps ?? []
    );
    const isRoundShape = shape === "circle" || shape === "oval";
    const [sofaDropdownOpen, setSofaDropdownOpen] = useState(false);
    const sofaDropdownRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (sofaDropdownRef.current && !sofaDropdownRef.current.contains(e.target as Node)) {
                setSofaDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
    function toggleSofaSide(side: SofaSide) {
        setSofaSides((prev) => {
            if (prev.includes(side)) return prev.filter((s) => s !== side);
            if (prev.length >= 3) return prev; // max 3 open sides/gaps — a sofa can't be open on all 4
            return [...prev, side];
        });
    }

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
        if (seatingType === "sofa" && sofaSides.length === 0) {
            setError("Select at least one open side/gap for the sofa.");
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
                    color,
                    seatingType,
                    sofaLayout:
                        seatingType === "sofa"
                            ? isRoundShape
                                ? { gaps: sofaSides }
                                : { openSides: sofaSides }
                            : null,
                })
                : await createTableAction({
                    sectionId,
                    tableNumber,
                    capacity: capacityNum,
                    shape,
                    color,
                    seatingType,
                    sofaLayout:
                        seatingType === "sofa"
                            ? isRoundShape
                                ? { gaps: sofaSides }
                                : { openSides: sofaSides }
                            : null,
                    branchId,
                    ...getNextPlacement(sectionTables?.length ?? 0),
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
        const confirmed = await showConfirm(
            `Delete table "${table.tableNumber}"? This can't be undone.`,
            { title: "Delete table", confirmLabel: "Delete", destructive: true }
        );
        if (!confirmed) return;

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
                {isEditMode && !canManageCrud && (
                    <div className="space-y-2">
                        <Label>Status</Label>
                        <Select value={status} onValueChange={(v) => v && handleStatusChange(v as TableStatus)} disabled={isLoading}>
                            <SelectTrigger>
                                <SelectValue>
                                    {(value: string) =>
                                        STATUS_OPTIONS.find((o) => o.value === value)?.label ?? value
                                    }
                                </SelectValue>
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
                        <div className={isEditMode ? "grid grid-cols-2 gap-3" : ""}>
                            {isEditMode && (
                                <div className="space-y-2">
                                    <Label>Status</Label>
                                    <Select value={status} onValueChange={(v) => v && handleStatusChange(v as TableStatus)} disabled={isLoading}>
                                        <SelectTrigger>
                                            <SelectValue>
                                                {(value: string) =>
                                                    STATUS_OPTIONS.find((o) => o.value === value)?.label ?? value
                                                }
                                            </SelectValue>
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
                                        <SelectValue>
                                            {(value: string) =>
                                                SHAPE_OPTIONS.find((o) => o.value === value)?.label ?? value
                                            }
                                        </SelectValue>
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

                        <div className={`grid gap-3 ${seatingType === "sofa" ? "grid-cols-3" : "grid-cols-2"}`}>
                            <div className="space-y-2">
                                <Label>Seating</Label>
                                <Select value={seatingType} onValueChange={(v) => v && setSeatingType(v as TableSeatingType)} disabled={isLoading}>
                                    <SelectTrigger>
                                        <SelectValue>
                                            {(value: string) =>
                                                SEATING_OPTIONS.find((o) => o.value === value)?.label ?? value
                                            }
                                        </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {SEATING_OPTIONS.map((o) => (
                                            <SelectItem key={o.value} value={o.value}>
                                                {o.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {seatingType === "sofa" && (
                                <div className="space-y-2" ref={sofaDropdownRef}>
                                    <Label>{isRoundShape ? "Gaps" : "Open sides"}</Label>
                                    <div className="relative">
                                        <button
                                            type="button"
                                            disabled={isLoading}
                                            onClick={() => setSofaDropdownOpen((o) => !o)}
                                            className="w-full flex items-center justify-between rounded-xl border border-input bg-background px-3 py-2 text-sm text-left"
                                        >
                                            <span className="truncate">
                                                {sofaSides.length > 0 ? sofaSides.join(", ") : "Select"}
                                            </span>
                                            <span className="text-muted-foreground text-xs ml-1">▾</span>
                                        </button>
                                        {sofaDropdownOpen && (
                                            <div className="absolute z-20 mt-1 w-full rounded-xl border border-input bg-background p-2 shadow-md">
                                                {(["top", "right", "bottom", "left"] as SofaSide[]).map((side) => (
                                                    <label
                                                        key={side}
                                                        className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-primary-light hover:text-primary transition-colors cursor-pointer capitalize text-sm"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={sofaSides.includes(side)}
                                                            onChange={() => toggleSofaSide(side)}
                                                            disabled={isLoading}
                                                            style={{ accentColor: "var(--primary)" }}
                                                        />
                                                        {side}
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label>Section</Label>
                                <Select value={sectionId} onValueChange={(v) => v && setSectionId(v)} disabled={isLoading}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select section">
                                            {(value: string) =>
                                                sections.find((s) => s.id === value)?.name ?? "Select section"
                                            }
                                        </SelectValue>
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
                        </div>

                        <div className="space-y-2">
                            <Label>Color</Label>
                            <div className="flex gap-2">
                                {TABLE_COLORS.map((c) => (
                                    <button
                                        key={c}
                                        type="button"
                                        title={getTableColorStyle(c).label}
                                        onClick={() => setColor(c)}
                                        disabled={isLoading}
                                        style={{ backgroundColor: getTableColorStyle(c).bg }}
                                        className={`w-7 h-7 rounded-full border border-black/10 ${color === c ? "ring-2 ring-offset-2 ring-primary" : ""
                                            }`}
                                    />
                                ))}
                            </div>
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
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? "Saving..." : isEditMode ? "Save changes" : "Create table"}
                            </Button>
                        </DialogFooter>
                    </form>
                )}
        </DialogContent>
        </Dialog >
    );
}