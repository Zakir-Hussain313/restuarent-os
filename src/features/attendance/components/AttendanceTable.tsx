"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAttendanceForDateAction, markAttendanceAction, endShiftAction } from "@/features/attendance/actions";
import { useAttendanceFilters } from "./AttendanceFilters";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { Attendance } from "@/db/schema/attendance";
import { useCallback, useMemo, useRef, useState } from "react";
import { useBranchChannel } from "@/lib/realtime/useBranchChannel";
import { useAlertModal } from "@/components/providers/AlertModalProvider";
import { ConfirmPasswordModal } from "./ConfirmPasswordModal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

const STATUS_DOT: Record<Attendance["status"], string> = {
    present: "bg-green-600",
    absent: "bg-red-600",
    late: "bg-amber-500",
    leave: "bg-blue-500",
    half_day: "bg-purple-500",
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
    const todayStr = new Date().toLocaleDateString("en-CA");
    const isBackfill = date !== todayStr;
    const [pendingMark, setPendingMark] = useState<{ staffId: string; status: Attendance["status"] } | null>(null);
    const [passwordError, setPasswordError] = useState<string | null>(null);

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
            confirmPassword,
        }: {
            staffId: string;
            status: Attendance["status"];
            confirmPassword?: string;
        }) => {
            const res = await markAttendanceAction(staffId, date, status, undefined, undefined, undefined, confirmPassword);
            if (res.error) throw new Error(res.error);
        },
        onSuccess: () => {
            setPendingMark(null);
            setPasswordError(null);
        },
        onError: (err) => {
            queryClient.invalidateQueries({ queryKey });
            if (isBackfill) {
                setPasswordError(err.message);
            } else {
                showAlert(err.message, "Couldn't update attendance");
            }
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
        if (isBackfill) {
            setPasswordError(null);
            setPendingMark({ staffId, status });
            return;
        }

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
        <div>
            <div className="flex flex-col gap-3 lg:hidden">
                {data.map((row) => (
                    <div key={row.attendanceId ?? row.staffId} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                                <Avatar className="h-8 w-8 shrink-0">
                                    <AvatarImage src={row.image ?? undefined} />
                                    <AvatarFallback>{row.firstName[0]}{row.lastName[0]}</AvatarFallback>
                                </Avatar>
                                <span className="truncate text-sm font-medium">{row.firstName} {row.lastName}</span>
                                {row.isDeleted && (
                                    <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive">Deleted</span>
                                )}
                            </div>
                            {!row.isDeleted && row.hasOpenSession && (
                                <Button size="sm" variant="outline" className="shrink-0 text-muted-foreground hover:text-destructive"
                                    disabled={endShiftMutation.isPending}
                                    onClick={() => handleEndShift(row.staffId, row.firstName, row.lastName)}>
                                    End Shift
                                </Button>
                            )}
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2">
                            <span className="text-xs text-muted-foreground tabular-nums">
                                {row.checkIn ? new Date(row.checkIn).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : "—"}
                                {" – "}
                                {row.checkOut ? new Date(row.checkOut).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : row.checkIn ? "still in" : "—"}
                            </span>
                            {row.isDeleted ? (
                                <span className="text-xs text-muted-foreground capitalize">{row.status?.replace("_", " ") ?? "—"}</span>
                            ) : (
                                <Select value={row.status ?? undefined} onValueChange={(v) => handleMark(row.staffId, v as Attendance["status"])}>
                                    <SelectTrigger size="sm" className="w-32.5">
                                        <span className="flex items-center gap-1.5 truncate">
                                            {row.status && <span className={cn("h-2 w-2 shrink-0 rounded-full", STATUS_DOT[row.status])} />}
                                            <SelectValue placeholder="Set status" />
                                        </span>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {STATUS_OPTIONS.map((opt) => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                                <span className="flex items-center gap-1.5">
                                                    <span className={cn("h-2 w-2 rounded-full", STATUS_DOT[opt.value])} />
                                                    {opt.label}
                                                </span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div className="hidden lg:block overflow-x-auto">
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
                            <div className="flex items-center gap-2 min-w-0">
                                <Avatar className="h-8 w-8 shrink-0">
                                    <AvatarImage src={row.image ?? undefined} />
                                    <AvatarFallback>
                                        {row.firstName[0]}
                                        {row.lastName[0]}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="truncate max-w-40 block">
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
        <ConfirmPasswordModal
            open={!!pendingMark}
            description={`Confirm your password to mark attendance for ${date}.`}
            isSubmitting={mutation.isPending}
            error={passwordError}
            onConfirm={(password) => {
                if (!pendingMark) return;
                mutation.mutate({ ...pendingMark, confirmPassword: password });
            }}
            onClose={() => {
                setPendingMark(null);
                setPasswordError(null);
            }}
        />
        </div>
    );
}