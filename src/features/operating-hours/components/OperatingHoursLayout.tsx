"use client";

import { useEffect, useState, useCallback } from "react";
import { getOperatingHoursAction, updateOperatingHoursAction } from "@/features/operating-hours/actions";
import { OperatingHoursForm } from "./OperatingHoursForm";
import { Loader2 } from "lucide-react";
import type { OperatingHours } from "@/db/schema/branches";

interface OperatingHoursLayoutProps {
    branchId: string;
}

export function OperatingHoursLayout({ branchId }: OperatingHoursLayoutProps) {
    const [hours, setHours] = useState<OperatingHours | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);

    useEffect(() => {
        let ignore = false;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsLoading(true);
        setError(null);

        getOperatingHoursAction(branchId).then((result) => {
            if (ignore) return;
            if (result.data === null && result.error) {
                setError(result.error);
            } else {
                setHours(result.data);
            }
            setIsLoading(false);
        });

        return () => {
            ignore = true;
        };
    }, [branchId]);

    const handleSave = useCallback(
        async (newHours: OperatingHours) => {
            setIsSaving(true);
            setSaveError(null);

            const result = await updateOperatingHoursAction(branchId, newHours);
            if (!result.success) {
                setSaveError(result.error);
            } else {
                setHours(newHours);
            }
            setIsSaving(false);
        },
        [branchId]
    );

    if (isLoading) {
        return (
            <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-[#8a8680]" />
            </div>
        );
    }

    if (error) {
        return <p className="text-sm text-destructive py-8 text-center">{error}</p>;
    }

    return (
        <div className="space-y-4">
            {saveError && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {saveError}
                </div>
            )}
            <OperatingHoursForm initialHours={hours} isSaving={isSaving} onSave={handleSave} />
        </div>
    );
}