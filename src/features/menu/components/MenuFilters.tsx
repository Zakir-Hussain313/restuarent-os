"use client";

import { createContext, useContext, useState } from "react";
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

interface MenuFilterState {
    branchId: string | undefined; // undefined = "All branches" (SUPER_ADMIN only)
    branches: Branch[];
    isSuperAdmin: boolean;
    canManageMenu: boolean; // ADMIN or SUPER_ADMIN — gates Add/Edit/Delete UI (STAFF is read + toggle-status only)
}

const MenuFilterContext = createContext<MenuFilterState | null>(null);

export function useMenuFilters() {
    const ctx = useContext(MenuFilterContext);
    if (!ctx) {
        throw new Error("useMenuFilters must be used within MenuFilters");
    }
    return ctx;
}

interface MenuFiltersProps {
    isSuperAdmin: boolean;
    canManageMenu: boolean;
    branches: Branch[];
    ownBranchId?: string;
    children: React.ReactNode;
}

// Which branch's menu shows on the public marketing homepage. Unrelated to
// the "viewing/editing" branch filter below — kept as a visually separate
// control so the two don't get confused with each other.
function WebsiteBranchSelector({ branches }: { branches: Branch[] }) {
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

    if (activeBranches.length < 2) return null;

    return (
        <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground shrink-0">Website shows:</span>
            <Select
                value={data?.websiteBranchId ?? "auto"}
                disabled={isLoading || isPending}
                onValueChange={(v: string | null) => mutate(!v || v === "auto" ? null : v)}
            >
                <SelectTrigger className="w-55">
                    <SelectValue placeholder="Auto (earliest branch)" />
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

export function MenuFilters({
    isSuperAdmin,
    canManageMenu,
    branches,
    ownBranchId,
    children,
}: MenuFiltersProps) {
    const [branchId, setBranchId] = useState<string | undefined>(ownBranchId);

    return (
        <MenuFilterContext.Provider value={{ branchId, branches, isSuperAdmin, canManageMenu }}>
            {isSuperAdmin && (
                <div className="flex items-center gap-3 mb-6">
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

                    <WebsiteBranchSelector branches={branches} />
                </div>
            )}

            {children}
        </MenuFilterContext.Provider>
    );
}