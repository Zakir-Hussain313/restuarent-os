"use client";

import { createContext, useContext, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import type { Branch } from "@/db/schema";

interface AttendanceFilterState {
    date: string; // "YYYY-MM-DD"
    branchId: string | undefined; // undefined = "All branches" (SUPER_ADMIN only)
}

const AttendanceFilterContext = createContext<AttendanceFilterState | null>(null);

export function useAttendanceFilters() {
    const ctx = useContext(AttendanceFilterContext);
    if (!ctx) {
        throw new Error("useAttendanceFilters must be used within AttendanceFilters");
    }
    return ctx;
}

interface AttendanceFiltersProps {
    isSuperAdmin: boolean;
    branches: Branch[];
    children: React.ReactNode;
}

export function AttendanceFilters({
    isSuperAdmin,
    branches,
    children,
}: AttendanceFiltersProps) {
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [branchId, setBranchId] = useState<string | undefined>(undefined);

    const dateKey = format(selectedDate, "yyyy-MM-dd");

    return (
        <AttendanceFilterContext.Provider value={{ date: dateKey, branchId }}>
            <div className="flex items-center gap-3 mb-6">
                <Popover>
                    <PopoverTrigger
                        render={
                            <Button variant="outline" className="w-50 justify-start text-left font-normal">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {format(selectedDate, "PPP")}
                            </Button>
                        }
                    />
                    <PopoverContent className="w-auto p-0">
                        <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={(d: Date | undefined) => d && setSelectedDate(d)}
                        />
                    </PopoverContent>
                </Popover>

                {isSuperAdmin && (
                    <Select
                        value={branchId ?? "all"}
                        onValueChange={(v: string | null) => setBranchId(!v || v === "all" ? undefined : v)}
                    >
                        <SelectTrigger className="w-55">
                            <SelectValue placeholder="All branches" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All branches</SelectItem>
                            {branches.map((b) => (
                                <SelectItem key={b.id} value={b.id}>
                                    {b.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            </div>

            {children}
        </AttendanceFilterContext.Provider>
    );
}