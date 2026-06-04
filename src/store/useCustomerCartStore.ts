import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { MenuItem, SelectedVariant, SelectedModifier } from "@/types";
import { generateId } from "@/lib/utils";

export interface CustomerCartItem {
  cartItemId: string;
  menuItem: MenuItem;
  quantity: number;
  selectedVariant?: SelectedVariant;
  selectedModifiers: SelectedModifier[];
  unitPrice: number;
  itemTotal: number;
}

interface CustomerCartState {
  items: CustomerCartItem[];
  addItem: (
    menuItem: MenuItem,
    selectedVariant?: SelectedVariant,
    selectedModifiers?: SelectedModifier[]
  ) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  itemCount: () => number;
  subtotal: () => number;
}

export const useCustomerCartStore = create<CustomerCartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (menuItem, selectedVariant, selectedModifiers = []) => {
        const variantAdjustment = selectedVariant?.priceAdjustment ?? 0;
        const modifierTotal = selectedModifiers.reduce(
          (sum, m) => sum + m.priceAdjustment,
          0
        );
        const unitPrice = menuItem.basePrice + variantAdjustment + modifierTotal;

        const existing = get().items.find(
          (ci) =>
            ci.menuItem.id === menuItem.id &&
            ci.selectedVariant?.variantId === selectedVariant?.variantId &&
            JSON.stringify(ci.selectedModifiers) ===
              JSON.stringify(selectedModifiers)
        );

        if (existing) {
          get().updateQuantity(existing.cartItemId, existing.quantity + 1);
          return;
        }

        set((state) => ({
          items: [
            ...state.items,
            {
              cartItemId: generateId("cci"),
              menuItem,
              quantity: 1,
              selectedVariant,
              selectedModifiers,
              unitPrice,
              itemTotal: unitPrice,
            },
          ],
        }));
      },

      removeItem: (cartItemId) => {
        set((state) => ({
          items: state.items.filter((ci) => ci.cartItemId !== cartItemId),
        }));
      },

      updateQuantity: (cartItemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(cartItemId);
          return;
        }
        set((state) => ({
          items: state.items.map((ci) =>
            ci.cartItemId === cartItemId
              ? { ...ci, quantity, itemTotal: ci.unitPrice * quantity }
              : ci
          ),
        }));
      },

      clearCart: () => set({ items: [] }),

      itemCount: () =>
        get().items.reduce((sum, ci) => sum + ci.quantity, 0),

      subtotal: () =>
        get().items.reduce((sum, ci) => sum + ci.itemTotal, 0),
    }),
    { name: "rns-customer-cart" }
  )
);