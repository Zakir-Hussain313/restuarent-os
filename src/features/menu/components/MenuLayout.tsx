"use client";

import { useCallback, useState } from "react";
import { MenuStatsBar } from "./MenuStatsBar";
import { CategorySidebar } from "./CategorySidebar/CategorySidebar";
import { ItemsPanel } from "./ItemsPanel/ItemsPanel";
import { CategoryFormModal } from "./Modals/CategoryFormModal";
import { ItemFormModal } from "./Modals/ItemFormModal";
import { useMenu } from "../hooks/useMenu";
import { useMenuActions } from "../hooks/useMenuActions";
import { uploadEntityImage } from "@/features/uploads/actions";
import { useMenuFilters } from "./MenuFilters";
import type { MenuCategory, MenuItem } from "@/types";
import type { ItemFormInput } from "@/features/menu/actions";
import { useAlertModal } from "@/components/providers/AlertModalProvider";

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
  const { showAlert } = useAlertModal();
  
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
    toggleItemFeatured,
    isTogglingFeatured,
  } = useMenu(branchId);

  const {
    addCategory, isAddingCategory,
    editCategory, isEditingCategory,
    deleteCategory,
    addItemAsync, isAddingItem,
    editItemAsync, isEditingItem,
    deleteItem,
  } = useMenuActions(branchId);

  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // ── Modal state ────────────────────────────────────────────────────────────
  const [categoryModal, setCategoryModal] = useState<CategoryModalState>(CLOSED_CAT);
  const [itemModal, setItemModal] = useState<ItemModalState>(CLOSED_ITEM);

  // ── Category modal callbacks ───────────────────────────────────────────────
  const openAddCategory = useCallback(() => {
    if (isSuperAdmin && branchId === undefined) {
      showAlert("Please select a specific branch before adding a category.");
      return;
    }
    setCategoryModal({ isOpen: true, category: null });
  }, [isSuperAdmin, branchId , showAlert]);
  const openEditCategory = useCallback((cat: MenuCategory) => setCategoryModal({ isOpen: true, category: cat }), []);
  const closeCategoryModal = useCallback(() => setCategoryModal(CLOSED_CAT), []);

  // ── Item modal callbacks ───────────────────────────────────────────────────
  const openAddItem = useCallback(() => {
    if (isSuperAdmin && branchId === undefined) {
      showAlert("Please select a specific branch before adding an item.");
      return;
    }
    setItemModal({ isOpen: true, item: null });
  }, [isSuperAdmin, branchId , showAlert]);
  const openEditItem = useCallback((item: MenuItem) => setItemModal({ isOpen: true, item }), []);
  const closeItemModal = useCallback(() => setItemModal(CLOSED_ITEM), []);

  async function uploadItemImage(itemId: string, file: File): Promise<string> {
    const fd = new FormData();
    fd.set("entityType", "menu_item");
    fd.set("entityId", itemId);
    fd.set("file", file);
    const result = await uploadEntityImage(fd);
    if (result.error || !result.url) {
      throw new Error(result.error ?? "Image upload failed.");
    }
    return result.url;
  }

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

        <div className="flex flex-col lg:flex-row flex-1 min-h-0">
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
                onError: (err) => showAlert(`Failed to delete category: ${err.message}`),
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
              isTogglingFeatured={isTogglingFeatured}
              canManage={canManageMenu}
              onAddItem={openAddItem}
              onEditItem={openEditItem}
              onDeleteItem={(item) =>
                deleteItem(item.id, {
                  onError: (err) => showAlert(`Failed to delete item: ${err.message}`),
                })
              }
              onToggleStatus={toggleItemStatus}
              onToggleFeatured={toggleItemFeatured}
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
                onError: (err) => showAlert(`Failed to save category: ${err.message}`),
              }
            );
          } else {
            addCategory(values, {
              onSuccess: closeCategoryModal,
              onError: (err) => showAlert(`Failed to add category: ${err.message}`),
            });
          }
        }}
      />

      <ItemFormModal
        key={`${itemModal.isOpen}-${itemModal.item?.id ?? "new"}`}
        isOpen={itemModal.isOpen}
        item={itemModal.item}
        categories={categories}
        isLoading={isAddingItem || isEditingItem || isUploadingImage}
        onClose={closeItemModal}
        onSubmit={async (values, imageFile) => {
          const input: ItemFormInput = {
            ...values,
            description: itemModal.item?.description ?? "",
          };

          try {
            if (itemModal.item) {
              // Edit mode: the item's ID already exists, so we can upload
              // first (if a new photo was picked) and save everything in one go.
              let image: string | undefined;
              if (imageFile) {
                setIsUploadingImage(true);
                image = await uploadItemImage(itemModal.item.id, imageFile);
                setIsUploadingImage(false);
              }
              await editItemAsync({ id: itemModal.item.id, input: { ...input, image } });
            } else {
              // Add mode: no ID exists until the item is created, so the
              // photo (if any) has to be uploaded and attached in a second step.
              const newItem = await addItemAsync(input);
              if (imageFile) {
                setIsUploadingImage(true);
                const image = await uploadItemImage(newItem.id, imageFile);
                setIsUploadingImage(false);
                await editItemAsync({ id: newItem.id, input: { ...input, image } });
              }
            }
            closeItemModal();
          } catch (err) {
            setIsUploadingImage(false);
            showAlert(`Failed to save item: ${err instanceof Error ? err.message : "Something went wrong."}`);
          }
        }}
      />
    </>
  );
}