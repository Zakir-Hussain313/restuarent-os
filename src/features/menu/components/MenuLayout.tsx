"use client";

import { useCallback, useState } from "react";
import { MenuStatsBar } from "./MenuStatsBar";
import { CategorySidebar } from "./CategorySidebar/CategorySidebar";
import { ItemsPanel } from "./ItemsPanel/ItemsPanel";
import { CategoryFormModal } from "./Modals/CategoryFormModal";
import { ItemFormModal } from "./Modals/ItemFormModal";
import { useMenu } from "../hooks/useMenu";
import { useMenuActions } from "../hooks/useMenuActions";
import { useMenuFilters } from "./MenuFilters";
import type { MenuCategory, MenuItem } from "@/types";
import type { ItemFormInput } from "@/features/menu/actions";

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
  // ── Filter/permission context ─────────────────────────────────────────────
  const { branchId, canManageMenu, isSuperAdmin } = useMenuFilters();

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
  } = useMenu(branchId);

  const {
    addCategory, isAddingCategory,
    editCategory, isEditingCategory,
    deleteCategory,
    addItem, isAddingItem,
    editItem, isEditingItem,
    deleteItem,
  } = useMenuActions(branchId);

  // ── Modal state ────────────────────────────────────────────────────────────
  const [categoryModal, setCategoryModal] = useState<CategoryModalState>(CLOSED_CAT);
  const [itemModal, setItemModal] = useState<ItemModalState>(CLOSED_ITEM);

  // ── Category modal callbacks ───────────────────────────────────────────────
  const openAddCategory = useCallback(() => {
    if (isSuperAdmin && branchId === undefined) {
      alert("Please select a specific branch before adding a category.");
      return;
    }
    setCategoryModal({ isOpen: true, category: null });
  }, [isSuperAdmin, branchId]);
  const openEditCategory = useCallback((cat: MenuCategory) => setCategoryModal({ isOpen: true, category: cat }), []);
  const closeCategoryModal = useCallback(() => setCategoryModal(CLOSED_CAT), []);

  // ── Item modal callbacks ───────────────────────────────────────────────────
  const openAddItem = useCallback(() => {
    if (isSuperAdmin && branchId === undefined) {
      alert("Please select a specific branch before adding an item.");
      return;
    }
    setItemModal({ isOpen: true, item: null });
  }, [isSuperAdmin, branchId]);
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
            canManage={canManageMenu}
            onSelectCategory={setSelectedCategoryId}
            onAddCategory={openAddCategory}
            onEditCategory={openEditCategory}
            onDeleteCategory={(cat) =>
              deleteCategory(cat.id, {
                onError: (err) => alert(`Failed to delete category: ${err.message}`),
              })
            }
            onToggleActive={toggleCategoryActive}
          />
          <div className="flex-1 min-h-0 overflow-hidden">
            <ItemsPanel
              items={visibleItems}
              selectedCategory={selectedCategory}
              isLoading={isLoading}
              isToggling={isToggling}
              canManage={canManageMenu}
              onAddItem={openAddItem}
              onEditItem={openEditItem}
              onDeleteItem={(item) =>
                deleteItem(item.id, {
                  onError: (err) => alert(`Failed to delete item: ${err.message}`),
                })
              }
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
              {
                onSuccess: closeCategoryModal,
                onError: (err) => alert(`Failed to save category: ${err.message}`),
              }
            );
          } else {
            addCategory(values, {
              onSuccess: closeCategoryModal,
              onError: (err) => alert(`Failed to add category: ${err.message}`),
            });
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
          const input: ItemFormInput = {
            ...values,
            description: itemModal.item?.description ?? "",
          };

          if (itemModal.item) {
            editItem(
              { id: itemModal.item.id, input },
              {
                onSuccess: closeItemModal,
                onError: (err) => alert(`Failed to save item: ${err.message}`),
              }
            );
          } else {
            addItem(input, {
              onSuccess: closeItemModal,
              onError: (err) => alert(`Failed to add item: ${err.message}`),
            });
          }
        }}
      />
    </>
  );
}