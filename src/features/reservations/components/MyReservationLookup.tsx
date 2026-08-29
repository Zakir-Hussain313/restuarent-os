"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search } from "lucide-react";
import { getMyReservationAction } from "@/features/reservations/public-actions";

type LookedUpReservation = {
    reservationNumber: string;
    status: string;
    startTime: Date;
    durationMinutes: number;
    partySize: number;
    customerName: string | null;
    tableNumber: string;
};

type LookupState =
    | { status: "idle" }
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "found"; reservations: LookedUpReservation[] };

const STATUS_LABELS: Record<string, string> = {
    pending: "Pending confirmation",
    confirmed: "Confirmed",
    seated: "Seated",
    cancelled: "Cancelled",
    no_show: "Marked as no-show",
};

function formatTimeWindow(startTime: Date, durationMinutes: number): string {
    const start = new Date(startTime);
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
    const dateStr = start.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    const startStr = start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    const endStr = end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    return `${dateStr}, ${startStr} – ${endStr}`;
}

export function MyReservationLookup() {
    const [phone, setPhone] = useState("");
    const [code, setCode] = useState("");
    const [state, setState] = useState<LookupState>({ status: "idle" });

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setState({ status: "loading" });

        const result = await getMyReservationAction({
            customerPhone: phone,
            reservationCode: code,
        });

        if (!result.success) {
            setState({ status: "error", message: result.error });
        } else {
            setState({ status: "found", reservations: result.reservations });
        }
    }

    return (
        <div className="max-w-md mx-auto">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="text-sm font-medium text-[#1a1814] mb-1 block">Phone Number</label>
                    <Input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="03xx-xxxxxxx"
                        required
                    />
                </div>
                <div>
                    <label className="text-sm font-medium text-[#1a1814] mb-1 block">Reservation Code</label>
                    <Input
                        type="password"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="Shown when you booked"
                        autoComplete="one-time-code"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        required
                    />
                </div>

                <Button type="submit" className="w-full" disabled={state.status === "loading"}>
                    {state.status === "loading" ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                        <Search className="w-4 h-4 mr-2" />
                    )}
                    Find My Reservation
                </Button>
            </form>

            {state.status === "error" && (
                <div className="mt-4 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {state.message}
                </div>
            )}

            {state.status === "found" && (
                <div className="mt-6 space-y-3">
                    {state.reservations.length === 0 ? (
                        <p className="text-sm text-[#8a8680]">No reservations found for that phone number.</p>
                    ) : (
                        state.reservations.map((reservation) => (
                            <div
                                key={reservation.reservationNumber}
                                className="rounded-xl border border-[#ebe9e4] bg-white p-5 space-y-3"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold uppercase tracking-widest text-[#e8570e]">
                                        {reservation.reservationNumber}
                                    </span>
                                    <span className="text-xs font-medium text-[#1a1814]">
                                        {STATUS_LABELS[reservation.status] ?? reservation.status}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-sm text-[#1a1814]">
                                        {formatTimeWindow(reservation.startTime, reservation.durationMinutes)}
                                    </p>
                                    <p className="text-xs text-[#8a8680] mt-0.5">
                                        Table {reservation.tableNumber} · Party of {reservation.partySize}
                                    </p>
                                </div>
                                {reservation.customerName && (
                                    <p className="text-xs text-[#8a8680]">Booked under {reservation.customerName}</p>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}