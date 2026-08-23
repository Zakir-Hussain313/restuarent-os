"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { Users } from "lucide-react";
import type { Table, TableShape, ChairSeat } from "@/types/table";
import { TABLE_STATUS_STYLES, getTableColorStyle } from "@/features/tables/table-status-styles";
import { CanvasScrollbar } from "@/features/tables/components/CanvasScrollbar";

interface TableFloorPlanProps {
    tables: Table[];
    onTableClick?: (table: Table) => void;
    isClickable?: (table: Table) => boolean;
    overCapacityTableIds?: string[];
    className?: string;
    draggable?: boolean;
    onPositionChange?: (tableId: string, positionX: number, positionY: number) => void;
    seatsEditable?: boolean;
    onSeatsChange?: (tableId: string, layout: ChairSeat[]) => void;
    /** Bump this number to clear all local seat-drag overrides back to the computed default (used by "Reset to Default"). */
    resetSignal?: number;
}

export const CANVAS_WIDTH = 900;
export const CANVAS_HEIGHT = 600;
// The floor plan always renders at its native 900x600 pixel space —
// table/chair positions are raw pixels in that space. Instead of resizing
// the canvas (which would clip contents), we scale the whole thing down
// visually with CSS transform and shrink its layout box to match. Below
// MIN_SCALE the outer wrapper scrolls/drags horizontally instead of
// shrinking further.
const MIN_SCALE = 850 / CANVAS_WIDTH; // canvas shrinks down to 850px wide, then the wrapper scrolls instead

function getBaseTileSize(capacity: number): number {
    if (capacity <= 2) return 48;
    if (capacity <= 4) return 64;
    if (capacity <= 6) return 80;
    return 96;
}

export function getTileDimensions(table: Pick<Table, "capacity" | "shape">): { width: number; height: number } {
    const base = getBaseTileSize(table.capacity);
    if (table.shape === "rectangle" || table.shape === "oval") {
        return { width: Math.round(base * 1.4), height: base };
    }
    return { width: base, height: base };
}

function getTileRadiusClass(shape: TableShape): string {
    return shape === "circle" || shape === "oval" ? "rounded-full" : "";
}

export function getNextPlacement(existingCount: number): { positionX: number; positionY: number } {
    const step = 140;
    const margin = 30;
    const perRow = Math.max(1, Math.floor((CANVAS_WIDTH - margin * 2) / step));
    const col = existingCount % perRow;
    const row = Math.floor(existingCount / perRow);
    return {
        positionX: Math.min(margin + col * step, CANVAS_WIDTH - 96),
        positionY: Math.min(margin + row * step, CANVAS_HEIGHT - 96),
    };
}

const CHAIR_SIZE = 22;
const CHAIR_GAP = 7;
const SOFA_THICKNESS = 34;
const SOFA_GAP_FRACTION = 0.3; // 30% of the ring left open per gap, for walk-in access

type Side = "top" | "bottom" | "left" | "right";
const SIDE_ANGLE: Record<Side, number> = { top: 180, bottom: 0, left: 90, right: -90 };
// Compass position (used for sofa gap placement) -> degrees in the arc-band's own coordinate system.
const SOFA_GAP_SIDE_DEG: Record<Side, number> = { right: 0, bottom: 90, left: 180, top: 270 };

function normalizeDeg(d: number): number {
    return ((d % 360) + 360) % 360;
}

/** Merge possibly-overlapping circular gap ranges, then return the remaining "band" segments (where the sofa bench actually exists). */
function computeSofaBands(gapCenters: number[], gapSpan: number): { start: number; end: number }[] {
    if (gapCenters.length === 0) return [{ start: 0, end: 360 }];
    const expanded: { start: number; end: number }[] = [];
    gapCenters.forEach((center) => {
        const start = normalizeDeg(center - gapSpan / 2);
        const end = start + gapSpan;
        if (end > 360) {
            expanded.push({ start, end: 360 });
            expanded.push({ start: 0, end: end - 360 });
        } else {
            expanded.push({ start, end });
        }
    });
    expanded.sort((a, b) => a.start - b.start);
    const merged: { start: number; end: number }[] = [];
    expanded.forEach((iv) => {
        const last = merged[merged.length - 1];
        if (last && iv.start <= last.end) last.end = Math.max(last.end, iv.end);
        else merged.push({ ...iv });
    });
    if (merged.length > 1 && merged[0].start === 0 && merged[merged.length - 1].end === 360) {
        merged[0].start = merged[merged.length - 1].start - 360;
        merged.pop();
    }
    if (merged.length === 0) return [{ start: 0, end: 360 }];
    if (merged.length === 1 && merged[0].start <= 0 && merged[0].end >= 360) return []; // fully covered by gaps, no band
    const bands: { start: number; end: number }[] = [];
    for (let i = 0; i < merged.length; i++) {
        const cur = merged[i];
        const next = merged[(i + 1) % merged.length];
        const nextStart = i === merged.length - 1 ? next.start + 360 : next.start;
        if (nextStart > cur.end) bands.push({ start: cur.end, end: nextStart });
    }
    return bands;
}

function placeOnSideRel(side: Side, n: number, tileWidth: number, tileHeight: number): ChairSeat[] {
    const seats: ChairSeat[] = [];
    for (let i = 0; i < n; i++) {
        const t = (i + 1) / (n + 1);
        const angleDeg = SIDE_ANGLE[side];
        if (side === "top") seats.push({ dx: -tileWidth / 2 + t * tileWidth, dy: -tileHeight / 2 - CHAIR_GAP, angleDeg });
        else if (side === "bottom") seats.push({ dx: -tileWidth / 2 + t * tileWidth, dy: tileHeight / 2 + CHAIR_GAP, angleDeg });
        else if (side === "left") seats.push({ dx: -tileWidth / 2 - CHAIR_GAP, dy: -tileHeight / 2 + t * tileHeight, angleDeg });
        else seats.push({ dx: tileWidth / 2 + CHAIR_GAP, dy: -tileHeight / 2 + t * tileHeight, angleDeg });
    }
    return seats;
}

function getDefaultChairLayout(shape: TableShape, tileWidth: number, tileHeight: number, capacity: number): ChairSeat[] {
    if (shape === "circle" || shape === "oval") {
        const rx = tileWidth / 2 + CHAIR_GAP;
        const ry = tileHeight / 2 + CHAIR_GAP;
        const seats: ChairSeat[] = [];
        for (let i = 0; i < capacity; i++) {
            const angle = (2 * Math.PI * i) / capacity - Math.PI / 2;
            const dx = rx * Math.cos(angle);
            const dy = ry * Math.sin(angle);
            const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
            seats.push({ dx, dy, angleDeg });
        }
        return seats;
    }
    if (shape === "rectangle") {
        const horizontal = tileWidth >= tileHeight;
        const sideA: Side = horizontal ? "top" : "left";
        const sideB: Side = horizontal ? "bottom" : "right";
        const nA = Math.ceil(capacity / 2);
        const nB = Math.floor(capacity / 2);
        return [...placeOnSideRel(sideA, nA, tileWidth, tileHeight), ...placeOnSideRel(sideB, nB, tileWidth, tileHeight)];
    }
    const order: Side[] = ["top", "right", "bottom", "left"];
    const counts: Record<Side, number> = { top: 0, bottom: 0, left: 0, right: 0 };
    for (let i = 0; i < capacity; i++) counts[order[i % order.length]]++;
    const seats: ChairSeat[] = [];
    (["top", "bottom", "left", "right"] as Side[]).forEach((side) => {
        seats.push(...placeOnSideRel(side, counts[side], tileWidth, tileHeight));
    });
    return seats;
}

function resolveChairLayout(table: Table, tileWidth: number, tileHeight: number): ChairSeat[] {
    if (table.chairLayout && table.chairLayout.length === table.capacity) return table.chairLayout;
    return getDefaultChairLayout(table.shape, tileWidth, tileHeight, table.capacity);
}

function getStraightSofaBenches(shape: TableShape, tileWidth: number, tileHeight: number, capacity: number, openSides: Side[] = []) {
    const layout = getDefaultChairLayout(shape, tileWidth, tileHeight, capacity);
    const forbiddenAngles = new Set(openSides.map((s) => SIDE_ANGLE[s]));
    const groups = new Map<number, ChairSeat[]>();
    layout.forEach((s) => {
        if (forbiddenAngles.has(s.angleDeg)) return;
        if (!groups.has(s.angleDeg)) groups.set(s.angleDeg, []);
        groups.get(s.angleDeg)!.push(s);
    });
    const STRAIGHT_SOFA_GAP = 6; // visible gap between the table edge and the sofa bench
    const SOFA_LENGTH_EXTRA = 32; // small overhang past the table edge so the bench reads longer than the table side
    const benches: { dx: number; dy: number; width: number; height: number; angleDeg: number; count: number }[] = [];
    groups.forEach((seats, angleDeg) => {
        const horizontal = angleDeg === 0 || angleDeg === 180;
        if (horizontal) {
            const dy =
                angleDeg === 180
                    ? -(tileHeight / 2 + STRAIGHT_SOFA_GAP + SOFA_THICKNESS / 2)
                    : tileHeight / 2 + STRAIGHT_SOFA_GAP + SOFA_THICKNESS / 2;
            benches.push({ dx: 0, dy, width: tileWidth + SOFA_LENGTH_EXTRA, height: SOFA_THICKNESS, angleDeg, count: seats.length });
        } else {
            const dx =
                angleDeg === 90
                    ? -(tileWidth / 2 + STRAIGHT_SOFA_GAP + SOFA_THICKNESS / 2)
                    : tileWidth / 2 + STRAIGHT_SOFA_GAP + SOFA_THICKNESS / 2;
            benches.push({ dx, dy: 0, width: SOFA_THICKNESS, height: tileHeight + SOFA_LENGTH_EXTRA, angleDeg, count: seats.length });
        }
    });
    return benches;
}

/** Builds the "d" path for a thick ring-segment band on an ellipse — used for circle/oval sofas. Leaves a gap so customers can walk up to the table. */
function describeArcBand(cx: number, cy: number, rx: number, ry: number, thickness: number, startDeg: number, endDeg: number) {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const point = (radiusX: number, radiusY: number, deg: number) => ({
        x: cx + radiusX * Math.cos(toRad(deg)),
        y: cy + radiusY * Math.sin(toRad(deg)),
    });
    const outerRx = rx + thickness / 2;
    const outerRy = ry + thickness / 2;
    const innerRx = rx - thickness / 2;
    const innerRy = ry - thickness / 2;
    const outerStart = point(outerRx, outerRy, startDeg);
    const outerEnd = point(outerRx, outerRy, endDeg);
    const innerEnd = point(innerRx, innerRy, endDeg);
    const innerStart = point(innerRx, innerRy, startDeg);
    const largeArc = endDeg - startDeg > 180 ? 1 : 0;
    return [
        `M ${outerStart.x} ${outerStart.y}`,
        `A ${outerRx} ${outerRy} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
        `L ${innerEnd.x} ${innerEnd.y}`,
        `A ${innerRx} ${innerRy} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
        "Z",
    ].join(" ");
}

function RoundSofa({ tileWidth, tileHeight, capacity, fill, gaps }: { tileWidth: number; tileHeight: number; capacity: number; fill: string; gaps: Side[] }) {
    const rx = tileWidth / 2;
    const ry = tileHeight / 2;
    const bandRx = rx + CHAIR_GAP + SOFA_THICKNESS / 2;
    const bandRy = ry + CHAIR_GAP + SOFA_THICKNESS / 2;
    const outerRx = rx + CHAIR_GAP + SOFA_THICKNESS;
    const outerRy = ry + CHAIR_GAP + SOFA_THICKNESS;
    const svgW = outerRx * 2;
    const svgH = outerRy * 2;

    const gapSpan = 360 * SOFA_GAP_FRACTION;
    const activeGaps = gaps.length > 0 ? gaps : (["bottom"] as Side[]); // default: single gap at front, matches prior behavior
    const gapCenters = activeGaps.map((s) => SOFA_GAP_SIDE_DEG[s]);
    const bands = computeSofaBands(gapCenters, gapSpan);

    const toRad = (d2: number) => (d2 * Math.PI) / 180;
    const seamsPerBand = Math.max(1, Math.round(capacity / Math.max(1, bands.length)));

    return (
        <svg
            className="absolute pointer-events-none"
            style={{ left: -outerRx + tileWidth / 2, top: -outerRy + tileHeight / 2, width: svgW, height: svgH }}
            viewBox={`0 0 ${svgW} ${svgH}`}
        >
            {bands.map((band, bi) => {
                const d = describeArcBand(outerRx, outerRy, bandRx, bandRy, SOFA_THICKNESS, band.start, band.end);
                const span = band.end - band.start;
                const seamCount = Math.max(0, seamsPerBand - 1);
                const innerR = { x: bandRx - SOFA_THICKNESS / 2, y: bandRy - SOFA_THICKNESS / 2 };
                const outerR = { x: bandRx + SOFA_THICKNESS / 2, y: bandRy + SOFA_THICKNESS / 2 };
                const seams = Array.from({ length: seamCount }).map((_, i) => {
                    const deg = band.start + (span * (i + 1)) / seamsPerBand;
                    return {
                        x1: outerRx + innerR.x * Math.cos(toRad(deg)),
                        y1: outerRy + innerR.y * Math.sin(toRad(deg)),
                        x2: outerRx + outerR.x * Math.cos(toRad(deg)),
                        y2: outerRy + outerR.y * Math.sin(toRad(deg)),
                    };
                });
                return (
                    <g key={bi}>
                        <path d={d} fill={fill} />
                        {seams.map((s, i) => (
                            <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke="rgba(0,0,0,0.18)" strokeWidth={1} />
                        ))}
                    </g>
                );
            })}
        </svg>
    );
}

export function TableFloorPlan({
    tables,
    onTableClick,
    isClickable,
    overCapacityTableIds,
    className,
    draggable,
    onPositionChange,
    seatsEditable,
    onSeatsChange,
    resetSignal = 0,
}: TableFloorPlanProps) {
    const [localPositions, setLocalPositions] = useState<Record<string, { x: number; y: number }>>({});
    const [seatOverrides, setSeatOverrides] = useState<Record<string, ChairSeat[]>>({});

    const [prevSeatsEditable, setPrevSeatsEditable] = useState(seatsEditable);
    if (prevSeatsEditable !== seatsEditable) {
        setPrevSeatsEditable(seatsEditable);
        if (!seatsEditable && Object.keys(seatOverrides).length > 0) setSeatOverrides({});
    }

    const [prevResetSignal, setPrevResetSignal] = useState(resetSignal);
    if (prevResetSignal !== resetSignal) {
        setPrevResetSignal(resetSignal);
        if (Object.keys(seatOverrides).length > 0) setSeatOverrides({});
    }

    const outerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);

    useLayoutEffect(() => {
        const el = outerRef.current;
        if (!el) return;
        const observer = new ResizeObserver((entries) => {
            const width = entries[0]?.contentRect.width;
            if (width) setScale(Math.max(MIN_SCALE, Math.min(1, width / CANVAS_WIDTH)));
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    function handlePositionChange(tableId: string, positionX: number, positionY: number) {
        setLocalPositions((prev) => ({ ...prev, [tableId]: { x: positionX, y: positionY } }));
        onPositionChange?.(tableId, positionX, positionY);
    }

    const getPosition = (table: Table): { x: number; y: number } | null => {
        const override = localPositions[table.id];
        if (override) return override;
        if (table.positionX == null || table.positionY == null) return null;
        return { x: table.positionX, y: table.positionY };
    };

    const placed = tables.filter((t) => getPosition(t) !== null);
    const unplaced = tables.filter((t) => getPosition(t) === null);

    return (
        <div className={className}>
            {tables.length === 0 && (
                <p className="text-sm text-muted-foreground py-8 text-center">No tables to show.</p>
            )}

            {placed.length > 0 && (
                <div className="relative">
                <div ref={outerRef} className="overflow-auto scrollbar-hide">
                <div style={{ width: CANVAS_WIDTH * scale, height: CANVAS_HEIGHT * scale }}>
                <div
                    className="relative bg-background border-2 border-border rounded-2xl overflow-hidden"
                    style={{
                        width: CANVAS_WIDTH,
                        height: CANVAS_HEIGHT,
                        transform: `scale(${scale})`,
                        transformOrigin: "top left",
                        backgroundImage:
                            "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
                        backgroundSize: "40px 40px",
                        backgroundPosition: "-1px -1px",
                    }}
                >
                    {placed.map((table) => {
                        const { width, height } = getTileDimensions(table);
                        const pos = getPosition(table)!;
                        const centerX = pos.x + width / 2;
                        const centerY = pos.y + height / 2;
                        const chairFill = getTableColorStyle(table.color).chair;
                        const isRoundShape = table.shape === "circle" || table.shape === "oval";
                        const useSofa = table.seatingType === "sofa";

                        const chairLayout = seatOverrides[table.id] ?? resolveChairLayout(table, width, height);

                        return (
                            <div key={table.id}>
                                {useSofa && isRoundShape && (
                                    <div className="absolute" style={{ left: centerX - width / 2, top: centerY - height / 2, width, height }}>
                                        <RoundSofa
                                            tileWidth={width}
                                            tileHeight={height}
                                            capacity={table.capacity}
                                            fill={chairFill}
                                            gaps={(table.sofaLayout?.gaps ?? []) as Side[]}
                                        />
                                    </div>
                                )}

                                {useSofa && !isRoundShape &&
                                    getStraightSofaBenches(table.shape, width, height, table.capacity, (table.sofaLayout?.openSides ?? []) as Side[]).map((b, i) => {
                                        const horizontal = b.angleDeg === 0 || b.angleDeg === 180;
                                        const backrestThickness = 15;
                                        return (
                                            <div
                                                key={i}
                                                className="absolute rounded-md overflow-hidden shadow-sm"
                                                style={{
                                                    left: centerX + b.dx - b.width / 2,
                                                    top: centerY + b.dy - b.height / 2,
                                                    width: b.width,
                                                    height: b.height,
                                                    backgroundColor: chairFill,
                                                }}
                                            >
                                                <div
                                                    className="absolute"
                                                    style={{
                                                        backgroundColor: "rgba(0,0,0,0.25)",
                                                        ...(b.angleDeg === 180
                                                            ? { top: 0, left: 0, right: 0, height: backrestThickness }
                                                            : b.angleDeg === 0
                                                            ? { bottom: 0, left: 0, right: 0, height: backrestThickness }
                                                            : b.angleDeg === 90
                                                            ? { top: 0, bottom: 0, left: 0, width: backrestThickness }
                                                            : { top: 0, bottom: 0, right: 0, width: backrestThickness }),
                                                    }}
                                                />
                                                {Array.from({ length: Math.max(0, b.count - 1) }).map((_, seamI) => {
                                                    const t = (seamI + 1) / b.count;
                                                    return (
                                                        <div
                                                            key={seamI}
                                                            className="absolute bg-black/15"
                                                            style={
                                                                horizontal
                                                                    ? { left: `${t * 100}%`, top: 2, bottom: 2, width: 1 }
                                                                    : { top: `${t * 100}%`, left: 2, right: 2, height: 1 }
                                                            }
                                                        />
                                                    );
                                                })}
                                            </div>
                                        );
                                    })}

                                {!useSofa &&
                                    chairLayout.map((seat, i) => (
                                        <ChairTile
                                            key={i}
                                            x={centerX + seat.dx - CHAIR_SIZE / 2}
                                            y={centerY + seat.dy - CHAIR_SIZE / 2}
                                            angleDeg={seat.angleDeg}
                                            fill={chairFill}
                                            draggable={Boolean(seatsEditable)}
                                            scale={scale}
                                            onDragCommit={(nextX, nextY) => {
                                                const nextDx = nextX + CHAIR_SIZE / 2 - centerX;
                                                const nextDy = nextY + CHAIR_SIZE / 2 - centerY;
                                                const updated = [...chairLayout];
                                                updated[i] = { ...updated[i], dx: nextDx, dy: nextDy };
                                                setSeatOverrides((prev) => ({ ...prev, [table.id]: updated }));
                                                onSeatsChange?.(table.id, updated);
                                            }}
                                        />
                                    ))}

                                <TableTile
                                    table={table}
                                    positioned
                                    style={{ position: "absolute", left: pos.x, top: pos.y, width, height }}
                                    scale={scale}
                                    onClick={onTableClick}
                                    clickable={isClickable ? isClickable(table) : Boolean(onTableClick)}
                                    overCapacity={overCapacityTableIds?.includes(table.id) ?? false}
                                    draggable={draggable && !seatsEditable}
                                    onPositionChange={handlePositionChange}
                                />
                            </div>
                        );
                    })}
                </div>
                </div>
                </div>
                <CanvasScrollbar scrollRef={outerRef} axis="x" />
                <CanvasScrollbar scrollRef={outerRef} axis="y" />
                </div>
            )}

            {unplaced.length > 0 && (
                <div className={placed.length > 0 ? "mt-4" : undefined}>
                    {placed.length > 0 && (
                        <p className="text-xs text-muted-foreground mb-2">Not yet placed on the floor plan</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                        {unplaced.map((table) => {
                            const { width, height } = getTileDimensions(table);
                            return (
                                <TableTile
                                    key={table.id}
                                    table={table}
                                    positioned={false}
                                    style={{ width, height }}
                                    onClick={onTableClick}
                                    clickable={isClickable ? isClickable(table) : Boolean(onTableClick)}
                                    overCapacity={overCapacityTableIds?.includes(table.id) ?? false}
                                />
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

function ChairTile({
    x,
    y,
    angleDeg,
    fill,
    draggable,
    scale = 1,
    onDragCommit,
}: {
    x: number;
    y: number;
    angleDeg: number;
    fill: string;
    draggable: boolean;
    scale?: number;
    onDragCommit?: (nextX: number, nextY: number) => void;
}) {
    const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
    const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
    const pendingCommitRef = useRef<{ x: number; y: number } | null>(null);

    // Keep showing the dropped pixel position (via transform) until the
    // parent's re-render actually moves the base x/y to match it — only
    // then do we release the transform. Guarantees there's never a frame
    // where the chair visually snaps back before settling.
    useLayoutEffect(() => {
        if (
            pendingCommitRef.current &&
            Math.round(x) === Math.round(pendingCommitRef.current.x) &&
            Math.round(y) === Math.round(pendingCommitRef.current.y)
        ) {
            pendingCommitRef.current = null;
            setDragOffset(null);
        }
    }, [x, y]);

    function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
        if (!draggable) return;
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        setDragStart({ x: e.clientX, y: e.clientY });
        setDragOffset({ x: 0, y: 0 });
    }

    function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
        if (!draggable || !dragStart) return;
        e.preventDefault();
        setDragOffset({ x: (e.clientX - dragStart.x) / scale, y: (e.clientY - dragStart.y) / scale });
    }

    function handlePointerUp(e: ReactPointerEvent<HTMLDivElement>) {
        if (!draggable || !dragStart || !dragOffset) {
            setDragStart(null);
            setDragOffset(null);
            return;
        }
        e.currentTarget.releasePointerCapture(e.pointerId);
        const nextX = clamp(x + dragOffset.x, 0, CANVAS_WIDTH - CHAIR_SIZE);
        const nextY = clamp(y + dragOffset.y, 0, CANVAS_HEIGHT - CHAIR_SIZE);
        pendingCommitRef.current = { x: nextX, y: nextY };
        // Re-baseline the transform to the dropped spot (relative to the OLD
        // x/y prop) instead of clearing it — the layout effect above will
        // drop it once props catch up, so there's no visible jump.
        setDragOffset({ x: nextX - x, y: nextY - y });
        setDragStart(null);
        onDragCommit?.(nextX, nextY);
    }

    const style: CSSProperties = {
        position: "absolute",
        left: x,
        top: y,
        width: CHAIR_SIZE,
        height: CHAIR_SIZE,
        transform: `${dragOffset ? `translate(${dragOffset.x}px, ${dragOffset.y}px) ` : ""}rotate(${angleDeg}deg)`,
        touchAction: draggable ? "none" : undefined,
        cursor: draggable ? "grab" : undefined,
        zIndex: dragOffset ? 20 : undefined,
    };

    return (
        <div style={style} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}>
            <svg viewBox="0 0 20 20" width="100%" height="100%">
                <rect x="3" y="8" width="14" height="10" rx="2.5" fill={fill} />
                <rect x="2" y="1.5" width="16" height="7" rx="3.5" fill={fill} opacity="0.7" />
            </svg>
        </div>
    );
}

function TableTile({
    table,
    style,
    scale = 1,
    onClick,
    clickable,
    overCapacity,
    positioned,
    draggable,
    onPositionChange,
}: {
    table: Table;
    style: CSSProperties;
    scale?: number;
    onClick?: (table: Table) => void;
    clickable: boolean;
    overCapacity: boolean;
    positioned: boolean;
    draggable?: boolean;
    onPositionChange?: (tableId: string, positionX: number, positionY: number) => void;
}) {
    const statusStyle = TABLE_STATUS_STYLES[table.status];
    const colorStyle = getTableColorStyle(table.color);
    const isDraggable = Boolean(draggable && positioned && onPositionChange);
    const tileWidth = Number(style.width);
    const tileHeight = Number(style.height);

    const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
    const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
    const suppressClickRef = useRef(false);

    function handlePointerDown(e: ReactPointerEvent<HTMLButtonElement>) {
        if (!isDraggable) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        setDragStart({ x: e.clientX, y: e.clientY });
        setDragOffset({ x: 0, y: 0 });
    }

    function handlePointerMove(e: ReactPointerEvent<HTMLButtonElement>) {
        if (!isDraggable || !dragStart) return;
        e.preventDefault();
        setDragOffset({ x: (e.clientX - dragStart.x) / scale, y: (e.clientY - dragStart.y) / scale });
    }

    function handlePointerUp(e: ReactPointerEvent<HTMLButtonElement>) {
        if (!isDraggable || !dragStart || !dragOffset) {
            setDragStart(null);
            setDragOffset(null);
            return;
        }
        e.currentTarget.releasePointerCapture(e.pointerId);

        const originalLeft = Number(style.left ?? 0);
        const originalTop = Number(style.top ?? 0);
        const nextLeft = clamp(originalLeft + dragOffset.x, 0, CANVAS_WIDTH - tileWidth);
        const nextTop = clamp(originalTop + dragOffset.y, 0, CANVAS_HEIGHT - tileHeight);

        const moved = nextLeft !== originalLeft || nextTop !== originalTop;
        suppressClickRef.current = moved;

        setDragStart(null);
        setDragOffset(null);
        if (moved) {
            onPositionChange!(table.id, nextLeft, nextTop);
        }
    }

    function handleClick() {
        if (suppressClickRef.current) {
            suppressClickRef.current = false;
            return;
        }
        onClick?.(table);
    }

    const tileStyle: CSSProperties = {
        ...(dragOffset
            ? { ...style, transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)`, zIndex: 10, touchAction: "none" }
            : { ...style, touchAction: isDraggable ? "none" : undefined }),
        backgroundColor: colorStyle.bg,
        borderColor: colorStyle.border,
    };

    return (
        <button
            type="button"
            disabled={!clickable && !isDraggable}
            onClick={handleClick}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            title={`Table ${table.tableNumber} — ${statusStyle.label}`}
            style={tileStyle}
            className={`relative flex flex-col items-center justify-center border-2 shadow-sm ${getTileRadiusClass(table.shape)} transition-colors ${isDraggable ? "cursor-grab active:cursor-grabbing" : clickable ? "cursor-pointer" : "cursor-default opacity-90"
                }`}
        >
            <span className="text-xs font-bold text-foreground">{table.tableNumber}</span>
            <div className="flex items-center gap-0.5 mt-0.5">
                <Users className="w-2.5 h-2.5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">{table.capacity}</span>
            </div>
            <div
                title={statusStyle.label}
                className={`absolute bottom-1 right-1 w-2 h-2 rounded-full border border-white/60 ${statusStyle.dot} ${table.status === "occupied" ? "animate-pulse" : ""
                    }`}
            />
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

function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
}