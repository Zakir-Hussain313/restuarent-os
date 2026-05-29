import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Staff } from "@/types";
import { mockCurrentStaff } from "@/mock-data";

interface AuthState {
  currentStaff: Staff | null;
  isAuthenticated: boolean;
  login: (staff: Staff) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      currentStaff: mockCurrentStaff, // auto-logged in for demo
      isAuthenticated: true,
      login: (staff) => set({ currentStaff: staff, isAuthenticated: true }),
      logout: () => set({ currentStaff: null, isAuthenticated: false }),
    }),
    { name: "zaiqa-auth" }
  )
);