"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TransactionForm } from "./transaction-form";
import { t } from "@/lib/i18n";
import { useTxDialogStore } from "@/store/use-tx-dialog-store";

/**
 * A single globally-controlled "add transaction" dialog, mounted once in the
 * app layout. The command palette (and any other surface) opens it through
 * {@link useTxDialogStore}.
 */
export function GlobalTransactionDialog() {
  const { open, defaultType, prefillText, close } = useTxDialogStore();

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.form.addTransaction}</DialogTitle>
        </DialogHeader>
        {open && (
          <TransactionForm
            defaultType={defaultType}
            prefillText={prefillText}
            onSuccess={close}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
