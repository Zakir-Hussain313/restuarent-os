"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { AttendanceTable } from "./AttendanceTable";
import { DevicesPanel } from "./DevicesPanel";
import { ScannerPanel } from "./ScannerPanel";
import { useAttendanceFilters } from "./AttendanceFilters";
import { getBranchAttendanceMethodAction } from "@/features/devices/actions";

type Tab = "attendance" | "devices" | "scanner";

export function AttendanceTabs() {
    const [tab, setTab] = useState<Tab>("attendance");
    const { branchId } = useAttendanceFilters();

    // Determines whether this branch uses the old browser self-service
    // approval flow ("Devices") or has moved to a fingerprint scanner
    // ("Scanner") — the two are mutually exclusive in the UI, though
    // both write to the same attendance table underneath.
    const { data } = useQuery({
        queryKey: ["branch-attendance-method", branchId],
        queryFn: async () => {
            const res = await getBranchAttendanceMethodAction(branchId);
            if (res.error) throw new Error(res.error);
            return res.data;
        },
    });
    const hasApprovedScanner = data?.hasApprovedScanner ?? false;
    const secondTab: Tab = hasApprovedScanner ? "scanner" : "devices";

    const tabs: { key: Tab; label: string }[] = [
        { key: "attendance", label: "Attendance" },
        { key: secondTab, label: secondTab === "scanner" ? "Scanner" : "Devices" },
    ];

    const activeTab = tab === "devices" && secondTab === "scanner" ? "scanner" : tab === "scanner" && secondTab === "devices" ? "devices" : tab;

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-1 border-b">
                {tabs.map((t) => (
                    <button
                        key={t.key}
                        type="button"
                        onClick={() => setTab(t.key)}
                        className={cn(
                            "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                            activeTab === t.key
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {activeTab === "attendance" ? <AttendanceTable /> : activeTab === "scanner" ? <ScannerPanel /> : <DevicesPanel />}
        </div>
    );
}