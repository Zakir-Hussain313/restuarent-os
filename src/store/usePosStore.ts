import { create } from "zustand";
import type { MenuItem, OrderType, SelectedModifier, SelectedVariant } from "@/types";
import { calculateOrderTotals, generateId } from "@/lib/utils";
import { RESTAURANT_CONFIG } from "@/config/restaurant";

export interface CartItem {
  cartItemId: string;
  menuItem: MenuItem;
  quantity: number;
  selectedVariant?: SelectedVariant;
  selectedModifiers: SelectedModifier[];
  notes?: string;
  unitPrice: number;
  itemTotal: number;
}

interface PosState {
  cartItems: CartItem[];
  orderType: OrderType;
  tableId?: string;
  tableNumber?: string;
  customerId?: string;
  customerPhone?: string;
  discountType?: "percentage" | "fixed";
  discountValue: number;
  notes?: string;

  // Cart actions
  addItem: (
    menuItem: MenuItem,
    selectedVariant?: SelectedVariant,
    selectedModifiers?: SelectedModifier[],
    notes?: string
  ) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;

  // Order config
  setOrderType: (type: OrderType) => void;
  setTable: (tableId: string, tableNumber: string) => void;
  clearTable: () => void;
  setCustomer: (id: string, name: string, phone: string) => void;
  clearCustomer: () => void;
  setDiscount: (type: "percentage" | "fixed", value: number) => void;
  clearDiscount: () => void;
  setNotes: (notes: string) => void;

  // Computed
  getSubtotal: () => number;
  getDiscountAmount: () => number;
  getTotals: () => {
    subtotal: number;
    discountAmount: number;
    deliveryFee: number;
    total: number;
  };
  getItemCount: () => number;
}

export const usePosStore = create<PosState>((set, get) => ({
  cartItems: [],
  orderType: "dine_in",
  discountValue: 0,

  addItem: (menuItem, selectedVariant, selectedModifiers = [], notes) => {
    const variantAdjustment = selectedVariant?.priceAdjustment ?? 0;
    const modifierAdjustments = selectedModifiers.map((m) => m.priceAdjustment);
    const unitPrice = menuItem.basePrice + variantAdjustment + modifierAdjustments.reduce((a, b) => a + b, 0);

    // Check if identical item already in cart
    const existing = get().cartItems.find(
      (ci) =>
        ci.menuItem.id === menuItem.id &&
        ci.selectedVariant?.variantId === selectedVariant?.variantId &&
        JSON.stringify(ci.selectedModifiers) === JSON.stringify(selectedModifiers) &&
        ci.notes === notes
    );

    if (existing) {
      get().updateQuantity(existing.cartItemId, existing.quantity + 1);
      return;
    }

    const cartItem: CartItem = {
      cartItemId: generateId("ci"),
      menuItem,
      quantity: 1,
      selectedVariant,
      selectedModifiers,
      notes,
      unitPrice,
      itemTotal: unitPrice,
    };

    set((state) => ({ cartItems: [...state.cartItems, cartItem] }));
  },

  removeItem: (cartItemId) => {
    set((state) => ({
      cartItems: state.cartItems.filter((ci) => ci.cartItemId !== cartItemId),
    }));
  },

  updateQuantity: (cartItemId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(cartItemId);
      return;
    }
    set((state) => ({
      cartItems: state.cartItems.map((ci) =>
        ci.cartItemId === cartItemId
          ? { ...ci, quantity, itemTotal: ci.unitPrice * quantity }
          : ci
      ),
    }));
  },

  clearCart: () =>
    set({
      cartItems: [],
      tableId: undefined,
      tableNumber: undefined,
      customerId: undefined,
      customerPhone: undefined,
      discountValue: 0,
      discountType: undefined,
      notes: undefined,
    }),

  setOrderType: (orderType) => set({ orderType }),
  setTable: (tableId, tableNumber) => set({ tableId, tableNumber }),
  clearTable: () => set({ tableId: undefined, tableNumber: undefined }),
  setCustomer: (customerId, customerPhone) =>
    set({ customerId, customerPhone }),
  clearCustomer: () =>
    set({ customerId: undefined, customerPhone: undefined }),
  setDiscount: (discountType, discountValue) => set({ discountType, discountValue }),
  clearDiscount: () => set({ discountType: undefined, discountValue: 0 }),
  setNotes: (notes) => set({ notes }),

  getSubtotal: () =>
    get().cartItems.reduce((sum, ci) => sum + ci.itemTotal, 0),

  getDiscountAmount: () => {
    const { discountType, discountValue } = get();
    const subtotal = get().getSubtotal();
    if (!discountType || discountValue === 0) return 0;
    if (discountType === "percentage") return Math.round(subtotal * (discountValue / 100));
    return Math.min(discountValue, subtotal);
  },

  getTotals: () => {
    const subtotal = get().getSubtotal();
    const discountAmount = get().getDiscountAmount();
    const isDelivery = get().orderType === "delivery";
    const deliveryFee = isDelivery ? RESTAURANT_CONFIG.defaultDeliveryFee : 0;

    const { total } = calculateOrderTotals(
      subtotal,
      discountAmount,
      deliveryFee
    );

    return { subtotal, discountAmount, deliveryFee, total };
  },

  getItemCount: () => get().cartItems.reduce((sum, ci) => sum + ci.quantity, 0),
}));