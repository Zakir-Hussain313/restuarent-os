"use client";

import { useCallback, useState } from "react";
import { MenuStatsBar } from "./MenuStatsBar";
import { CategorySidebar } from "./CategorySidebar/CategorySidebar";
import { ItemsPanel } from "./ItemsPanel/ItemsPanel";
import { CategoryFormModal } from "./Modals/CategoryFormModal";
import { ItemFormModal } from "./Modals/ItemFormModal";
import { useMenu } from "../hooks/useMenu";
import { useMenuActions } from "../hooks/useMenuActions";
import type { MenuCategory, MenuItem } from "@/types";

// ─── Modal State Shapes ───────────────────────────────────────────────────────

interface CategoryModalState {
  isOpen: boolean;
  category: MenuCategory | null;
}

interface ItemModalState {
  isOpen: boolean;
  item: MenuItem | null;
}

const CLOSED_CAT: CategoryModalState = { isOpen: false, category: null };
const CLOSED_ITEM: ItemModalState = { isOpen: false, item: null };

// ─── Component ────────────────────────────────────────────────────────────────

export function MenuLayout() {
  // ── Data hooks ─────────────────────────────────────────────────────────────
  const {
    categories,
    items,
    itemsByCategory,
    selectedCategoryId,
    setSelectedCategoryId,
    isLoading,
    toggleItemStatus,
    isToggling,
    toggleCategoryActive,
    isTogglingCategory,
  } = useMenu();

  const {
    addCategory, isAddingCategory,
    editCategory, isEditingCategory,
    deleteCategory,
    addItem, isAddingItem,
    editItem, isEditingItem,
    deleteItem,
  } = useMenuActions();

  // ── Modal state ────────────────────────────────────────────────────────────
  const [categoryModal, setCategoryModal] = useState<CategoryModalState>(CLOSED_CAT);
  const [itemModal, setItemModal] = useState<ItemModalState>(CLOSED_ITEM);

  // ── Category modal callbacks ───────────────────────────────────────────────
  const openAddCategory = useCallback(() => setCategoryModal({ isOpen: true, category: null }), []);
  const openEditCategory = useCallback((cat: MenuCategory) => setCategoryModal({ isOpen: true, category: cat }), []);
  const closeCategoryModal = useCallback(() => setCategoryModal(CLOSED_CAT), []);

  // ── Item modal callbacks ───────────────────────────────────────────────────
  const openAddItem = useCallback(() => setItemModal({ isOpen: true, item: null }), []);
  const openEditItem = useCallback((item: MenuItem) => setItemModal({ isOpen: true, item }), []);
  const closeItemModal = useCallback(() => setItemModal(CLOSED_ITEM), []);

  // ── Derived ────────────────────────────────────────────────────────────────
  const selectedCategory: MenuCategory | null =
    selectedCategoryId === null
      ? null
      : (categories.find((c) => c.id === selectedCategoryId) ?? null);

  const visibleItems: MenuItem[] =
    selectedCategoryId === null ? items : itemsByCategory(selectedCategoryId);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="flex h-full flex-col min-h-0">
        <MenuStatsBar
          categories={categories}
          items={items}
        />

        <div className="flex flex-1 min-h-0">
          <CategorySidebar
            categories={categories}
            items={items}
            selectedCategoryId={selectedCategoryId}
            isLoading={isLoading}
            isTogglingCategory={isTogglingCategory}
            onSelectCategory={setSelectedCategoryId}
            onAddCategory={openAddCategory}
            onEditCategory={openEditCategory}
            onDeleteCategory={(cat) => deleteCategory(cat.id)}
            onToggleActive={toggleCategoryActive}
          />
          <div className="flex-1 min-h-0 overflow-hidden">
            <ItemsPanel
              items={visibleItems}
              selectedCategory={selectedCategory}
              isLoading={isLoading}
              isToggling={isToggling}
              onAddItem={openAddItem}
              onEditItem={openEditItem}
              onDeleteItem={(item) => deleteItem(item.id)}
              onToggleStatus={toggleItemStatus}
            />
          </div>
        </div>
      </div>

      <CategoryFormModal
        isOpen={categoryModal.isOpen}
        category={categoryModal.category}
        isLoading={isAddingCategory || isEditingCategory}
        onClose={closeCategoryModal}
        onSubmit={(values) => {
          if (categoryModal.category) {
            editCategory(
              { id: categoryModal.category.id, input: values },
              { onSuccess: closeCategoryModal }
            );
          } else {
            addCategory(values, { onSuccess: closeCategoryModal });
          }
        }}
      />

      <ItemFormModal
        isOpen={itemModal.isOpen}
        item={itemModal.item}
        categories={categories}
        isLoading={isAddingItem || isEditingItem}
        onClose={closeItemModal}
        onSubmit={(values) => {
          if (itemModal.item) {
            editItem(
              { id: itemModal.item.id, input: values as any },
              { onSuccess: closeItemModal }
            );
          } else {
            addItem(values as any, { onSuccess: closeItemModal });
          }
        }}
      />
    </>
  );
}