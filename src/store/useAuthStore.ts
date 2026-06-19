import { create } from "zustand";
import type { staff } from "@/db/schema";

// Real staff row shape, inferred directly from the Drizzle schema —
// no more mock Staff type from @/types, no more mock-data import.
export type AuthStaff = typeof staff.$inferSelect;

interface AuthState {
  currentStaff: AuthStaff | null;
  isAuthenticated: boolean;
  isHydrated: boolean;

  // Called once by a client wrapper on mount, fed by a server-fetched
  // staff row (see DashboardShell change below). NOT a login action —
  // this just syncs client state to what the server already knows.
  hydrate: (staff: AuthStaff | null) => void;

  // Called after a successful loginAction() server call succeeds and
  // the page has the resulting staff row available.
  login: (staff: AuthStaff) => void;

  // Called after logoutAction() server call succeeds.
  logout: () => void;
}

// No persist() middleware — Supabase's session cookie is the actual
// source of truth and already survives refreshes. Persisting a second
// copy to localStorage risks it outliving a real logout (stale auth
// state visible in the UI after the server-side session is gone).
export const useAuthStore = create<AuthState>((set) => ({
  currentStaff: null,
  isAuthenticated: false,
  isHydrated: false,

  hydrate: (staff) =>
    set({
      currentStaff: staff,
      isAuthenticated: staff !== null,
      isHydrated: true,
    }),

  login: (staff) => set({ currentStaff: staff, isAuthenticated: true }),

  logout: () =>
    set({ currentStaff: null, isAuthenticated: false }),
}));