"use client";

import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getBranchDevicesAction, setDeviceStatusAction, deleteDeviceAction } from "@/features/devices/actions";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Trash2 } from "lucide-react";
import { useAttendanceFilters } from "./AttendanceFilters";
import { useAlertModal } from "@/components/providers/AlertModalProvider";
import { useBranchChannel } from "@/lib/realtime/useBranchChannel";

export function DevicesPanel() {
    const { branchId } = useAttendanceFilters();
    const queryClient = useQueryClient();
    const { showAlert, showConfirm } = useAlertModal();
    const queryKey = ["branch-devices", branchId];

    const { data, isLoading } = useQuery({
        queryKey,
        queryFn: async () => {
            const res = await getBranchDevicesAction(branchId);
            if (res.error) throw new Error(res.error);
            return res.data;
        },
    });

    const onRealtimeEvent = useCallback(() => {
        queryClient.invalidateQueries({ queryKey });
    }, [queryClient, branchId]);

    useBranchChannel(branchId, "attendance", onRealtimeEvent);

    const statusMutation = useMutation({
        mutationFn: async ({ deviceId, status }: { deviceId: string; status: "approved" | "rejected" }) => {
            const res = await setDeviceStatusAction(deviceId, status);
            if (res.error) throw new Error(res.error);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
        },
        onError: (err) => {
            showAlert(`Failed to update device: ${err.message}`, "Error");
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (deviceId: string) => {
            const res = await deleteDeviceAction(deviceId);
            if (res.error) throw new Error(res.error);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
        },
        onError: (err) => {
            showAlert(`Failed to delete device: ${err.message}`, "Error");
        },
    });

    async function handleDelete(deviceId: string) {
        const confirmed = await showConfirm(
            "This will permanently remove this device. The user will need to request approval again next time they clock in.",
            { title: "Delete device?" }
        );
        if (confirmed) deleteMutation.mutate(deviceId);
    }

    if (isLoading) {
        return <div className="text-sm text-muted-foreground">Loading devices…</div>;
    }

    if (!data || data.length === 0) {
        return <div className="text-sm text-muted-foreground">No device requests yet.</div>;
    }

    const pending = data.filter((d) => d.status === "pending");
    const approved = data.filter((d) => d.status === "approved");
    const rejected = data.filter((d) => d.status === "rejected");

    const isBusy = statusMutation.isPending || deleteMutation.isPending;

    function ContactLine({ email, phone }: { email: string; phone: string | null }) {
        return (
            <p className="text-xs text-muted-foreground mt-1">
                {email}
                {phone ? ` · ${phone}` : ""}
            </p>
        );
    }

    return (
        <div className="space-y-6">
            {pending.length > 0 && (
                <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Pending approval ({pending.length})
                    </h3>
                    {pending.map((d) => (
                        <div
                            key={d.id}
                            className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3"
                        >
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground">{d.requestedByName}</p>
                                <ContactLine email={d.requestedByEmail} phone={d.requestedByPhone} />
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={isBusy}
                                    onClick={() => statusMutation.mutate({ deviceId: d.id, status: "rejected" })}
                                >
                                    Reject
                                </Button>
                                <Button
                                    size="sm"
                                    disabled={isBusy}
                                    onClick={() => statusMutation.mutate({ deviceId: d.id, status: "approved" })}
                                >
                                    Approve
                                </Button>
                                <button
                                    onClick={() => handleDelete(d.id)}
                                    disabled={isBusy}
                                    className="p-1.5 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                                    aria-label="Delete device"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {approved.length > 0 && (
                <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Approved devices ({approved.length})
                    </h3>
                    {approved.map((d) => (
                        <div
                            key={d.id}
                            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-white px-4 py-3"
                        >
                            <div className="flex items-start gap-3 min-w-0">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-foreground">{d.requestedByName}</p>
                                    <ContactLine email={d.requestedByEmail} phone={d.requestedByPhone} />
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={isBusy}
                                    onClick={() => statusMutation.mutate({ deviceId: d.id, status: "rejected" })}
                                >
                                    Block
                                </Button>
                                <button
                                    onClick={() => handleDelete(d.id)}
                                    disabled={isBusy}
                                    className="p-1.5 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                                    aria-label="Delete device"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {rejected.length > 0 && (
                <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Rejected devices ({rejected.length})
                    </h3>
                    {rejected.map((d) => (
                        <div
                            key={d.id}
                            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3"
                        >
                            <div className="flex items-start gap-3 min-w-0">
                                <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-foreground">{d.requestedByName}</p>
                                    <ContactLine email={d.requestedByEmail} phone={d.requestedByPhone} />
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <Button
                                    size="sm"
                                    disabled={isBusy}
                                    onClick={() => statusMutation.mutate({ deviceId: d.id, status: "approved" })}
                                >
                                    Unblock
                                </Button>
                                <button
                                    onClick={() => handleDelete(d.id)}
                                    disabled={isBusy}
                                    className="p-1.5 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                                    aria-label="Delete device"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}