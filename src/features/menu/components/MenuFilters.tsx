"use client";

import { createContext, useContext, useState } from "react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
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
    children: React.ReactNode;
}

export function MenuFilters({
    isSuperAdmin,
    canManageMenu,
    branches,
    children,
}: MenuFiltersProps) {
    const [branchId, setBranchId] = useState<string | undefined>(undefined);

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
                </div>
            )}

            {children}
        </MenuFilterContext.Provider>
    );
}