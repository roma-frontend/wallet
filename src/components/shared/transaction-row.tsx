"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Pencil, Trash2, MoreHorizontal, Repeat, Paperclip } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { TransactionForm } from "./transaction-form";
import {
  useCategories,
  useBaseCurrency,
  useTransactionMutations,
  type TransactionDoc,
} from "@/hooks/use-data";
import { useConvert } from "@/hooks/use-finance";
import { confirmDelete } from "@/store/use-confirm-store";
import { formatCurrency, relativeDate } from "@/lib/format";
import { getIcon } from "@/lib/icons";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface Props {
  transaction: TransactionDoc;
}

// Width of the revealed action panel (two 64px buttons).
const REVEAL = 128;

export function TransactionRow({ transaction }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const [offset, setOffset] = useState(0);
  const drag = useRef<{
    startX: number;
    startY: number;
    base: number;
    axis: "none" | "x" | "y";
  } | null>(null);

  const categories = useCategories();
  const baseCurrency = useBaseCurrency();
  const convertToBase = useConvert();
  const { remove } = useTransactionMutations();

  const category = categories.find((c) => c._id === transaction.categoryId);
  const Icon = getIcon(category?.icon ?? "ellipsis");
  const isExpense = transaction.type === "expense";
  const amountBase = convertToBase(transaction.amount, transaction.currency);

  const handleDelete = async () => {
    setOffset(0);
    if (!(await confirmDelete())) return;
    await remove({ id: transaction._id });
    toast.success(t.toast.transactionDeleted);
  };

  // ── Touch swipe (mobile finger gesture) ──────────────────────────────
  const onTouchStart = (e: React.TouchEvent) => {
    const tch = e.touches[0];
    drag.current = {
      startX: tch.clientX,
      startY: tch.clientY,
      base: offset,
      axis: "none",
    };
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const d = drag.current;
    if (!d) return;
    const tch = e.touches[0];
    const dx = tch.clientX - d.startX;
    const dy = tch.clientY - d.startY;

    if (d.axis === "none") {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      d.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    }
    if (d.axis !== "x") return;

    const next = Math.max(-REVEAL, Math.min(0, d.base + dx));
    setOffset(next);
  };

  const onTouchEnd = () => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.axis !== "x") return;
    setOffset(offset < -REVEAL / 2 ? -REVEAL : 0);
  };

  return (
    <>
      <div className="relative overflow-hidden rounded-xl">
        {/* Swipe action panel (revealed behind the row) */}
        <div
          className={cn(
            "absolute inset-y-0 right-0 flex md:hidden",
            offset === 0 && "hidden",
          )}
        >
          <button
            type="button"
            aria-label={t.common.edit}
            onClick={() => {
              setOffset(0);
              setEditOpen(true);
            }}
            className="flex w-16 items-center justify-center bg-muted text-foreground active:scale-95 transition-transform"
          >
            <Pencil className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label={t.common.delete}
            onClick={handleDelete}
            className="flex w-16 items-center justify-center bg-destructive text-white active:scale-95 transition-transform"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>

        {/* Foreground row */}
        <div
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onClick={() => offset !== 0 && setOffset(0)}
          style={{
            transform: `translateX(${offset}px)`,
            transition: drag.current ? "none" : "transform 0.25s ease",
          }}
          className="relative flex items-center gap-3 py-3 px-1 bg-card group hover:bg-muted/40"
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: (category?.color ?? "#64748b") + "20" }}
          >
            <Icon className="w-4 h-4" style={{ color: category?.color ?? "#64748b" }} />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate flex items-center gap-1.5">
              {category?.name ?? "—"}
              {transaction.recurrence !== "none" && (
                <Badge variant="secondary" className="text-[10px] py-0 gap-1">
                  <Repeat className="w-2.5 h-2.5" />
                  {t.recurrence[transaction.recurrence]}
                </Badge>
              )}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {relativeDate(transaction.date)}
              {transaction.note && ` · ${transaction.note}`}
            </p>
            {(transaction.tags?.length || transaction.receiptId) && (
              <div className="flex items-center gap-1 mt-1 flex-wrap">
                {transaction.receiptId && (
                  <Paperclip className="w-3 h-3 text-muted-foreground shrink-0" />
                )}
                {transaction.tags?.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="text-right shrink-0">
            <p
              className={cn(
                "text-sm font-semibold tabular",
                isExpense ? "text-destructive" : "text-success",
              )}
            >
              {isExpense ? "−" : "+"}
              {formatCurrency(amountBase, baseCurrency)}
            </p>
            {transaction.currency !== baseCurrency && (
              <p className="text-[10px] text-muted-foreground tabular">
                {formatCurrency(transaction.amount, transaction.currency as never)}
              </p>
            )}
          </div>

          {/* Desktop hover actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t.common.actions}
                className="hidden md:inline-flex w-7 h-7 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditOpen(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                {t.common.edit}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={handleDelete}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t.common.delete}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.form.editTransaction}</DialogTitle>
          </DialogHeader>
          <TransactionForm initial={transaction} onSuccess={() => setEditOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
