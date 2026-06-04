"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PiggyBank, Plus, AlertTriangle, Trash2, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Switch } from "@/components/ui/switch";
import {
  useBudgets,
  useCategories,
  useBaseCurrency,
  useBudgetMutations,
  useDataLoading,
} from "@/hooks/use-data";
import {
  useMonthSummary,
  useCategorySpending,
  usePreviousMonthCategorySpending,
  useBudgetSuggestions,
} from "@/hooks/use-finance";
import { formatCurrency, formatPercent } from "@/lib/format";
import { getIcon } from "@/lib/icons";
import { confirmDelete } from "@/store/use-confirm-store";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Id } from "@/hooks/use-data";

function BudgetDialog({
  trigger,
  initialCategory,
  initialAmount,
  initialRollover,
}: {
  trigger: React.ReactNode;
  initialCategory?: string;
  initialAmount?: number;
  initialRollover?: boolean;
}) {
  const categories = useCategories().filter((c) => c.type === "expense");
  const { upsert } = useBudgetMutations();
  const [open, setOpen] = useState(false);
  const [categoryId, setCategoryId] = useState(initialCategory ?? "");
  const [amount, setAmount] = useState(initialAmount?.toString() ?? "");
  const [rollover, setRollover] = useState(initialRollover ?? false);

  const save = async () => {
    const value = Number(amount);
    if (!categoryId || !value || value <= 0) {
      toast.error(t.form.amountPositive);
      return;
    }
    await upsert({ categoryId: categoryId as Id<"categories">, amount: value, rollover });
    toast.success(t.toast.budgetSaved);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.budget.add}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t.common.category}</Label>
            <Select value={categoryId} onValueChange={setCategoryId} disabled={!!initialCategory}>
              <SelectTrigger>
                <SelectValue placeholder={t.form.selectCategory} />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c._id} value={c._id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t.budget.limit}</Label>
            <Input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="tabular"
            />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label>{t.budget.rollover}</Label>
              <p className="text-xs text-muted-foreground">{t.budget.rolloverHint}</p>
            </div>
            <Switch checked={rollover} onCheckedChange={setRollover} />
          </div>
          <Button onClick={save} className="w-full">
            {t.common.save}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AutopilotDialog({ existingCategoryIds }: { existingCategoryIds: Set<string> }) {
  const suggestions = useBudgetSuggestions(existingCategoryIds);
  const baseCurrency = useBaseCurrency();
  const { upsert } = useBudgetMutations();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Record<string, number>>({});

  // Seed the editable amounts whenever the dialog opens.
  const openDialog = () => {
    const seed: Record<string, number> = {};
    for (const s of suggestions) seed[s.category._id] = s.suggested;
    setSelected(seed);
    setOpen(true);
  };

  const applyAll = async () => {
    const entries = Object.entries(selected).filter(([, v]) => v > 0);
    if (entries.length === 0) return;
    setSaving(true);
    try {
      for (const [categoryId, amount] of entries) {
        await upsert({ categoryId: categoryId as Id<"categories">, amount, rollover: false });
      }
      toast.success(t.autopilot.applied);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" onClick={openDialog}>
        <Sparkles className="w-4 h-4" /> {t.autopilot.button}
      </Button>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-4.5 h-4.5 text-primary" /> {t.autopilot.title}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-2">{t.autopilot.subtitle}</p>
        {suggestions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            {t.autopilot.noSuggestions}
          </p>
        ) : (
          <>
            <div className="space-y-2.5 max-h-80 overflow-y-auto -mx-1 px-1">
              {suggestions.map((s) => {
                const Icon = getIcon(s.category.icon);
                const val = selected[s.category._id] ?? s.suggested;
                return (
                  <div key={s.category._id} className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 shrink-0" style={{ color: s.category.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{s.category.name}</p>
                      <p className="text-xs text-muted-foreground tabular">
                        {formatCurrency(s.average, baseCurrency, { compact: true })}{" "}
                        {t.autopilot.avgPerMonth}
                      </p>
                    </div>
                    <Input
                      type="number"
                      inputMode="decimal"
                      value={val}
                      onChange={(e) =>
                        setSelected((p) => ({
                          ...p,
                          [s.category._id]: Number(e.target.value),
                        }))
                      }
                      className="w-28 h-9"
                    />
                  </div>
                );
              })}
            </div>
            <Button onClick={applyAll} disabled={saving} className="w-full">
              <Sparkles className="w-4 h-4" /> {t.autopilot.applyAll}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function BudgetsPage() {
  const budgets = useBudgets();
  const categories = useCategories();
  const baseCurrency = useBaseCurrency();
  const { remove } = useBudgetMutations();
  const loading = useDataLoading();
  const summary = useMonthSummary();
  const spending = useCategorySpending(summary.monthly);
  const prevSpending = usePreviousMonthCategorySpending();

  const spentByCat = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of spending) map.set(s.category._id, s.amount);
    return map;
  }, [spending]);

  const existingCategoryIds = useMemo(
    () => new Set(budgets.map((b) => b.categoryId as string)),
    [budgets],
  );

  const rows = budgets
    .map((b) => {
      const category = categories.find((c) => c._id === b.categoryId);
      const spent = spentByCat.get(b.categoryId) ?? 0;
      /* Carry-over: last month's unused (positive) or overspent (negative) amount. */
      const carry = b.rollover ? b.amount - (prevSpending.get(b.categoryId) ?? 0) : 0;
      const limit = Math.max(0, b.amount + carry);
      const percent = limit > 0 ? (spent / limit) * 100 : 0;
      return { budget: b, category, spent, limit, carry, percent };
    })
    .filter((r) => r.category)
    .sort((a, b) => b.percent - a.percent);

  const totalLimit = rows.reduce((s, r) => s + r.limit, 0);
  const totalSpent = rows.reduce((s, r) => s + r.spent, 0);

  return (
    <div>
      <PageHeader
        title={t.budget.title}
        subtitle={t.budget.subtitle}
        action={
          <div className="hidden md:flex items-center gap-2">
            <AutopilotDialog existingCategoryIds={existingCategoryIds} />
            <BudgetDialog
              trigger={
                <Button>
                  <Plus className="w-4 h-4" /> {t.budget.add}
                </Button>
              }
            />
          </div>
        }
      />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : budgets.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={PiggyBank}
              title={t.budget.noBudgets}
              description={t.budget.subtitle}
              action={
                <BudgetDialog
                  trigger={
                    <Button>
                      <Plus className="w-4 h-4" /> {t.budget.add}
                    </Button>
                  }
                />
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Overall */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t.common.total}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between mb-2">
                <span className="text-2xl font-bold tabular">
                  {formatCurrency(totalSpent, baseCurrency, { compact: true })}
                </span>
                <span className="text-sm text-muted-foreground tabular">
                  / {formatCurrency(totalLimit, baseCurrency, { compact: true })}
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    totalSpent > totalLimit ? "bg-destructive" : "gradient-primary",
                  )}
                  style={{ width: `${Math.min(100, totalLimit ? (totalSpent / totalLimit) * 100 : 0)}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Per-category */}
          <div className="grid sm:grid-cols-2 gap-3">
            {rows.map(({ budget, category, spent, limit, carry, percent }) => {
              if (!category) return null;
              const Icon = getIcon(category.icon);
              const over = percent > 100;
              const warn = percent >= 80 && percent <= 100;
              const remaining = limit - spent;
              return (
                <Card key={budget._id} className="group">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: category.color + "20" }}
                      >
                        <Icon className="w-4 h-4" style={{ color: category.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{category.name}</p>
                        <p className="text-xs text-muted-foreground tabular">
                          {formatCurrency(spent, baseCurrency, { compact: true })} /{" "}
                          {formatCurrency(limit, baseCurrency, { compact: true })}
                          {carry !== 0 && (
                            <span className={cn("ml-1", carry > 0 ? "text-success" : "text-destructive")}>
                              ({carry > 0 ? "+" : ""}
                              {formatCurrency(carry, baseCurrency, { compact: true })})
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <BudgetDialog
                          initialCategory={category._id}
                          initialAmount={budget.amount}
                          initialRollover={budget.rollover ?? false}
                          trigger={
                            <Button variant="ghost" size="sm" className="text-xs">
                              {t.budget.limit}
                            </Button>
                          }
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-7 h-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label={t.common.delete}
                          onClick={async () => {
                            if (!(await confirmDelete())) return;
                            await remove({ id: budget._id });
                            toast.success(t.toast.budgetDeleted);
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          over ? "bg-destructive" : warn ? "bg-warning" : "",
                        )}
                        style={{
                          width: `${Math.min(100, percent)}%`,
                          background: over || warn ? undefined : category.color,
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between mt-2 text-xs">
                      <span className="tabular text-muted-foreground">{formatPercent(percent)}</span>
                      {over ? (
                        <span className="flex items-center gap-1 text-destructive font-medium">
                          <AlertTriangle className="w-3 h-3" />
                          {t.budget.overBudget}
                        </span>
                      ) : (
                        <span className="tabular text-muted-foreground">
                          {t.budget.remaining}: {formatCurrency(remaining, baseCurrency, { compact: true })}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
