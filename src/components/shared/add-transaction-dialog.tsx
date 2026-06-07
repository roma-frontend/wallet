"use client";

import { useState, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TransactionForm } from "./transaction-form";
import { t } from "@/lib/i18n";
import type { TransactionType } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  defaultType?: TransactionType;
  /** "button" for inline button, "fab" for a floating action button (mobile) */
  variant?: "button" | "fab";
  label?: string;
  trigger?: ReactNode;
}

export function AddTransactionDialog({ defaultType, variant = "button", label, trigger }: Props) {
  const [open, setOpen] = useState(false);

  const defaultTrigger =
    variant === "fab" ? (
      <Button
        size="icon"
        aria-label={label ?? t.form.addTransaction}
        className={cn(
          "fixed bottom-20 right-4 z-40 md:hidden w-14 h-14 rounded-2xl shadow-lg",
          "gradient-primary hover:opacity-90",
        )}
      >
        <Plus className="w-6 h-6" />
      </Button>
    ) : (
      <Button>
        <Plus className="w-4 h-4" />
        {label ?? t.common.add}
      </Button>
    );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger ?? defaultTrigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.form.addTransaction}</DialogTitle>
        </DialogHeader>
        <TransactionForm defaultType={defaultType} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
