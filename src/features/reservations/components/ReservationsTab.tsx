"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Phone, StickyNote, Clock, Hash, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    confirmReservationAction,
    markSeatedAction,
    cancelReservationAction,
    markNoShowAction,
} from "@/features/reservations/actions";
import type { TableReservation } from "@/db/schema";
import type { Table } from "@/types/table";

function formatReservationWindow(startTime: Date, durationMinutes: number): string {
    const end = new Date(startTime.getTime() + durationMinutes * 60 * 1000);
    const dateStr = startTime.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    const startStr = startTime.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    const endStr = end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    return `${dateStr}, ${startStr} – ${endStr}`;
}

const RESERVATION_STATUS_STYLES: Record<
    TableReservation["status"],
    { bg: string; border: string; text: string; label: string }
> = {
    pending: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", label: "Pending" },
    confirmed: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", label: "Confirmed" },
    seated: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", label: "Seated" },
    cancelled: { bg: "bg-[#f4f2ef]", border: "border-[#ebe9e4]", text: "text-[#8a8680]", label: "Cancelled" },
    no_show: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", label: "No-show" },
};

interface ReservationsTabProps {
    reservations: TableReservation[];
    tables: Table[];
}

export function ReservationsTab({ reservations, tables }: ReservationsTabProps) {
    const router = useRouter();
    const [pendingId, setPendingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const tableById = new Map(tables.map((t) => [t.id, t]));

    async function runAction(
        id: string,
        action: (id: string) => Promise<{ data: unknown; error?: string }>
    ) {
        setPendingId(id);
        setError(null);
        const result = await action(id);
        if (result.error) {
            setError(result.error);
        } else {
            router.refresh();
        }
        setPendingId(null);
    }

    const active = reservations.filter((r) => r.status === "pending" || r.status === "confirmed");
    const past = reservations.filter((r) => r.status !== "pending" && r.status !== "confirmed");

    if (reservations.length === 0) {
        return <p className="text-sm text-[#8a8680] py-12 text-center">No reservations yet.</p>;
    }

    return (
        <div className="space-y-6">
            {error && (
                <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                    {error}
                </div>
            )}

            {active.length > 0 && (
                <div className="space-y-2">
                    {active.map((r) => (
                        <ReservationRow
                            key={r.id}
                            reservation={r}
                            table={tableById.get(r.tableId)}
                            isPending={pendingId === r.id}
                            onConfirm={() => runAction(r.id, confirmReservationAction)}
                            onSeat={() => runAction(r.id, markSeatedAction)}
                            onCancel={() => runAction(r.id, cancelReservationAction)}
                            onNoShow={() => runAction(r.id, markNoShowAction)}
                        />
                    ))}
                </div>
            )}

            {past.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs font-medium text-[#8a8680] uppercase tracking-wide">History</p>
                    {past.map((r) => (
                        <ReservationRow
                            key={r.id}
                            reservation={r}
                            table={tableById.get(r.tableId)}
                            isPending={false}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function ReservationRow({
    reservation,
    table,
    isPending,
    onConfirm,
    onSeat,
    onCancel,
    onNoShow,
}: {
    reservation: TableReservation;
    table: Table | undefined;
    isPending: boolean;
    onConfirm?: () => void;
    onSeat?: () => void;
    onCancel?: () => void;
    onNoShow?: () => void;
}) {
    const s = RESERVATION_STATUS_STYLES[reservation.status];
    const overCapacity = table ? reservation.partySize > table.capacity : false;
    const isActive = reservation.status === "pending" || reservation.status === "confirmed";

    return (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-[#ebe9e4] bg-white px-4 py-3">
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-[#1a1815]">
                        {reservation.customerName || "Guest"}
                    </span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border ${s.bg} ${s.border} ${s.text}`}>
                        {s.label}
                    </span>
                    {overCapacity && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full border bg-amber-50 border-amber-200 text-amber-700">
                            Over capacity
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-3 mt-1 text-xs text-[#8a8680] flex-wrap">
                    <span className="flex items-center gap-1 font-medium text-[#4a4744]">
                        <Hash className="w-3 h-3" />
                        {reservation.reservationNumber}
                    </span>
                    <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatReservationWindow(new Date(reservation.startTime), reservation.durationMinutes)}
                    </span>
                    <span className="flex items-center gap-1">
                        <KeyRound className="w-3 h-3" />
                        {reservation.reservationCode}
                    </span>
                </div>

                <div className="flex items-center gap-3 mt-1 text-xs text-[#8a8680] flex-wrap">
                    <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {reservation.customerPhone}
                    </span>
                    <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {reservation.partySize} {table ? `· Table ${table.tableNumber} (seats ${table.capacity})` : ""}
                    </span>
                    {reservation.notes && (
                        <span className="flex items-center gap-1">
                            <StickyNote className="w-3 h-3" />
                            {reservation.notes}
                        </span>
                    )}
                </div>
            </div>

            {isActive && (
                <div className="flex items-center gap-2 shrink-0">
                    {reservation.status === "pending" && (
                        <Button size="sm" disabled={isPending} onClick={onConfirm} className="bg-[#e8570e] hover:bg-[#d44f0c] text-white">
                            Confirm
                        </Button>
                    )}
                    {reservation.status === "confirmed" && (
                        <Button size="sm" disabled={isPending} onClick={onSeat} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                            Seat
                        </Button>
                    )}
                    <Button size="sm" variant="outline" disabled={isPending} onClick={onNoShow}>
                        No-show
                    </Button>
                    <Button size="sm" variant="ghost" disabled={isPending} onClick={onCancel} className="text-destructive hover:text-destructive">
                        Cancel
                    </Button>
                </div>
            )}
        </div>
    );
}