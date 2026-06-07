"use client";

import { useMemo, useState } from "react";
import { Search, Receipt, SlidersHorizontal, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { TransactionRow } from "./transaction-row";
import { EmptyState } from "./empty-state";
import { AddTransactionDialog } from "./add-transaction-dialog";
import {
  useTransactions,
  useCategories,
  useBaseCurrency,
  useDataLoading,
} from "@/hooks/use-data";
import { useConvert } from "@/hooks/use-finance";
import { formatCurrency, formatDate, todayISO } from "@/lib/format";
import { t } from "@/lib/i18n";
import type { TransactionType } from "@/lib/types";

interface Props {
  type: TransactionType;
}

type SortKey = "date-desc" | "date-asc" | "amount-desc" | "amount-asc";
type PeriodKey = "all" | "today" | "thisMonth" | "lastMonth" | "thisYear";

/** Inclusive ISO date range for a preset, or null for "all time". */
function periodRange(period: PeriodKey): { from: string; to: string } | null {
  if (period === "all") return null;
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  switch (period) {
    case "today": {
      const today = todayISO();
      return { from: today, to: today };
    }
    case "thisMonth":
      return { from: iso(new Date(y, m, 1)), to: iso(new Date(y, m + 1, 0)) };
    case "lastMonth":
      return { from: iso(new Date(y, m - 1, 1)), to: iso(new Date(y, m, 0)) };
    case "thisYear":
      return { from: `${y}-01-01`, to: `${y}-12-31` };
  }
}

export function TransactionList({ type }: Props) {
  const all = useTransactions();
  const categories = useCategories();
  const baseCurrency = useBaseCurrency();
  const convertToBase = useConvert();
  const loading = useDataLoading();
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("date-desc");
  const [period, setPeriod] = useState<PeriodKey>("all");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const typeCategories = categories.filter((c) => c.type === type);

  const activeCount =
    (categoryId !== "all" ? 1 : 0) +
    (period !== "all" ? 1 : 0) +
    (amountMin.trim() ? 1 : 0) +
    (amountMax.trim() ? 1 : 0) +
    (sort !== "date-desc" ? 1 : 0);

  const resetFilters = () => {
    setCategoryId("all");
    setSort("date-desc");
    setPeriod("all");
    setAmountMin("");
    setAmountMax("");
    setQuery("");
  };

  const filtered = useMemo(() => {
    const range = periodRange(period);
    const min = amountMin.trim() ? Number(amountMin) : null;
    const max = amountMax.trim() ? Number(amountMax) : null;
    const q = query.trim().toLowerCase();

    const list = all
      .filter((tx) => tx.type === type)
      .filter((tx) => categoryId === "all" || tx.categoryId === categoryId)
      .filter((tx) => !range || (tx.date >= range.from && tx.date <= range.to))
      .filter((tx) => {
        if (min == null && max == null) return true;
        const base = convertToBase(tx.amount, tx.currency);
        if (min != null && base < min) return false;
        if (max != null && base > max) return false;
        return true;
      })
      .filter((tx) => {
        if (!q) return true;
        const cat = categories.find((c) => c._id === tx.categoryId);
        return (
          (cat?.name.toLowerCase().includes(q) ?? false) ||
          (tx.note?.toLowerCase().includes(q) ?? false)
        );
      });

    return list.sort((a, b) => {
      switch (sort) {
        case "date-asc":
          return a.date.localeCompare(b.date) || a._creationTime - b._creationTime;
        case "amount-desc":
          return convertToBase(b.amount, b.currency) - convertToBase(a.amount, a.currency);
        case "amount-asc":
          return convertToBase(a.amount, a.currency) - convertToBase(b.amount, b.currency);
        case "date-desc":
        default:
          return b.date.localeCompare(a.date) || b._creationTime - a._creationTime;
      }
    });
  }, [all, type, categoryId, query, categories, period, amountMin, amountMax, sort, convertToBase]);


  const total = useMemo(
    () => filtered.reduce((s, tx) => s + convertToBase(tx.amount, tx.currency), 0),
    [filtered, convertToBase],
  );

  // Group by date.
  const groups = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const tx of filtered) {
      const list = map.get(tx.date) ?? [];
      list.push(tx);
      map.set(tx.date, list);
    }
    return [...map.entries()];
  }, [filtered]);

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full rounded-xl" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Total summary */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{t.common.total}</span>
          <span
            className={`text-xl font-bold tabular ${
              type === "expense" ? "text-destructive" : "text-success"
            }`}
          >
            {formatCurrency(total, baseCurrency)}
          </span>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.common.search}
              className="pl-9"
              aria-label={t.common.search}
            />
          </div>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.common.all}</SelectItem>
              {typeCategories.map((c) => (
                <SelectItem key={c._id} value={c._id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant={showFilters ? "secondary" : "outline"}
            onClick={() => setShowFilters((v) => !v)}
            className="shrink-0 gap-2"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">{t.filters.title}</span>
            {activeCount > 0 && (
              <span className="flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold dark:text-white">
                {activeCount}
              </span>
            )}
          </Button>
        </div>

        {showFilters && (
          <Card>
            <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  {t.filters.period}
                </label>
                <Select value={period} onValueChange={(v) => setPeriod(v as PeriodKey)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.filters.allTime}</SelectItem>
                    <SelectItem value="today">{t.common.today}</SelectItem>
                    <SelectItem value="thisMonth">{t.common.thisMonth}</SelectItem>
                    <SelectItem value="lastMonth">{t.common.lastMonth}</SelectItem>
                    <SelectItem value="thisYear">{t.common.thisYear}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  {t.filters.sort}
                </label>
                <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date-desc">{t.filters.sortDateDesc}</SelectItem>
                    <SelectItem value="date-asc">{t.filters.sortDateAsc}</SelectItem>
                    <SelectItem value="amount-desc">{t.filters.sortAmountDesc}</SelectItem>
                    <SelectItem value="amount-asc">{t.filters.sortAmountAsc}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  {t.filters.amountFrom}
                </label>
                <Input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  value={amountMin}
                  onChange={(e) => setAmountMin(e.target.value)}
                  placeholder="0"
                  className="tabular"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  {t.filters.amountTo}
                </label>
                <Input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  value={amountMax}
                  onChange={(e) => setAmountMax(e.target.value)}
                  placeholder="∞"
                  className="tabular"
                />
              </div>

              <div className="sm:col-span-2 flex items-center justify-between">
                <span className="text-xs text-muted-foreground tabular">
                  {filtered.length} {t.filters.results}
                </span>
                {activeCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-1.5">
                    <X className="w-3.5 h-3.5" />
                    {t.filters.reset}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={Receipt}
              title={type === "expense" ? t.expense.noExpenses : t.income.noIncome}
              description={t.dashboard.addFirst}
              action={
                <AddTransactionDialog
                  defaultType={type}
                  label={type === "expense" ? t.expense.add : t.income.add}
                />
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {groups.map(([date, txs]) => (
            <Card key={date}>
              <CardContent className="p-3 md:p-4">
                <p className="text-xs font-medium text-muted-foreground px-1 mb-1">
                  {formatDate(date)}
                </p>
                <div className="divide-y divide-border/60">
                  {txs.map((tx) => (
                    <TransactionRow key={tx._id} transaction={tx} />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
