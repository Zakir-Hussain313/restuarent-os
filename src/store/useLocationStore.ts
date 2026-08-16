import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CustomerLocation {
  branchId: string;
  city: string;
  area?: string; // absent for dine-in (book-a-table) selections
}

interface LocationState {
  location: CustomerLocation | null;
  setLocation: (location: CustomerLocation) => void;
  clearLocation: () => void;
}

export const useLocationStore = create<LocationState>()(
  persist(
    (set) => ({
      location: null,
      setLocation: (location) => set({ location }),
      clearLocation: () => set({ location: null }),
    }),
    { name: "rns-customer-location" }
  )
);