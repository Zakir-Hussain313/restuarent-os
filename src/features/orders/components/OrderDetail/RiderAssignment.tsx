"use client";

import { useState, useCallback } from "react";
import { Bike, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    getRidersForBranchAction,
    assignRiderAction,
    type RiderOption,
} from "@/features/deliveries/actions";
import type { Order } from "@/types";

interface RiderAssignmentProps {
    order: Order;
    onAssigned: () => void;
}

const DELIVERY_STATUS_LABEL: Record<string, string> = {
    unassigned: "Unassigned",
    assigned: "Assigned",
    out_for_delivery: "Out for delivery",
    delivered: "Delivered",
    cancelled: "Cancelled",
};

export function RiderAssignment({ order, onAssigned }: RiderAssignmentProps) {
    const [riders, setRiders] = useState<RiderOption[]>([]);
    const [isLoadingRiders, setIsLoadingRiders] = useState(false);
    const [isAssigning, setIsAssigning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pickerOpen, setPickerOpen] = useState(false);

    const canReassign =
        order.deliveryStatus === "unassigned" || order.deliveryStatus === "assigned";

    const loadRiders = useCallback(async () => {
        setIsLoadingRiders(true);
        setError(null);
        const result = await getRidersForBranchAction(order.branchId);
        if (result.success) {
            setRiders(result.riders);
        } else {
            setError(result.error);
        }
        setIsLoadingRiders(false);
    }, [order.branchId]);

    async function handleAssign(riderId: string) {
        setIsAssigning(true);
        setError(null);
        const result = await assignRiderAction(order.id, riderId);
        setIsAssigning(false);
        if (!result.success) {
            setError(result.error);
            return;
        }
        setPickerOpen(false);
        onAssigned();
    }

    if (order.orderType !== "delivery") return null;

    return (
        <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Bike className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Rider
                    </span>
                </div>
                <span
                    className={cn(
                        "text-[11px] font-medium px-2 py-0.5 rounded-full",
                        order.deliveryStatus === "delivered"
                            ? "bg-emerald-100 text-emerald-800"
                            : order.deliveryStatus === "out_for_delivery"
                            ? "bg-blue-100 text-blue-800"
                            : order.deliveryStatus === "assigned"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-gray-100 text-gray-700"
                    )}
                >
                    {DELIVERY_STATUS_LABEL[order.deliveryStatus ?? "unassigned"]}
                </span>
            </div>

            <div className="flex items-center justify-between gap-2">
                <span className="text-sm">
                    {order.riderName ?? (
                        <span className="text-muted-foreground italic">No rider assigned</span>
                    )}
                </span>

                {canReassign && (
                    <button
                        onClick={() => {
                            const next = !pickerOpen;
                            setPickerOpen(next);
                            if (next) loadRiders();
                        }}
                        className="text-xs font-medium text-primary hover:text-primary/80 shrink-0"
                    >
                        {order.riderName ? "Reassign" : "Assign"}
                    </button>
                )}
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            {pickerOpen && (
                <div className="space-y-1.5 pt-1 border-t">
                    <div className="flex items-center justify-between pt-1.5">
                        <span className="text-[11px] text-muted-foreground">
                            Select a rider
                        </span>
                        <button
                            onClick={loadRiders}
                            disabled={isLoadingRiders}
                            className="text-muted-foreground hover:text-foreground"
                            aria-label="Refresh riders"
                        >
                            <RefreshCw className={cn("w-3 h-3", isLoadingRiders && "animate-spin")} />
                        </button>
                    </div>

                    {isLoadingRiders ? (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Loading riders...
                        </div>
                    ) : riders.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2">
                            No riders found for this branch.
                        </p>
                    ) : (
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                            {riders.map((rider) => (
                                <button
                                    key={rider.id}
                                    onClick={() => handleAssign(rider.id)}
                                    disabled={isAssigning || rider.isBusy}
                                    className={cn(
                                        "w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs text-left transition-colors",
                                        rider.isBusy
                                            ? "opacity-40 cursor-not-allowed"
                                            : "hover:bg-muted cursor-pointer"
                                    )}
                                >
                                    <span className="flex items-center gap-1.5">
                                        <span
                                            className={cn(
                                                "w-1.5 h-1.5 rounded-full",
                                                rider.isAvailable ? "bg-emerald-500" : "bg-gray-300"
                                            )}
                                        />
                                        {rider.name}
                                    </span>
                                    <span className="text-muted-foreground">
                                        {rider.isBusy
                                            ? "On delivery"
                                            : rider.isAvailable
                                            ? "Online"
                                            : "Offline"}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}