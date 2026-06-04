import { create } from "zustand";

interface AiState {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

/** Controls the floating AI assistant chat panel from anywhere (e.g. the mobile speed-dial). */
export const useAiStore = create<AiState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),
}));
