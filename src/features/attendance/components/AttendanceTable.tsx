"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAttendanceForDateAction, markAttendanceAction } from "@/features/attendance/actions";
import { useAttendanceFilters } from "./AttendanceFilters";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { Attendance } from "@/db/schema/attendance";
import { useRef } from "react";

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
    const { date, branchId } = useAttendanceFilters();
    const queryClient = useQueryClient();
    const queryKey = ["attendance", date, branchId];
    const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

    const { data, isLoading } = useQuery({
        queryKey,
        queryFn: async () => {
            const res = await getAttendanceForDateAction(date, branchId);
            if (res.error) throw new Error(res.error);
            return res.data;
        },
    });

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
        return <div className="text-sm text-muted-foreground">No staff found for this branch.</div>;
    }

    return (
        <Table className="w-full">
            <TableHeader>
                <TableRow>
                    <TableHead>Staff</TableHead>
                    <TableHead>Status</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {data.map((row) => (
                    <TableRow key={row.staffId}>
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
                            </div>
                        </TableCell>
                        <TableCell>
                            <div className="flex gap-2">
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
                            </div>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}