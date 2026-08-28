"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { useLocationStore } from "@/store/useLocationStore";
import { usePublicBranchInfo } from "@/features/online-ordering/hooks/useOnlineOrdering";
import { LocationPickerModal } from "@/features/online-ordering/components/LocationPickerModal";
import { BookingModal } from "@/features/reservations/components/BookingModal";
import { getPublicTablesAction } from "@/features/tables/public-actions";
import type { Table } from "@/types/table";
import { BranchSwitcher } from "@/features/online-ordering/components/BranchSwitcher";

const TableFloorPlan = dynamic(
  () => import("@/features/tables/components/TableFloorPlan").then((mod) => mod.TableFloorPlan),
  { ssr: false, loading: () => <div className="h-64 animate-pulse rounded-xl bg-muted" /> }
);

export default function TablesPage() {
    const location = useLocationStore((s) => s.location);
    const { branchInfo, isLoading: branchInfoLoading } = usePublicBranchInfo();

    const resolvedBranchId =
        branchInfo?.branchCount === 1
            ? branchInfo.singleBranch?.id
            : location?.branchId;

    const needsLocationPicker =
        !branchInfoLoading && branchInfo && branchInfo.branchCount >= 2 && !location;

    const [tables, setTables] = useState<Table[]>([]);
    const [tablesLoading, setTablesLoading] = useState(false);
    const [tablesError, setTablesError] = useState<string | null>(null);
    const [selectedTable, setSelectedTable] = useState<Table | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);

    // Effect owns its own state-setting directly (per React's data-fetching
    // pattern) — the fetch call itself stays a pure, stateless function so
    // nothing sets state indirectly through it.
    useEffect(() => {
        if (!resolvedBranchId) return;
        let ignore = false;

        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTablesLoading(true);
        setTablesError(null);

        getPublicTablesAction(resolvedBranchId).then((result) => {
            if (ignore) return;
            if (result.data === null) {
                setTablesError(result.error);
            } else {
                setTables(result.data);
            }
            setTablesLoading(false);
        });

        return () => {
            ignore = true;
        };
    }, [resolvedBranchId, reloadKey]);

    // Booking a table should refresh availability — bump reloadKey to
    // re-trigger the effect above rather than exposing a separate function
    // that itself calls setState.
    const handleBooked = useCallback(() => {
        setReloadKey((k) => k + 1);
    }, []);

    function handleTableClick(table: Table) {
        setSelectedTable(table);
        setModalOpen(true);
    }

    if (branchInfoLoading) {
        return (
            <div className="min-h-screen bg-[#faf9f7] pt-16 flex items-center justify-center">
                <p className="text-sm text-[#8a8680]">Loading…</p>
            </div>
        );
    }

    if (branchInfo === undefined) {
        return (
            <div className="min-h-screen bg-[#faf9f7] pt-16 flex items-center justify-center">
                <p className="text-sm text-[#8a8680]">
                    Table booking isn&apos;t available right now.
                </p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#faf9f7] pt-16">
            {needsLocationPicker && <LocationPickerModal mode="dineIn" />}

            <div className="bg-[#1a1815] py-10">
                <div className="max-w-6xl mx-auto px-4 sm:px-6">
                    <p className="text-xs font-semibold uppercase tracking-widest text-[#e8570e] mb-2">
                        Book a Table
                    </p>
                    <h1 className="text-3xl font-bold text-white">Reserve your spot</h1>
                    <p className="text-white/50 text-sm mt-1">
                        Pick an available table below.
                    </p>
                </div>
            </div>

            <BranchSwitcher mode="dineIn" />

            {!needsLocationPicker && resolvedBranchId && (
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
                    {tablesLoading ? (
                        <div className="text-center py-16 text-[#8a8680]">
                            <p className="text-sm">Loading tables…</p>
                        </div>
                    ) : tablesError ? (
                        <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive max-w-md mx-auto">
                            {tablesError}
                        </div>
                    ) : (
                        <TableFloorPlan
                            tables={tables}
                            onTableClick={handleTableClick}
                            isClickable={(t) => t.status !== "out_of_service"}
                        />
                    )}
                </div>
            )}

            <BookingModal
                open={modalOpen}
                onOpenChange={setModalOpen}
                table={selectedTable}
                onBooked={handleBooked}
            />
        </div>
    );
}