"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ReservationsTab } from "@/features/reservations/components/ReservationsTab";
import { TablesTab } from "@/features/tables/components/TablesTab";
import type { Table } from "@/types/table";
import type { TableReservation, TableSection } from "@/db/schema";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { branchChannel } from "@/lib/realtime/channels";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

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

    useEffect(() => {
        if (!branchId) return;

        const supabase = getSupabaseBrowserClient();
        const channel = supabase
            .channel(branchChannel(branchId, "tables"))
            .on("broadcast", { event: "changed" }, () => {
                router.refresh();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [branchId, router]);

    return (
        <Tabs defaultValue="reservations" className="flex flex-col gap-4">
            <TabsList variant="line" className="border-b w-full justify-start h-auto p-0 gap-1">
                <TabsTrigger
                    value="reservations"
                    className="flex-none rounded-none border-b-2 border-transparent px-4 py-2 text-[#8a8680] data-active:border-[#1a1814] data-active:text-[#1a1814] data-active:bg-transparent data-active:shadow-none after:hidden"
                >
                    Reservations
                </TabsTrigger>
                <TabsTrigger
                    value="tables"
                    className="flex-none rounded-none border-b-2 border-transparent px-4 py-2 text-[#8a8680] data-active:border-[#1a1814] data-active:text-[#1a1814] data-active:bg-transparent data-active:shadow-none after:hidden"
                >
                    Tables
                </TabsTrigger>
            </TabsList>

            <TabsContent value="reservations">
                {reservationsError ? (
                    <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                        {reservationsError}
                    </div>
                ) : (
                    <ReservationsTab reservations={reservations} tables={tables} />
                )}
            </TabsContent>

            <TabsContent value="tables">
                {tablesError || sectionsError ? (
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
                )}
            </TabsContent>
        </Tabs>
    );
}