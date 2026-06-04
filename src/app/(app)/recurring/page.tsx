"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Repeat, Plus, Trash2, Check, Pause, Play } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import {
  useRecurring,
  useCategories,
  useBaseCurrency,
  useRecurringMutations,
  useTransactionMutations,
  useDataLoading,
  type RecurringDoc,
} from "@/hooks/use-data";
import { useConvert } from "@/hooks/use-finance";
import { CURRENCIES } from "@/lib/currencies";
import { formatCurrency, formatDate, todayISO } from "@/lib/format";
import { getIcon } from "@/lib/icons";
import { confirmDelete } from "@/store/use-confirm-store";
import { DatePicker } from "@/components/shared/date-picker";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Id } from "@/hooks/use-data";

type Interval = "weekly" | "monthly" | "yearly";

function advanceDate(iso: string, interval: Interval): string {
  const d = new Date(iso);
  if (interval === "weekly") d.setDate(d.getDate() + 7);
  else if (interval === "monthly") d.setMonth(d.getMonth() + 1);
  else d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

function RecurringDialog({ trigger }: { trigger: React.ReactNode }) {
  const categories = useCategories();
  const baseCurrency = useBaseCurrency();
  const { add } = useRecurringMutations();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<string>(baseCurrency);
  const [categoryId, setCategoryId] = useState("");
  const [note, setNote] = useState("");
  const [interval, setInterval] = useState<Interval>("monthly");
  const [nextDate, setNextDate] = useState(todayISO());

  const cats = categories.filter((c) => c.type === type);

  const create = async () => {
    const value = Number(amount);
    if (!value || value <= 0) {
      toast.error(t.form.amountPositive);
      return;
    }
    await add({
      type,
      amount: value,
      currency,
      categoryId: categoryId ? (categoryId as Id<"categories">) : undefined,
      note: note.trim() || undefined,
      interval,
      dayOfMonth: new Date(nextDate).getDate(),
      nextDate,
      active: true,
    });
    toast.success(t.toast.budgetSaved);
    setOpen(false);
    setAmount("");
    setNote("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.recurring.add}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {(["expense", "income"] as const).map((ty) => (
              <button
                key={ty}
                type="button"
                onClick={() => {
                  setType(ty);
                  setCategoryId("");
                }}
                className={cn(
                  "h-10 rounded-lg border text-sm font-medium transition-colors",
                  type === ty
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground",
                )}
              >
                {t.type[ty]}
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <div className="flex-1 space-y-1.5">
              <Label>{t.common.amount}</Label>
              <Input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className="tabular" />
            </div>
            <div className="w-28 space-y-1.5">
              <Label>{t.common.currency}</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t.common.category}</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder={t.form.selectCategory} />
              </SelectTrigger>
              <SelectContent>
                {cats.map((c) => (
                  <SelectItem key={c._id} value={c._id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3">
            <div className="flex-1 space-y-1.5">
              <Label>{t.recurring.interval}</Label>
              <Select value={interval} onValueChange={(v) => setInterval(v as Interval)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">{t.recurrence.weekly}</SelectItem>
                  <SelectItem value="monthly">{t.recurrence.monthly}</SelectItem>
                  <SelectItem value="yearly">{t.recurrence.yearly}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-1.5">
              <Label>{t.recurring.nextDate}</Label>
              <DatePicker value={nextDate} onChange={setNextDate} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t.common.note}</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t.form.notePlaceholder} />
          </div>

          <Button onClick={create} className="w-full">{t.common.add}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RecurringRow({ item }: { item: RecurringDoc }) {
  const categories = useCategories();
  const baseCurrency = useBaseCurrency();
  const { update, remove } = useRecurringMutations();
  const { add: addTransaction } = useTransactionMutations();
  const category = categories.find((c) => c._id === item.categoryId);
  const Icon = getIcon(category?.icon ?? "repeat");

  const markPaid = async () => {
    await addTransaction({
      type: item.type,
      amount: item.amount,
      currency: item.currency,
      categoryId: item.categoryId,
      note: item.note,
      date: item.nextDate,
      recurrence: "none",
    });
    await update({ id: item._id, nextDate: advanceDate(item.nextDate, item.interval) });
    toast.success(t.toast.transactionAdded);
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: (category?.color ?? "#888") + "20" }}
      >
        <Icon className="w-4 h-4" style={{ color: category?.color ?? "#888" }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">
          {item.note || category?.name || t.recurring.title}
        </p>
        <p className="text-xs text-muted-foreground">
          {t.recurrence[item.interval]} · {t.recurring.nextDate}: {formatDate(item.nextDate)}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p
          className={cn(
            "font-semibold tabular",
            item.type === "income" ? "text-success" : "text-foreground",
          )}
        >
          {item.type === "income" ? "+" : "−"}
          {formatCurrency(item.amount, item.currency as typeof baseCurrency, { compact: true })}
        </p>
        <span
          className={cn(
            "text-xs",
            item.active ? "text-success" : "text-muted-foreground",
          )}
        >
          {item.active ? t.recurring.active : t.recurring.paused}
        </span>
      </div>
      <div className="flex flex-col gap-1 shrink-0">
        {item.active && (
          <Button variant="ghost" size="icon" className="w-7 h-7 text-success" aria-label={t.recurring.markPaid} onClick={markPaid}>
            <Check className="w-3.5 h-3.5" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="w-7 h-7"
          aria-label={item.active ? t.recurring.paused : t.recurring.active}
          onClick={() => update({ id: item._id, active: !item.active })}
        >
          {item.active ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="w-7 h-7 text-destructive"
          aria-label={t.common.delete}
          onClick={async () => {
            if (!(await confirmDelete())) return;
            await remove({ id: item._id });
            toast.success(t.toast.transactionDeleted);
          }}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default function RecurringPage() {
  const recurring = useRecurring();
  const baseCurrency = useBaseCurrency();
  const convert = useConvert();
  const loading = useDataLoading();

  const monthlyTotal = useMemo(() => {
    return recurring
      .filter((r) => r.active && r.type === "expense")
      .reduce((sum, r) => {
        const perMonth =
          r.interval === "weekly" ? r.amount * 4.33 : r.interval === "yearly" ? r.amount / 12 : r.amount;
        return sum + convert(perMonth, r.currency);
      }, 0);
  }, [recurring, convert]);

  const nextPayment = useMemo(() => {
    const active = recurring
      .filter((r) => r.active)
      .slice()
      .sort((a, b) => a.nextDate.localeCompare(b.nextDate));
    return active[0]?.nextDate ?? null;
  }, [recurring]);

  return (
    <div>
      <PageHeader
        title={t.recurring.title}
        subtitle={t.recurring.subtitle}
        action={
          <RecurringDialog
            trigger={
              <Button className="hidden md:inline-flex">
                <Plus className="w-4 h-4" /> {t.recurring.add}
              </Button>
            }
          />
        }
      />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : recurring.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={Repeat}
              title={t.recurring.noRecurring}
              description={t.recurring.subtitle}
              action={
                <RecurringDialog
                  trigger={
                    <Button>
                      <Plus className="w-4 h-4" /> {t.recurring.add}
                    </Button>
                  }
                />
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t.subscriptions.title}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">{t.subscriptions.monthlyTotal}</p>
                <p className="text-2xl font-bold tabular text-destructive mt-1">
                  {formatCurrency(monthlyTotal, baseCurrency, { compact: true })}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t.subscriptions.yearlyTotal}</p>
                <p className="text-2xl font-bold tabular mt-1">
                  {formatCurrency(monthlyTotal * 12, baseCurrency, { compact: true })}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t.subscriptions.nextPayment}</p>
                <p className="text-2xl font-bold tabular mt-1">
                  {nextPayment ? formatDate(nextPayment) : "—"}
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            {recurring
              .slice()
              .sort((a, b) => a.nextDate.localeCompare(b.nextDate))
              .map((item) => (
                <RecurringRow key={item._id} item={item} />
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
