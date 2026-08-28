"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAttendanceForDateAction, markAttendanceAction, endShiftAction } from "@/features/attendance/actions";
import { useAttendanceFilters } from "./AttendanceFilters";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { Attendance } from "@/db/schema/attendance";
import { useCallback, useMemo, useRef } from "react";
import { useBranchChannel } from "@/lib/realtime/useBranchChannel";
import { useAlertModal } from "@/components/providers/AlertModalProvider";

const STATUS_OPTIONS: { value: Attendance["status"]; label: string }[] = [
    { value: "present", label: "Present" },
    { value: "absent", label: "Absent" },
    { value: "late", label: "Late" },
    { value: "leave", label: "Leave" },
    { value: "half_day", label: "Half-day" },
];

const STATUS_STYLES: Record<Attendance["status"], string> = {
    present: "bg-green-600 text-white hover:bg-green-700",
    absent: "bg-red-600 text-white hover:bg-red-700",
    late: "bg-amber-500 text-white hover:bg-amber-600",
    leave: "bg-blue-500 text-white hover:bg-blue-600",
    half_day: "bg-purple-500 text-white hover:bg-purple-600",
};

export function AttendanceTable() {
    const { showAlert, showConfirm } = useAlertModal();
    const { date, branchId, roleFilter } = useAttendanceFilters();
    const queryClient = useQueryClient();
    const queryKey = useMemo(
        () => ["attendance", date, branchId, roleFilter],
        [date, branchId, roleFilter]
    );
    const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

    const { data, isLoading } = useQuery({
        queryKey,
        queryFn: async () => {
            const res = await getAttendanceForDateAction(date, branchId, roleFilter);
            if (res.error) throw new Error(res.error);
            return res.data;
        },
    });

    const onRealtimeEvent = useCallback(() => {
        queryClient.invalidateQueries({ queryKey });
    }, [queryClient, queryKey]);

    useBranchChannel(branchId, "attendance", onRealtimeEvent);

    const mutation = useMutation({
        mutationFn: async ({
            staffId,
            status,
        }: {
            staffId: string;
            status: Attendance["status"];
        }) => {
            const res = await markAttendanceAction(staffId, date, status);
            if (res.error) throw new Error(res.error);
        },
        onError: () => {
            queryClient.invalidateQueries({ queryKey });
        },
    });

    const endShiftMutation = useMutation({
        mutationFn: async (staffId: string) => {
            const res = await endShiftAction(staffId);
            if (res.error) throw new Error(res.error);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
        },
        onError: (err) => {
            showAlert(`Failed to end shift: ${err.message}`, "Error");
        },
    });

    async function handleEndShift(staffId: string, firstName: string, lastName: string) {
        const confirmed = await showConfirm(
            `End shift for ${firstName} ${lastName}? This sets their check-out time to now.`,
            { title: "End shift?", confirmLabel: "End Shift" }
        );
        if (!confirmed) return;
        endShiftMutation.mutate(staffId);
    }

    function handleMark(staffId: string, status: Attendance["status"]) {
        queryClient.setQueryData<typeof data>(queryKey, (old) =>
            old?.map((row) => (row.staffId === staffId ? { ...row, status } : row))
        );

        if (debounceTimers.current[staffId]) {
            clearTimeout(debounceTimers.current[staffId]);
        }
        debounceTimers.current[staffId] = setTimeout(() => {
            mutation.mutate({ staffId, status });
            delete debounceTimers.current[staffId];
        }, 1500);
    }

    if (isLoading) {
        return <div className="text-sm text-muted-foreground">Loading attendance…</div>;
    }

    if (!data || data.length === 0) {
        return <div className="text-sm text-muted-foreground">No data found.</div>;
    }

    return (
        <div className="overflow-x-auto">
        <Table className="w-full">
            <TableHeader>
                <TableRow>
                    <TableHead>Staff</TableHead>
                    <TableHead>Clock In / Out</TableHead>
                    <TableHead>Status</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {data.map((row) => (
                    <TableRow key={row.attendanceId ?? row.staffId}>
                        <TableCell>
                            <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={row.image ?? undefined} />
                                    <AvatarFallback>
                                        {row.firstName[0]}
                                        {row.lastName[0]}
                                    </AvatarFallback>
                                </Avatar>
                                <span>
                                    {row.firstName} {row.lastName}
                                </span>
                                {row.isDeleted && (
                                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive">
                                        Deleted
                                    </span>
                                )}
                            </div>
                        </TableCell>
                        <TableCell>
                            <span className="text-xs text-muted-foreground tabular-nums">
                                {row.checkIn
                                    ? new Date(row.checkIn).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
                                    : "—"}
                                {" – "}
                                {row.checkOut
                                    ? new Date(row.checkOut).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
                                    : row.checkIn
                                        ? "still in"
                                        : "—"}
                            </span>
                        </TableCell>
                        <TableCell>
                            {row.isDeleted ? (
                                <span className="text-xs text-muted-foreground capitalize">
                                    {row.status?.replace("_", " ") ?? "—"}
                                </span>
                            ) : (
                                <div className="flex gap-2 items-center flex-wrap">
                                    {STATUS_OPTIONS.map((opt) => (
                                        <Button
                                            key={opt.value}
                                            size="sm"
                                            variant="outline"
                                            className={cn(row.status === opt.value && STATUS_STYLES[opt.value])}
                                            onClick={() => handleMark(row.staffId, opt.value)}
                                        >
                                            {opt.label}
                                        </Button>
                                    ))}
                                    {row.hasOpenSession && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-muted-foreground hover:text-destructive"
                                            disabled={endShiftMutation.isPending}
                                            onClick={() => handleEndShift(row.staffId, row.firstName, row.lastName)}
                                        >
                                            End Shift
                                        </Button>
                                    )}
                                </div>
                            )}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
        </div>
    );
}