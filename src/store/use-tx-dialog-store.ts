import { create } from "zustand";
import type { TransactionType } from "@/lib/types";

interface TxDialogState {
  open: boolean;
  defaultType: TransactionType;
  /** Optional pre-filled natural-language text for the smart-add field. */
  prefillText: string;
  openDialog: (opts?: { type?: TransactionType; prefillText?: string }) => void;
  close: () => void;
}

/** Globally-controllable "add transaction" dialog (used by the command palette). */
export const useTxDialogStore = create<TxDialogState>((set) => ({
  open: false,
  defaultType: "expense",
  prefillText: "",
  openDialog: (opts) =>
    set({
      open: true,
      defaultType: opts?.type ?? "expense",
      prefillText: opts?.prefillText ?? "",
    }),
  close: () => set({ open: false, prefillText: "" }),
}));
