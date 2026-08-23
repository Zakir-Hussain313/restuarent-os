"use client";

import { ReservationsTab } from "@/features/reservations/components/ReservationsTab";
import { TablesTab } from "@/features/tables/components/TablesTab";
import type { Table } from "@/types/table";
import type { TableReservation, TableSection } from "@/db/schema";
import { useBranchChannel } from "@/lib/realtime/useBranchChannel";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";

interface TablesPageClientProps {
    reservations: TableReservation[];
    reservationsError?: string;
    tables: Table[];
    tablesError?: string;
    sections: TableSection[];
    sectionsError?: string;
    branchId?: string;
    canManageCrud: boolean;
}

export function TablesPageClient({
    reservations,
    reservationsError,
    tables,
    tablesError,
    sections,
    sectionsError,
    branchId,
    canManageCrud,
}: TablesPageClientProps) {
        const router = useRouter();
    const [activeTab, setActiveTab] = useState<"reservations" | "tables">("reservations");
    const onRealtimeEvent = useCallback(() => {
        router.refresh();
    }, [router]);
    useBranchChannel(branchId, "tables", onRealtimeEvent);

    const TABS = [
        { value: "reservations" as const, label: "Reservations" },
        { value: "tables" as const, label: "Tables" },
    ];

    return (
        <div className="flex flex-col gap-4">
            <div className="border-b flex gap-1">
                {TABS.map((tab) => (
                    <button
                        key={tab.value}
                        type="button"
                        onClick={() => setActiveTab(tab.value)}
                        className={cn(
                            "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                            activeTab === tab.value
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === "reservations" && (
                reservationsError ? (
                    <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                        {reservationsError}
                    </div>
                ) : (
                    <ReservationsTab reservations={reservations} tables={tables} />
                )
            )}

            {activeTab === "tables" && (
                tablesError || sectionsError ? (
                    <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                        {tablesError ?? sectionsError}
                    </div>
                ) : (
                    <TablesTab
                        tables={tables}
                        sections={sections}
                        branchId={branchId}
                        canManageCrud={canManageCrud}
                    />
                )
            )}
        </div>
    );
}