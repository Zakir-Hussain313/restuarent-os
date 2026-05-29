import { create } from "zustand";
import type { Order, OrderStatus } from "@/types";
import { mockOrders } from "@/mock-data";
import { generateId, generateOrderNumber } from "@/lib/utils";

interface OrderState {
  orders: Order[];
  addOrder: (order: Omit<Order, "id" | "orderNumber" | "createdAt" | "updatedAt">) => Order;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  updateOrder: (orderId: string, updates: Partial<Order>) => void;
  getOrderById: (orderId: string) => Order | undefined;
  getActiveOrders: () => Order[];
}

export const useOrderStore = create<OrderState>((set, get) => ({
  orders: mockOrders,

  addOrder: (orderData) => {
    const lastOrder = get().orders.reduce((max, o) => {
      const num = parseInt(o.orderNumber.replace("ORD-", ""));
      return num > max ? num : max;
    }, 0);

    const newOrder: Order = {
      ...orderData,
      id: generateId("ord"),
      orderNumber: generateOrderNumber(lastOrder),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    set((state) => ({ orders: [newOrder, ...state.orders] }));
    return newOrder;
  },

  updateOrderStatus: (orderId, status) => {
    set((state) => ({
      orders: state.orders.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status,
              updatedAt: new Date().toISOString(),
              completedAt: status === "completed" ? new Date().toISOString() : o.completedAt,
            }
          : o
      ),
    }));
  },

  updateOrder: (orderId, updates) => {
    set((state) => ({
      orders: state.orders.map((o) =>
        o.id === orderId ? { ...o, ...updates, updatedAt: new Date().toISOString() } : o
      ),
    }));
  },

  getOrderById: (orderId) => get().orders.find((o) => o.id === orderId),

  getActiveOrders: () =>
    get().orders.filter((o) =>
      ["pending", "confirmed", "preparing", "ready", "served"].includes(o.status)
    ),
}));