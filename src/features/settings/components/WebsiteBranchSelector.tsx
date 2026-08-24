"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { queryKeys } from "@/hooks/useMockQuery";
import {
    getWebsiteBranchSettingAction,
    setWebsiteBranchSettingAction,
} from "@/features/website/actions";
import type { Branch } from "@/db/schema";

// Which branch's menu shows on the public marketing homepage.
export function WebsiteBranchSelector({ branches }: { branches: Branch[] }) {
    const queryClient = useQueryClient();
    const activeBranches = branches.filter((b) => b.isActive);

    const { data, isLoading } = useQuery({
        queryKey: queryKeys.website.branchSetting,
        queryFn: async () => {
            const res = await getWebsiteBranchSettingAction();
            if (res.data === null) throw new Error(res.error);
            return res.data;
        },
    });

    const { mutate, isPending } = useMutation({
        mutationFn: async (branchId: string | null) => {
            const res = await setWebsiteBranchSettingAction(branchId);
            if (!res.success) throw new Error(res.error);
            return branchId;
        },
        onSuccess: (branchId) => {
            queryClient.setQueryData(queryKeys.website.branchSetting, { websiteBranchId: branchId });
        },
    });

    if (activeBranches.length < 2) {
        return (
            <p className="text-sm text-muted-foreground">
                Add a second branch to choose which one shows on your public website.
            </p>
        );
    }

    return (
        <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground shrink-0">Website shows:</span>
            <Select
                value={data?.websiteBranchId ?? "auto"}
                disabled={isLoading || isPending}
                onValueChange={(v: string | null) => mutate(!v || v === "auto" ? null : v)}
            >
                <SelectTrigger className="w-55">
                    <SelectValue placeholder="Auto (earliest branch)">
                        {(value: string) =>
                            value === "auto" ? "Auto (earliest branch)" : activeBranches.find((b) => b.id === value)?.name ?? "Auto (earliest branch)"
                        }
                    </SelectValue>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="auto">Auto (earliest branch)</SelectItem>
                    {activeBranches.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                            {b.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}