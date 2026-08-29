import { create } from "zustand";
import type { MenuItem, OrderType, SelectedModifier, SelectedVariant } from "@/types";
import type { Coupon } from "@/db/schema/orders";
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
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  appliedCoupon: Coupon | null;
  notes?: string;
  selectedRiderId?: string | "auto";

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
  setCustomerPhone: (phone: string) => void;
  setDeliveryAddress: (address: string) => void;
  setSelectedRiderId: (riderId: string | "auto" | undefined) => void;
  setCoupon: (coupon: Coupon) => void;
  clearCoupon: () => void;
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
  isCouponEligible: (coupon: Coupon) => boolean;
}

export const usePosStore = create<PosState>((set, get) => ({
  cartItems: [],
  orderType: "dine_in",
  appliedCoupon: null,

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
      deliveryAddress: undefined,
      selectedRiderId: undefined,
      appliedCoupon: null,
      notes: undefined,
    }),

  setOrderType: (orderType) => set({ orderType }),
  setTable: (tableId, tableNumber) => set({ tableId, tableNumber }),
  clearTable: () => set({ tableId: undefined, tableNumber: undefined }),
  setCustomer: (customerId, customerName, customerPhone) =>
    set({ customerId, customerName, customerPhone }),
  clearCustomer: () =>
    set({ customerId: undefined, customerPhone: undefined }),
  setCustomerPhone: (customerPhone) => set({ customerPhone }),
  setDeliveryAddress: (deliveryAddress) => set({ deliveryAddress }),
  setSelectedRiderId: (selectedRiderId) => set({ selectedRiderId }),
  setCoupon: (appliedCoupon) => set({ appliedCoupon }),
  clearCoupon: () => set({ appliedCoupon: null }),
  setNotes: (notes) => set({ notes }),

  getSubtotal: () =>
    get().cartItems.reduce((sum, ci) => sum + ci.itemTotal, 0),

  isCouponEligible: (coupon) => {
    const { menuItemIds, categoryIds } = coupon;
    if (!menuItemIds && !categoryIds) return true; // whole-order coupon, always eligible
    return get().cartItems.some(
      (ci) =>
        (menuItemIds?.includes(ci.menuItem.id) ?? false) ||
        (categoryIds?.includes(ci.menuItem.categoryId) ?? false)
    );
  },

  getDiscountAmount: () => {
    const { appliedCoupon, cartItems } = get();
    if (!appliedCoupon) return 0;

    const { discountType, discountValue, menuItemIds, categoryIds } = appliedCoupon;

    let base: number;
    if (menuItemIds || categoryIds) {
      base = cartItems.reduce((sum, ci) => {
        const eligible =
          (menuItemIds?.includes(ci.menuItem.id) ?? false) ||
          (categoryIds?.includes(ci.menuItem.categoryId) ?? false);
        return eligible ? sum + ci.itemTotal : sum;
      }, 0);
    } else {
      base = get().getSubtotal();
    }

    if (base === 0) return 0;
    if (discountType === "percentage") return Math.round(base * (Math.min(discountValue, 100) / 100));
    return Math.min(discountValue, base);
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