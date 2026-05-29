import { create } from "zustand";
import type { Table, TableStatus } from "@/types";
import { mockTables } from "@/mock-data";

interface TableState {
  tables: Table[];
  updateTableStatus: (tableId: string, status: TableStatus, orderId?: string) => void;
  getTableById: (tableId: string) => Table | undefined;
  getAvailableTables: () => Table[];
}

export const useTableStore = create<TableState>((set, get) => ({
  tables: mockTables,

  updateTableStatus: (tableId, status, orderId) => {
    set((state) => ({
      tables: state.tables.map((t) =>
        t.id === tableId
          ? {
              ...t,
              status,
              currentOrderId: orderId ?? (status === "available" ? undefined : t.currentOrderId),
              updatedAt: new Date().toISOString(),
            }
          : t
      ),
    }));
  },

  getTableById: (tableId) => get().tables.find((t) => t.id === tableId),

  getAvailableTables: () => get().tables.filter((t) => t.status === "available" && t.isActive),
}));