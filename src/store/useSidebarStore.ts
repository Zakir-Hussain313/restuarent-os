import { create } from "zustand";

interface SidebarState {
  /** Icon-only rail (false) vs expanded with labels (true). Expanded overlays content on mobile/tablet, pushes content on desktop. */
  open: boolean;
  toggleOpen: () => void;
  close: () => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  open: true,
  toggleOpen: () => set((s) => ({ open: !s.open })),
  close: () => set({ open: false }),
}));