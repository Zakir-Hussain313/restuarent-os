"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    deactivateBranchAction,
    bulkReassignStaffAction,
} from "@/features/branches/actions";
import type { Branch, Staff } from "@/db/schema";

interface BranchDeactivateDialogProps {
    branch: Branch;
    otherBranches: Branch[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function BranchDeactivateDialog({
    branch,
    otherBranches,
    open,
    onOpenChange,
}: BranchDeactivateDialogProps) {
    const router = useRouter();
    const [isChecking, setIsChecking] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeStaff, setActiveStaff] = useState<Staff[] | null>(null);
    const [reassignTo, setReassignTo] = useState<Record<string, string>>({});

    const checkStatus = useCallback(async () => {
        setIsChecking(true);
        setError(null);
        setActiveStaff(null);
        setReassignTo({});
        try {
            const result = await deactivateBranchAction(branch.id);
            if ("error" in result && result.error) {
                setError(result.error);
                setActiveStaff(null);
            } else if ("requiresConfirmation" in result && result.requiresConfirmation) {
                setActiveStaff(result.activeStaff);
            } else {
                setActiveStaff([]);
            }
        } catch {
            setError("Something went wrong. Please try again.");
        } finally {
            setIsChecking(false);
        }
    }, [branch.id]);

    useEffect(() => {
        if (open) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            checkStatus();
        }
    }, [open, checkStatus]);

    async function handleReassignAndContinue() {
        if (!activeStaff) return;
        const staffIds = activeStaff
            .filter((s) => reassignTo[s.id])
            .map((s) => s.id);

        if (staffIds.length !== activeStaff.length) {
            setError("Select a destination branch for every staff member listed.");
            return;
        }

        // Group by destination branch since bulkReassignStaffAction takes one target at a time
        const groups = new Map<string, string[]>();
        for (const s of activeStaff) {
            const dest = reassignTo[s.id];
            groups.set(dest, [...(groups.get(dest) ?? []), s.id]);
        }

        setIsSubmitting(true);
        setError(null);
        try {
            for (const [newBranchId, ids] of groups) {
                const result = await bulkReassignStaffAction({ staffIds: ids, newBranchId });
                if (result.error) {
                    setError(result.error);
                    setIsSubmitting(false);
                    return;
                }
            }
            await checkStatus();
        } catch {
            setError("Something went wrong. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleConfirmDeactivate() {
        setIsSubmitting(true);
        setError(null);
        try {
            const result = await deactivateBranchAction(branch.id, { force: true });
            if (result.error) {
                setError(result.error);
                return;
            }
            onOpenChange(false);
            router.refresh();
        } catch {
            setError("Something went wrong. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    }

    const hasActiveStaff = (activeStaff?.length ?? 0) > 0;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col p-0">
                <DialogHeader className="px-5 pt-5">
                    <DialogTitle>Deactivate {branch.name}?</DialogTitle>
                    <DialogDescription>
                        {isChecking
                            ? "Checking staff assigned to this branch..."
                            : hasActiveStaff
                                ? "The staff below are still active at this branch. Reassign them before deactivating."
                                : "This branch will no longer be available for new orders or staff assignments."}
                    </DialogDescription>
                </DialogHeader>

                <div className="overflow-y-auto overflow-x-hidden themed-scrollbar rounded-b-2xl px-5 pt-2 pb-2 space-y-4">

                {error && (
                    <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                        {error}
                    </div>
                )}

                {isChecking ? (
                    <div className="py-6 text-center text-sm text-muted-foreground">Loading...</div>
                ) : hasActiveStaff ? (
                    <div className="space-y-3">
                        {activeStaff!.map((s) => (
                            <div key={s.id} className="flex items-center justify-between gap-3">
                                <span className="text-sm text-foreground">
                                    {s.firstName} {s.lastName}
                                </span>
                                <Select
                                    value={reassignTo[s.id] ?? ""}
                                    onValueChange={(value) =>
                                        setReassignTo((r) => ({ ...r, [s.id]: value ?? "" }))
                                    }
                                    disabled={isSubmitting}
                                >
                                    <SelectTrigger className="w-48">
                                        <SelectValue placeholder="Move to..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {otherBranches.map((b) => (
                                            <SelectItem key={b.id} value={b.id}>
                                                {b.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        ))}
                    </div>
                ) : null}

                </div>

                <DialogFooter className="mx-5 mb-5 rounded-xl">
                    {hasActiveStaff ? (
                        <Button
                            className="w-full"
                            disabled={isSubmitting || isChecking}
                            onClick={handleReassignAndContinue}
                        >
                            {isSubmitting ? "Reassigning..." : "Reassign & Continue"}
                        </Button>
                    ) : (
                        <Button
                            variant="destructive"
                            className="w-full"
                            disabled={isSubmitting || isChecking}
                            onClick={handleConfirmDeactivate}
                        >
                            {isSubmitting ? "Deactivating..." : "Deactivate"}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}