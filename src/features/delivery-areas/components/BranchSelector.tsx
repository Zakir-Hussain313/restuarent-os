// src/features/delivery-areas/components/BranchSelector.tsx
"use client";

import { useEffect, useState } from "react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { getBranchesAction } from "@/features/staff/actions";
import type { Branch } from "@/db/schema";

interface BranchSelectorProps {
    value: string;
    onChange: (branchId: string) => void;
}

export function BranchSelector({ value, onChange }: BranchSelectorProps) {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        getBranchesAction().then((res) => {
            if (cancelled) return;
            setBranches(res.branches);
            setIsLoading(false);

            // Default to the first branch if nothing is selected yet.
            if (!value && res.branches.length > 0) {
                onChange(res.branches[0].id);
            }
        });

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (isLoading) {
        return (
            <Select value={value} disabled>
                <SelectTrigger className="sm:w-56">
                    <SelectValue placeholder="Loading branches..." />
                </SelectTrigger>
            </Select>
        );
    }

    return (
        <Select value={value} onValueChange={(v) => onChange(v ?? "")}>
            <SelectTrigger className="sm:w-56">
                <SelectValue placeholder="Select a branch">
                    {(v: string) => branches.find((b) => b.id === v)?.name ?? "Select a branch"}
                </SelectValue>
            </SelectTrigger>
            <SelectContent>
                {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                        {b.name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}