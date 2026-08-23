"use client";

import type { usePosMenu } from "../../hooks/usePosMenu";
import { CategorySidebar } from "./CategorySidebar";
import { CategoryPills } from "./CategoryPills";
import { MenuSearch } from "./MenuSearch";
import { MenuGrid } from "./MenuGrid";

interface MenuPanelProps {
    menu: ReturnType<typeof usePosMenu>;
    showSidebar: boolean;
    showPills: boolean;
}

export function MenuPanel({ menu, showSidebar, showPills }: MenuPanelProps) {
    const {
        categories,
        filteredItems,
        searchQuery,
        selectedCategoryId,
        setSearchQuery,
        setSelectedCategoryId,
        isLoading,
    } = menu;

    return (
        <div className="flex h-full overflow-hidden">
            {showSidebar && (
                <div className="w-44 shrink-0 border-r border-border overflow-y-auto">
                    <CategorySidebar
                        categories={categories}
                        selectedCategoryId={selectedCategoryId}
                        onSelect={setSelectedCategoryId}
                        isLoading={isLoading}
                    />
                </div>
            )}

            <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                {showPills && (
                    <div className="shrink-0 border-b border-border overflow-x-auto">
                        <CategoryPills
                            categories={categories}
                            selectedCategoryId={selectedCategoryId}
                            onSelect={setSelectedCategoryId}
                            isLoading={isLoading}
                        />
                    </div>
                )}

                <div className="px-4 py-3 border-b border-border shrink-0">
                    <MenuSearch
                        value={searchQuery}
                        onChange={setSearchQuery}
                        resultCount={filteredItems.length}
                    />
                </div>

                <div className="flex-1 overflow-y-auto">
                    <MenuGrid items={filteredItems} isLoading={isLoading} />
                </div>
            </div>
        </div>
    );
}