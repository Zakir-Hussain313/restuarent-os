import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Order, OrderStatus } from "@/types";
import { mockOrders } from "@/mock-data";

interface OrderState {
  orders: Order[];
  addOrder: (order: Order) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  updateOrder: (orderId: string, updates: Partial<Order>) => void;
  getOrderById: (orderId: string) => Order | undefined;
  getActiveOrders: () => Order[];
}

export const useOrderStore = create<OrderState>()(
  persist(
    (set, get) => ({
      orders: mockOrders,

      addOrder: (order: Order) => {
        set((state) => ({
          orders: [order, ...state.orders],
        }));
      },

      updateOrderStatus: (orderId, status) => {
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === orderId
              ? { ...o, status, updatedAt: new Date().toISOString() }
              : o
          ),
        }));
      },

      updateOrder: (orderId, updates) => {
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === orderId
              ? { ...o, ...updates, updatedAt: new Date().toISOString() }
              : o
          ),
        }));
      },

      getOrderById: (orderId) => get().orders.find((o) => o.id === orderId),

      getActiveOrders: () =>
        get().orders.filter((o) =>
          ["pending", "confirmed", "preparing", "ready", "served"].includes(o.status)
        ),
    }),
    {
      name: "rns-orders", // localStorage key
      // When backend is ready: remove this entire persist() wrapper
    }
  )
);