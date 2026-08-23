"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useBranchChannel } from "@/lib/realtime/useBranchChannel";
import { subscribeToPush } from "@/lib/push/subscribe";
import { saveRiderPushSubscriptionAction } from "@/features/deliveries/pushActions";
import {
    Phone,
    MapPin,
    Navigation,
    LogOut,
    Package,
    CheckCircle2,
    Bike,
    Clock,
    XCircle,
    Loader2,
    Bell,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn, formatCurrency } from "@/lib/utils";
import { RESTAURANT_CONFIG } from "@/config/restaurant";
import { logoutAction } from "@/features/auth/actions";
import {
    toggleRiderAvailabilityAction,
    updateDeliveryStatusAction,
    type RiderDashboardData,
    type RiderCurrentDelivery,
} from "@/features/deliveries/actions";

interface RiderDashboardProps {
    initialData: RiderDashboardData;
}

function formatAddress(address: RiderCurrentDelivery["address"]) {
    return [address.street, address.area, address.city].filter(Boolean).join(", ");
}

function mapsUrl(address: { street: string; area: string; city: string }) {
    const query = [address.street, address.area, address.city].filter(Boolean).join(", ");
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString(RESTAURANT_CONFIG.locale, {
        day: "2-digit",
        month: "short",
    });
}

export function RiderDashboard({ initialData }: RiderDashboardProps) {
    const router = useRouter();
    const [isAvailable, setIsAvailable] = useState(initialData.isAvailable);
    const [currentDelivery, setCurrentDelivery] = useState(initialData.currentDelivery);
    const [history, setHistory] = useState(initialData.history);
    const [error, setError] = useState<string | null>(null);
    const [isToggling, startToggleTransition] = useTransition();
    const [isAdvancing, startAdvanceTransition] = useTransition();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    // Resync local state when the server refetches (via router.refresh() below).
    // Calling setState during render (not in an effect) is React's documented
    // pattern for resetting state when a prop changes — avoids the cascading-render warning.
    const [prevInitialData, setPrevInitialData] = useState(initialData);
    if (initialData !== prevInitialData) {
        setPrevInitialData(initialData);
        setIsAvailable(initialData.isAvailable);
        setCurrentDelivery(initialData.currentDelivery);
        setHistory(initialData.history);
    }

    const onRealtimeEvent = useCallback(() => {
        router.refresh();
    }, [router]);

    useBranchChannel(initialData.branchId, "riders", onRealtimeEvent);

    const [pushStatus, setPushStatus] = useState<"idle" | "checking" | "asking" | "done" | "error">("checking");
    const [pushError, setPushError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        async function checkExistingSubscription() {
            if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
                if (!cancelled) setPushStatus("idle");
                return;
            }
            try {
                const registration = await navigator.serviceWorker.ready;
                const existing = await registration.pushManager.getSubscription();
                if (!cancelled) setPushStatus(existing ? "done" : "idle");
            } catch {
                if (!cancelled) setPushStatus("idle");
            }
        }
        checkExistingSubscription();
        return () => {
            cancelled = true;
        };
    }, []);

    async function handleEnableNotifications() {
        setPushStatus("asking");
        setPushError(null);
        try {
            const result = await subscribeToPush(async (sub) => {
                await saveRiderPushSubscriptionAction(sub);
            });
            setPushStatus(result.success ? "done" : "error");
            if (!result.success) setPushError(result.error);
        } catch (err) {
            setPushStatus("error");
            setPushError(err instanceof Error ? err.message : String(err));
        }
    }

    function handleToggleAvailability(next: boolean) {
        setError(null);
        setIsAvailable(next);
        startToggleTransition(async () => {
            const result = await toggleRiderAvailabilityAction(next);
            if (!result.success) {
                setIsAvailable(!next);
                setError(result.error);
            }
        });
    }

    function handleAdvance() {
        if (!currentDelivery) return;
        const nextStatus = currentDelivery.status === "assigned" ? "out_for_delivery" : "delivered";
        setError(null);
        startAdvanceTransition(async () => {
            const result = await updateDeliveryStatusAction(currentDelivery.orderId, nextStatus);
            if (!result.success) {
                setError(result.error);
                return;
            }
            if (nextStatus === "delivered") {
                setHistory((prev) => [
                    {
                        orderId: currentDelivery.orderId,
                        orderNumber: currentDelivery.orderNumber,
                        status: "delivered",
                        address: formatAddress(currentDelivery.address),
                        total: currentDelivery.total,
                        updatedAt: new Date().toISOString(),
                    },
                    ...prev,
                ]);
                setCurrentDelivery(null);
            } else {
                setCurrentDelivery({ ...currentDelivery, status: "out_for_delivery" });
            }
        });
    }

    async function handleLogout() {
        setIsLoggingOut(true);
        await logoutAction();
        router.push("/auth/login");
    }

    return (
        <div className="max-w-md mx-auto min-h-screen flex flex-col">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background border-b px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                        <Bike className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="text-sm font-semibold">My Deliveries</span>
                </div>
                <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="p-2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                    aria-label="Log out"
                >
                    {isLoggingOut ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <LogOut className="w-4 h-4" />
                    )}
                </button>
            </div>

            {/* Availability toggle */}
            <div className="px-4 py-3 border-b flex items-center justify-between bg-background">
                <div className="flex items-center gap-2">
                    <span
                        className={cn(
                            "w-2 h-2 rounded-full",
                            isAvailable ? "bg-emerald-500" : "bg-gray-300"
                        )}
                    />
                    <span className="text-sm font-medium">
                        {isAvailable ? "Online" : "Offline"}
                    </span>
                    {isToggling && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
                </div>
                <Switch
                    checked={isAvailable}
                    onCheckedChange={handleToggleAvailability}
                    disabled={isToggling}
                    className="border-gray-300"
                />
            </div>

            {pushStatus !== "done" && pushStatus !== "checking" && (
                <div className="mx-4 mt-3">
                    <button
                        onClick={handleEnableNotifications}
                        disabled={pushStatus === "asking"}
                        className="w-full px-3 py-2 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium text-center disabled:opacity-50"
                    >
                        {pushStatus === "asking" ? "Requesting..." : (
                            <span className="flex items-center gap-1.5">
                                <Bell className="w-3.5 h-3.5" />
                                Enable delivery notifications
                            </span>
                        )}
                    </button>
                    {pushStatus === "error" && pushError && (
                        <p className="text-[11px] text-red-600 mt-1 wrap-break-word">{pushError}</p>
                    )}
                </div>
            )}

            {error && (
                <div className="mx-4 mt-3 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                    {error}
                </div>
            )}

            {/* Main content */}
            <div className="flex-1 px-4 py-4 space-y-4">
                {currentDelivery ? (
                    <div className="rounded-xl border shadow-sm overflow-hidden">
                        <div className="px-4 py-3 bg-blue-50 border-b flex items-center justify-between">
                            <span className="text-sm font-semibold text-blue-900">
                                Order {currentDelivery.orderNumber}
                            </span>
                            <span
                                className={cn(
                                    "text-[11px] font-medium px-2 py-0.5 rounded-full",
                                    currentDelivery.status === "assigned"
                                        ? "bg-amber-100 text-amber-800"
                                        : "bg-blue-100 text-blue-800"
                                )}
                            >
                                {currentDelivery.status === "assigned" ? "Assigned" : "Out for delivery"}
                            </span>
                        </div>

                        <div className="p-4 space-y-4">
                            {/* Customer */}
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-sm font-medium">
                                        {currentDelivery.customerName ?? "Customer"}
                                    </p>
                                    {currentDelivery.customerPhone && (
                                        <p className="text-xs text-muted-foreground">
                                            {currentDelivery.customerPhone}
                                        </p>
                                    )}
                                </div>
                                {currentDelivery.customerPhone && (
                                    <a
                                        href={`tel:${currentDelivery.customerPhone}`}
                                        className="shrink-0 w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 hover:bg-emerald-100 transition-colors"
                                        aria-label="Call customer"
                                    >
                                        <Phone className="w-4 h-4" />
                                    </a>
                                )}
                            </div>

                            {/* Address */}
                            <div className="rounded-lg bg-muted/50 p-3 space-y-2">
                                <div className="flex items-start gap-2">
                                    <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm">{formatAddress(currentDelivery.address)}</p>
                                        {currentDelivery.address.label && (
                                            <p className="text-xs text-muted-foreground">
                                                {currentDelivery.address.label}
                                            </p>
                                        )}
                                        {currentDelivery.address.instructions && (
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {currentDelivery.address.instructions}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <a
                                    href={mapsUrl(currentDelivery.address)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-1.5 text-xs font-medium text-blue-600 py-1.5"
                                >
                                    <Navigation className="w-3.5 h-3.5" />
                                    Open in Maps
                                </a>
                            </div>

                            {/* Items */}
                            <div className="space-y-1.5">
                                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                    <Package className="w-3.5 h-3.5" />
                                    {currentDelivery.items.length} item
                                    {currentDelivery.items.length !== 1 ? "s" : ""}
                                </div>
                                {currentDelivery.items.map((item) => (
                                    <div key={item.id} className="flex justify-between text-sm">
                                        <span>
                                            {item.quantity}× {item.menuItemName}
                                        </span>
                                        <span className="tabular-nums text-muted-foreground">
                                            {formatCurrency(item.itemTotal)}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Total */}
                            <div className="flex justify-between text-sm font-semibold pt-2 border-t">
                                <span>Total to collect</span>
                                <span className="tabular-nums">{formatCurrency(currentDelivery.total)}</span>
                            </div>

                            {/* Action button */}
                            <button
                                onClick={handleAdvance}
                                disabled={isAdvancing}
                                className={cn(
                                    "w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50",
                                    currentDelivery.status === "assigned"
                                        ? "bg-blue-600 text-white hover:bg-blue-700"
                                        : "bg-emerald-600 text-white hover:bg-emerald-700"
                                )}
                            >
                                {isAdvancing ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : currentDelivery.status === "assigned" ? (
                                    <Bike className="w-4 h-4" />
                                ) : (
                                    <CheckCircle2 className="w-4 h-4" />
                                )}
                                {currentDelivery.status === "assigned" ? "Start Delivery" : "Mark Delivered"}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                        <div
                            className={cn(
                                "w-12 h-12 rounded-full flex items-center justify-center",
                                isAvailable ? "bg-emerald-50" : "bg-gray-100"
                            )}
                        >
                            <Bike
                                className={cn(
                                    "w-6 h-6",
                                    isAvailable ? "text-emerald-500" : "text-gray-400"
                                )}
                            />
                        </div>
                        <div>
                            <p className="text-sm font-medium">
                                {isAvailable ? "Waiting for a delivery" : "You're offline"}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                {isAvailable
                                    ? "You'll be assigned automatically when one comes in."
                                    : "Turn online to start receiving deliveries."}
                            </p>
                        </div>
                    </div>
                )}

                {/* History */}
                {history.length > 0 && (
                    <div className="pt-2">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
                            Recent Deliveries
                        </h3>
                        <div className="rounded-xl border divide-y overflow-hidden">
                            {history.map((entry) => (
                                <div
                                    key={entry.orderId}
                                    className="flex items-center justify-between px-3 py-2.5"
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        {entry.status === "delivered" ? (
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                        ) : (
                                            <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                                        )}
                                        <div className="min-w-0">
                                            <p className="text-xs font-medium truncate">
                                                {entry.orderNumber}
                                            </p>
                                            <p className="text-[11px] text-muted-foreground truncate">
                                                {entry.address}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0 pl-2">
                                        <p className="text-xs tabular-nums font-medium">
                                            {formatCurrency(entry.total)}
                                        </p>
                                        <p className="text-[11px] text-muted-foreground flex items-center gap-1 justify-end">
                                            <Clock className="w-2.5 h-2.5" />
                                            {formatDate(entry.updatedAt)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}