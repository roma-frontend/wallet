import { create } from "zustand";
import { usePrefsStore } from "./use-prefs-store";
import { t } from "@/lib/i18n";

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel: string;
  destructive?: boolean;
}

interface ConfirmState extends ConfirmOptions {
  open: boolean;
  destructive: boolean;
  _resolve: ((v: boolean) => void) | null;
  request: (opts: ConfirmOptions) => Promise<boolean>;
  respond: (v: boolean) => void;
}

export const useConfirmStore = create<ConfirmState>((set, get) => ({
  open: false,
  title: "",
  message: "",
  confirmLabel: "",
  destructive: true,
  _resolve: null,
  request: (opts) =>
    new Promise<boolean>((resolve) => {
      set({
        open: true,
        title: opts.title,
        message: opts.message,
        confirmLabel: opts.confirmLabel,
        destructive: opts.destructive ?? true,
        _resolve: resolve,
      });
    }),
  respond: (v) => {
    get()._resolve?.(v);
    set({ open: false, _resolve: null });
  },
}));

/**
 * Resolve true when the user confirms a deletion. When the "confirm before
 * delete" preference is off, it resolves immediately without a prompt.
 */
export async function confirmDelete(message?: string): Promise<boolean> {
  if (!usePrefsStore.getState().confirmDelete) return true;
  return useConfirmStore.getState().request({
    title: t.confirm.deleteTitle,
    message: message ?? t.confirm.deleteMessage,
    confirmLabel: t.common.delete,
    destructive: true,
  });
}
