"use client";

import { useState } from "react";
import { Bot, Plus, TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { useMe } from "@/hooks/use-data";
import { useTxDialogStore } from "@/store/use-tx-dialog-store";
import { useAiStore } from "@/store/use-ai-store";

interface Action {
  key: string;
  label: string;
  icon: LucideIcon;
  className: string;
  onClick: () => void;
}

/**
 * Mobile-only elevated center action button that lives in the bottom nav
 * notch. Tapping it opens a bottom action sheet (expense / income / AI) —
 * the same one-thumb "quick add" pattern used by native finance apps.
 */
export function MobileFab() {
  const [open, setOpen] = useState(false);
  const me = useMe();
  const aiEnabled = me?.settings?.enableAiChat ?? false;
  const openTxDialog = useTxDialogStore((s) => s.openDialog);
  const openAi = useAiStore((s) => s.setOpen);

  const close = () => setOpen(false);

  const actions: Action[] = [
    {
      key: "expense",
      label: t.command.addExpense,
      icon: TrendingDown,
      className: "bg-destructive/15 text-destructive",
      onClick: () => {
        close();
        openTxDialog({ type: "expense" });
      },
    },
    {
      key: "income",
      label: t.command.addIncome,
      icon: TrendingUp,
      className: "bg-success/15 text-success",
      onClick: () => {
        close();
        openTxDialog({ type: "income" });
      },
    },
    ...(aiEnabled
      ? [
          {
            key: "ai",
            label: t.ai.assistant,
            icon: Bot,
            className: "bg-primary/15 text-primary",
            onClick: () => {
              close();
              openAi(true);
            },
          } as Action,
        ]
      : []),
  ];

  return (
    <div className="md:hidden">
      {/* Elevated center button — sits above the bottom nav bar */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t.common.add}
        className={cn(
          "fixed left-1/2 bottom-5 z-40 -translate-x-1/2",
          "flex h-14 w-14 items-center justify-center rounded-2xl",
          "gradient-primary text-white shadow-lg shadow-primary/40",
          "ring-4 ring-background active:scale-90 transition-transform",
        )}
      >
        <Plus className="h-6 w-6" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl pb-8">
          {/* Drag handle */}
          <div className="mx-auto mt-2 mb-1 h-1.5 w-10 rounded-full bg-muted" />
          <SheetTitle className="px-4 pt-2 text-center">{t.common.add}</SheetTitle>
          <div className="mt-3 space-y-2 px-3">
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.key}
                  type="button"
                  onClick={action.onClick}
                  className="flex w-full items-center gap-3 rounded-2xl border border-border p-3 text-left active:scale-[0.98] transition-transform hover:bg-muted"
                >
                  <span
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-xl",
                      action.className,
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-base font-medium">{action.label}</span>
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
