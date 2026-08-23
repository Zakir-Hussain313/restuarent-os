"use client";

import { useState } from "react";
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
import { createReservationAction } from "@/features/reservations/public-actions";
import type { Table } from "@/types/table";

interface BookingModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    table: Table | null;
    onBooked: () => void;
}

const MAX_DURATION_MINUTES = 120;
const MAX_ADVANCE_BOOKING_DAYS = 7;

// Local helpers to build sensible <input type="datetime-local"> bounds.
// datetime-local has no timezone info — it's interpreted in the browser's
// local time, which matches how a customer thinks about "7 PM tonight."
function toDatetimeLocalValue(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function BookingModal({ open, onOpenChange, table, onBooked }: BookingModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [confirmedNumber, setConfirmedNumber] = useState<string | null>(null);
    const [confirmedCode, setConfirmedCode] = useState<string | null>(null);

    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [partySize, setPartySize] = useState("2");
    const [startTime, setStartTime] = useState("");
    const [durationMinutes, setDurationMinutes] = useState("90");

    const [datetimeBounds] = useState(() => {
        const now = new Date();
        return {
            min: toDatetimeLocalValue(now),
            max: toDatetimeLocalValue(
                new Date(now.getTime() + MAX_ADVANCE_BOOKING_DAYS * 24 * 60 * 60 * 1000)
            ),
        };
    });

    const minDatetime = datetimeBounds.min;
    const maxDatetime = datetimeBounds.max;

    function reset() {
        setError(null);
        setSuccess(false);
        setConfirmedNumber(null);
        setConfirmedCode(null);
        setCustomerName("");
        setCustomerPhone("");
        setPartySize("2");
        setStartTime("");
        setDurationMinutes("90");
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!table) return;
        setError(null);

        const partySizeNum = Number(partySize);
        if (!Number.isInteger(partySizeNum) || partySizeNum < 1) {
            setError("Party size must be a positive whole number.");
            return;
        }

        const durationNum = Number(durationMinutes);
        if (!Number.isInteger(durationNum) || durationNum < 1) {
            setError("Duration must be a positive whole number of minutes.");
            return;
        }
        if (durationNum > MAX_DURATION_MINUTES) {
            setError(`Reservations can't be longer than ${MAX_DURATION_MINUTES / 60} hours.`);
            return;
        }

        if (!startTime) {
            setError("Please pick a reservation time.");
            return;
        }

        setIsLoading(true);
        const result = await createReservationAction({
            tableId: table.id,
            customerName: customerName || undefined,
            customerPhone,
            partySize: partySizeNum,
            startTime: new Date(startTime).toISOString(),
            durationMinutes: durationNum,
        });
        setIsLoading(false);

        if (!result.success) {
            setError(result.error);
            if (result.code === "TABLE_TAKEN") {
                onBooked(); // refresh the floor plan so the now-taken table updates
            }
            return;
        }

        setConfirmedNumber(result.reservationNumber);
        setConfirmedCode(result.reservationCode);
        setSuccess(true);
        onBooked();
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                onOpenChange(next);
                if (!next) reset();
            }}
        >
            <DialogContent className="sm:max-w-sm max-h-[85vh] flex flex-col p-0">
                {success ? (
                    <div className="overflow-y-auto themed-scrollbar rounded-2xl p-5">
                        <DialogHeader>
                            <DialogTitle>Request sent</DialogTitle>
                            <DialogDescription>
                                We&apos;ve got your reservation request for table {table?.tableNumber}. We&apos;ll confirm it shortly.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="rounded-xl border border-[#ebe9e4] bg-[#faf9f7] p-4 space-y-3">
                            <div>
                                <p className="text-xs text-[#8a8680]">Reservation number</p>
                                <p className="text-sm font-semibold text-[#1a1815]">{confirmedNumber}</p>
                            </div>
                            <div>
                                <p className="text-xs text-[#8a8680]">Reservation code — save this</p>
                                <p className="text-lg font-bold tracking-wide text-[#e8570e]">{confirmedCode}</p>
                            </div>
                            <p className="text-xs text-[#8a8680]">
                                You&apos;ll need your phone number and this code to look up or manage your
                                reservation later, and staff may ask for it when you arrive.
                            </p>
                        </div>

                        <DialogFooter>
                            <Button className="w-full bg-[#e8570e] hover:bg-[#d44f0c] text-white" onClick={() => onOpenChange(false)}>
                                Done
                            </Button>
                        </DialogFooter>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
                        <DialogHeader className="px-5 pt-5">
                            <DialogTitle>Table {table?.tableNumber}</DialogTitle>
                            <DialogDescription>Seats {table?.capacity}. Fill in your details to reserve it.</DialogDescription>
                        </DialogHeader>

                        <div className="overflow-y-auto overflow-x-hidden themed-scrollbar rounded-b-2xl px-5 pt-2 pb-2 space-y-4">
                            {error && (
                                <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="customerName">Name (optional)</Label>
                                <Input
                                    id="customerName"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    disabled={isLoading}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="customerPhone">Phone number</Label>
                                <Input
                                    id="customerPhone"
                                    type="tel"
                                    value={customerPhone}
                                    onChange={(e) => setCustomerPhone(e.target.value)}
                                    required
                                    disabled={isLoading}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="partySize">Party size</Label>
                                <Input
                                    id="partySize"
                                    type="number"
                                    min="1"
                                    value={partySize}
                                    onChange={(e) => setPartySize(e.target.value)}
                                    required
                                    disabled={isLoading}
                                />
                                {table && Number(partySize) > table.capacity && (
                                    <p className="text-xs text-amber-600">
                                        This table seats {table.capacity} — your party is larger, but we&apos;ll still take the booking.
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="startTime">Date &amp; time</Label>
                                <Input
                                    id="startTime"
                                    type="datetime-local"
                                    value={startTime}
                                    min={minDatetime}
                                    max={maxDatetime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    required
                                    disabled={isLoading}
                                />
                                <p className="text-xs text-[#8a8680]">
                                    Bookings can be made up to {MAX_ADVANCE_BOOKING_DAYS} days ahead. If you&apos;re
                                    more than 30 minutes late, your reservation may be released.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="durationMinutes">How long? (minutes)</Label>
                                <Input
                                    id="durationMinutes"
                                    type="number"
                                    min="15"
                                    max={MAX_DURATION_MINUTES}
                                    step="1"
                                    value={durationMinutes}
                                    onChange={(e) => setDurationMinutes(e.target.value)}
                                    required
                                    disabled={isLoading}
                                />
                                <p className="text-xs text-[#8a8680]">
                                    Maximum {MAX_DURATION_MINUTES / 60} hours per reservation.
                                </p>
                            </div>

                            </div>

                            <DialogFooter className="mx-5 mb-5 rounded-xl">
                                <Button type="submit" className="w-full bg-[#e8570e] hover:bg-[#d44f0c] text-white" disabled={isLoading}>
                                    {isLoading ? "Booking..." : "Reserve table"}
                                </Button>
                            </DialogFooter>
                        </form>
                )}
            </DialogContent>
        </Dialog>
    );
}