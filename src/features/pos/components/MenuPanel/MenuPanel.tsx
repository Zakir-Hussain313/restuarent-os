"use client";

import { usePosMenu } from "../../hooks/usePosMenu";
import { CategorySidebar } from "./CategorySidebar";
import { MenuSearch } from "./MenuSearch";
import { MenuGrid } from "./MenuGrid";

export function MenuPanel() {
  const {
    categories,
    filteredItems,
    searchQuery,
    selectedCategoryId,
    setSearchQuery,
    setSelectedCategoryId,
    isLoading,
  } = usePosMenu();

  return (
    <div className="flex h-full overflow-hidden">
      {/* Category Sidebar */}
      <div className="w-44 shrink-0 border-r border-border overflow-y-auto">
        <CategorySidebar
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          onSelect={setSelectedCategoryId}
          isLoading={isLoading}
        />
      </div>

      {/* Menu Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-border shrink-0">
          <MenuSearch
            value={searchQuery}
            onChange={setSearchQuery}
            resultCount={filteredItems.length}
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          <MenuGrid
            items={filteredItems}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}