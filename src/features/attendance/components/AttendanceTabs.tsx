"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { AttendanceTable } from "./AttendanceTable";
import { DevicesPanel } from "./DevicesPanel";

type Tab = "attendance" | "devices";

export function AttendanceTabs() {
    const [tab, setTab] = useState<Tab>("attendance");

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-1 border-b">
                {(["attendance", "devices"] as const).map((t) => (
                    <button
                        key={t}
                        type="button"
                        onClick={() => setTab(t)}
                        className={cn(
                            "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors capitalize",
                            tab === t
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {t}
                    </button>
                ))}
            </div>

            {tab === "attendance" ? <AttendanceTable /> : <DevicesPanel />}
        </div>
    );
}