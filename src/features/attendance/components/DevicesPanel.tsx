"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getBranchDevicesAction, approveDeviceAction } from "@/features/devices/actions";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { useAttendanceFilters } from "./AttendanceFilters";
import { useAlertModal } from "@/components/providers/AlertModalProvider";

export function DevicesPanel() {
    const { branchId } = useAttendanceFilters();
    const queryClient = useQueryClient();
    const { showAlert } = useAlertModal();
    const queryKey = ["branch-devices", branchId];

    const { data, isLoading } = useQuery({
        queryKey,
        queryFn: async () => {
            const res = await getBranchDevicesAction(branchId);
            if (res.error) throw new Error(res.error);
            return res.data;
        },
    });

    const approveMutation = useMutation({
        mutationFn: async (deviceId: string) => {
            const res = await approveDeviceAction(deviceId);
            if (res.error) throw new Error(res.error);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
        },
        onError: (err) => {
            showAlert(`Failed to approve device: ${err.message}`, "Error");
        },
    });

    if (isLoading) {
        return <div className="text-sm text-muted-foreground">Loading devices…</div>;
    }

    if (!data || data.length === 0) {
        return <div className="text-sm text-muted-foreground">No device requests yet.</div>;
    }

    const pending = data.filter((d) => d.status === "pending");
    const approved = data.filter((d) => d.status === "approved");

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
                                <p className="text-sm font-medium text-foreground">
                                    Requested by {d.requestedByName}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {new Date(d.createdAt).toLocaleString()}
                                </p>
                            </div>
                            <Button
                                size="sm"
                                disabled={approveMutation.isPending}
                                onClick={() => approveMutation.mutate(d.id)}
                            >
                                Approve
                            </Button>
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
                            className="flex items-center gap-3 rounded-xl border border-border bg-white px-4 py-3"
                        >
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground">
                                    Requested by {d.requestedByName}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Approved {d.approvedAt ? new Date(d.approvedAt).toLocaleString() : ""}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}