"use client";

import type { CSSProperties } from "react";
import { Users } from "lucide-react";
import type { Table } from "@/types/table";
import { TABLE_STATUS_STYLES } from "@/features/tables/table-status-styles";

interface TableFloorPlanProps {
    tables: Table[];
    onTableClick?: (table: Table) => void;
    /** Which tables respond to clicks. Defaults to "all, if onTableClick is given". */
    isClickable?: (table: Table) => boolean;
    /** Table ids whose current booking exceeds capacity — shows a small warning badge. */
    overCapacityTableIds?: string[];
    className?: string;
}

// Canvas size the positionX/positionY values are assumed to be authored
// against. If a drag-and-drop layout builder is added later, keep it in
// sync with this constant (or make it configurable then).
const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 600;
const TILE_SIZE = 84;

export function TableFloorPlan({
    tables,
    onTableClick,
    isClickable,
    overCapacityTableIds,
    className,
}: TableFloorPlanProps) {
    const placed = tables.filter((t) => t.positionX != null && t.positionY != null);
    const unplaced = tables.filter((t) => t.positionX == null || t.positionY == null);

    return (
        <div className={className}>
            {tables.length === 0 && (
                <p className="text-sm text-[#8a8680] py-8 text-center">No tables to show.</p>
            )}

            {placed.length > 0 && (
                <div
                    className="relative bg-[#faf9f7] border border-[#ebe9e4] rounded-2xl overflow-auto"
                    style={{ width: "100%", aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}`, minHeight: 320 }}
                >
                    <div className="relative" style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}>
                        {placed.map((table) => (
                            <TableTile
                                key={table.id}
                                table={table}
                                style={{
                                    position: "absolute",
                                    left: table.positionX as number,
                                    top: table.positionY as number,
                                    width: TILE_SIZE,
                                    height: TILE_SIZE,
                                }}
                                onClick={onTableClick}
                                clickable={isClickable ? isClickable(table) : Boolean(onTableClick)}
                                overCapacity={overCapacityTableIds?.includes(table.id) ?? false}
                            />
                        ))}
                    </div>
                </div>
            )}

            {unplaced.length > 0 && (
                <div className={placed.length > 0 ? "mt-4" : undefined}>
                    {placed.length > 0 && (
                        <p className="text-xs text-[#8a8680] mb-2">Not yet placed on the floor plan</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                        {unplaced.map((table) => (
                            <TableTile
                                key={table.id}
                                table={table}
                                style={{ width: TILE_SIZE, height: TILE_SIZE }}
                                onClick={onTableClick}
                                clickable={isClickable ? isClickable(table) : Boolean(onTableClick)}
                                overCapacity={overCapacityTableIds?.includes(table.id) ?? false}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function TableTile({
    table,
    style,
    onClick,
    clickable,
    overCapacity,
}: {
    table: Table;
    style: CSSProperties;
    onClick?: (table: Table) => void;
    clickable: boolean;
    overCapacity: boolean;
}) {
    const s = TABLE_STATUS_STYLES[table.status];

    return (
        <button
            type="button"
            disabled={!clickable}
            onClick={() => onClick?.(table)}
            title={`Table ${table.tableNumber} — ${s.label}`}
            style={style}
            className={`relative flex flex-col items-center justify-center rounded-lg border ${s.bg} ${s.border} transition-all ${
                clickable ? "cursor-pointer hover:scale-105" : "cursor-default opacity-90"
            }`}
        >
            <span className="text-xs font-bold text-[#1a1815]">{table.tableNumber}</span>
            <div className="flex items-center gap-0.5 mt-0.5">
                <Users className="w-2.5 h-2.5 text-[#8a8680]" />
                <span className="text-[10px] text-[#8a8680]">{table.capacity}</span>
            </div>
            {table.status === "occupied" && (
                <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#e8570e] animate-pulse" />
            )}
            {overCapacity && (
                <div
                    title="Party size exceeds this table's capacity"
                    className="absolute -top-1 -right-1 bg-amber-500 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center text-[8px] font-bold"
                >
                    !
                </div>
            )}
        </button>
    );
}