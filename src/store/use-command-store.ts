import { create } from "zustand";

interface CommandState {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

/** Controls the global ⌘K / Ctrl+K command palette. */
export const useCommandStore = create<CommandState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),
}));
