"use client";

import { createContext, useContext, useState } from "react";
import type { Branch } from "@/db/schema";

interface MenuFilterState {
    branchId: string | undefined; // undefined = "All branches" (SUPER_ADMIN only)
    setBranchId: (id: string | undefined) => void;
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

export function MenuFilters({
    isSuperAdmin,
    canManageMenu,
    branches,
    ownBranchId,
    children,
}: MenuFiltersProps) {
    const [branchId, setBranchId] = useState<string | undefined>(ownBranchId);

    return (
        <MenuFilterContext.Provider value={{ branchId, setBranchId, branches, isSuperAdmin, canManageMenu }}>
            {children}
        </MenuFilterContext.Provider>
    );
}