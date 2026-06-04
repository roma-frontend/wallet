"use client";

import { useMemo } from "react";
import { useCurrencyStore } from "@/store/use-currency-store";
import { convert } from "@/lib/currencies";
import type { CurrencyCode } from "@/lib/types";
import {
  useTransactions,
  useCategories,
  useBaseCurrency,
  useMe,
  useBudgets,
  useGoals,
  useAccounts,
  useTransfers,
  type TransactionDoc,
} from "./use-data";

function pad(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function currentMonthRange(startDay: number) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), startDay);
  if (start > now) start.setMonth(start.getMonth() - 1);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  end.setDate(end.getDate() - 1);
  return { from: pad(start), to: pad(end) };
}

function previousMonthRange(startDay: number) {
  const { from } = currentMonthRange(startDay);
  const start = new Date(from);
  start.setMonth(start.getMonth() - 1);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  end.setDate(end.getDate() - 1);
  return { from: pad(start), to: pad(end) };
}

export function useMonthSummary() {
  const transactions = useTransactions();
  const baseCurrency = useBaseCurrency();
  const me = useMe();
  const monthStartDay = me?.settings?.monthStartDay ?? 1;
  const rates = useCurrencyStore((s) => s.rates);

  return useMemo(() => {
    const { from, to } = currentMonthRange(monthStartDay);
    const prev = previousMonthRange(monthStartDay);
    const toBase = (amount: number, currency: string) =>
      convert(amount, currency as CurrencyCode, baseCurrency, rates);

    const inRange = (t: TransactionDoc, f: string, tt: string) => t.date >= f && t.date <= tt;
    const monthly = transactions.filter((t) => inRange(t, from, to));
    const prevMonthly = transactions.filter((t) => inRange(t, prev.from, prev.to));

    const sum = (list: TransactionDoc[], type: "income" | "expense") =>
      list.filter((t) => t.type === type).reduce((s, t) => s + toBase(t.amount, t.currency), 0);

    const income = sum(monthly, "income");
    const expense = sum(monthly, "expense");
    const prevExpense = sum(prevMonthly, "expense");
    const prevIncome = sum(prevMonthly, "income");

    const balance = income - expense;
    const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0;
    const expenseTrend = prevExpense > 0 ? ((expense - prevExpense) / prevExpense) * 100 : 0;
    const incomeTrend = prevIncome > 0 ? ((income - prevIncome) / prevIncome) * 100 : 0;

    return {
      income,
      expense,
      balance,
      savingsRate,
      expenseTrend,
      incomeTrend,
      from,
      to,
      monthly,
    };
  }, [transactions, baseCurrency, monthStartDay, rates]);
}

export function useCategorySpending(transactions: TransactionDoc[]) {
  const categories = useCategories();
  const baseCurrency = useBaseCurrency();
  const rates = useCurrencyStore((s) => s.rates);

  return useMemo(() => {
    const expTx = transactions.filter((t) => t.type === "expense");
    const map = new Map<string, number>();
    for (const t of expTx) {
      const key = t.categoryId ?? "none";
      const prev = map.get(key) ?? 0;
      map.set(key, prev + convert(t.amount, t.currency as CurrencyCode, baseCurrency, rates));
    }
    const total = [...map.values()].reduce((a, b) => a + b, 0);
    return categories
      .filter((c) => map.has(c._id))
      .map((c) => ({
        category: c,
        amount: map.get(c._id) ?? 0,
        percent: total > 0 ? ((map.get(c._id) ?? 0) / total) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions, categories, baseCurrency, rates]);
}

/**
 * Previous-month spending per category, in base currency. Used for budget
 * rollover (carry-over of last month's unused or overspent amount).
 */
export function usePreviousMonthCategorySpending(): Map<string, number> {
  const transactions = useTransactions();
  const baseCurrency = useBaseCurrency();
  const me = useMe();
  const monthStartDay = me?.settings?.monthStartDay ?? 1;
  const rates = useCurrencyStore((s) => s.rates);

  return useMemo(() => {
    const { from, to } = previousMonthRange(monthStartDay);
    const map = new Map<string, number>();
    for (const t of transactions) {
      if (t.type !== "expense" || !t.categoryId) continue;
      if (t.date < from || t.date > to) continue;
      const prev = map.get(t.categoryId) ?? 0;
      map.set(t.categoryId, prev + convert(t.amount, t.currency as CurrencyCode, baseCurrency, rates));
    }
    return map;
  }, [transactions, baseCurrency, monthStartDay, rates]);
}

export interface CategoryComparison {
  category: import("./use-data").CategoryDoc;
  current: number;
  previous: number;
  /** Signed % change vs previous month (0 when previous was 0 and current 0). */
  changePct: number;
  delta: number;
}

/**
 * Per-category expense comparison: current period vs previous period, sorted by
 * absolute change. Powers the "period comparison" analytics view.
 */
export function usePeriodComparison(): {
  rows: CategoryComparison[];
  currentTotal: number;
  previousTotal: number;
} {
  const transactions = useTransactions();
  const categories = useCategories();
  const baseCurrency = useBaseCurrency();
  const me = useMe();
  const monthStartDay = me?.settings?.monthStartDay ?? 1;
  const rates = useCurrencyStore((s) => s.rates);

  return useMemo(() => {
    const cur = currentMonthRange(monthStartDay);
    const prev = previousMonthRange(monthStartDay);
    const toBase = (amount: number, currency: string) =>
      convert(amount, currency as CurrencyCode, baseCurrency, rates);

    const curMap = new Map<string, number>();
    const prevMap = new Map<string, number>();
    let currentTotal = 0;
    let previousTotal = 0;
    for (const t of transactions) {
      if (t.type !== "expense") continue;
      const key = t.categoryId ?? "none";
      const val = toBase(t.amount, t.currency);
      if (t.date >= cur.from && t.date <= cur.to) {
        curMap.set(key, (curMap.get(key) ?? 0) + val);
        currentTotal += val;
      } else if (t.date >= prev.from && t.date <= prev.to) {
        prevMap.set(key, (prevMap.get(key) ?? 0) + val);
        previousTotal += val;
      }
    }

    const keys = new Set([...curMap.keys(), ...prevMap.keys()]);
    const rows: CategoryComparison[] = [];
    for (const key of keys) {
      const category = categories.find((c) => c._id === key);
      if (!category) continue;
      const current = curMap.get(key) ?? 0;
      const previous = prevMap.get(key) ?? 0;
      const delta = current - previous;
      const changePct = previous > 0 ? (delta / previous) * 100 : current > 0 ? 100 : 0;
      rows.push({ category, current, previous, delta, changePct });
    }
    rows.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
    return { rows, currentTotal, previousTotal };
  }, [transactions, categories, baseCurrency, monthStartDay, rates]);
}

export interface SpendingAnomaly {
  category: import("./use-data").CategoryDoc;
  current: number;
  average: number;
  /** current / average ratio (e.g. 2.5 = 2.5× the usual). */
  ratio: number;
}

/**
 * Detects categories where this month's spending is anomalously high compared
 * to the trailing 3-month average. Powers proactive "you're spending more than
 * usual" alerts. Only flags ratios ≥ 1.5× with a meaningful absolute jump.
 */
export function useAnomalies(): SpendingAnomaly[] {
  const transactions = useTransactions();
  const categories = useCategories();
  const baseCurrency = useBaseCurrency();
  const me = useMe();
  const monthStartDay = me?.settings?.monthStartDay ?? 1;
  const rates = useCurrencyStore((s) => s.rates);

  return useMemo(() => {
    const toBase = (amount: number, currency: string) =>
      convert(amount, currency as CurrencyCode, baseCurrency, rates);
    const cur = currentMonthRange(monthStartDay);

    const lookback = 3;
    const windowStart = new Date(cur.from);
    windowStart.setMonth(windowStart.getMonth() - lookback);
    const histFrom = pad(windowStart);
    const histTo = pad(new Date(new Date(cur.from).getTime() - 86_400_000));

    const curMap = new Map<string, number>();
    const histMap = new Map<string, number>();
    for (const t of transactions) {
      if (t.type !== "expense" || !t.categoryId) continue;
      const val = toBase(t.amount, t.currency);
      if (t.date >= cur.from && t.date <= cur.to) {
        curMap.set(t.categoryId, (curMap.get(t.categoryId) ?? 0) + val);
      } else if (t.date >= histFrom && t.date <= histTo) {
        histMap.set(t.categoryId, (histMap.get(t.categoryId) ?? 0) + val);
      }
    }

    const curTotal = [...curMap.values()].reduce((a, b) => a + b, 0);
    const out: SpendingAnomaly[] = [];
    for (const [key, current] of curMap) {
      const average = (histMap.get(key) ?? 0) / lookback;
      if (average <= 0) continue;
      const ratio = current / average;
      // Flag meaningful spikes only: ≥1.5× the usual and ≥5% of this month's
      // total spend, so tiny categories don't generate noise.
      if (ratio >= 1.5 && curTotal > 0 && current / curTotal >= 0.05) {
        const category = categories.find((c) => c._id === key);
        if (category) out.push({ category, current, average, ratio });
      }
    }
    return out.sort((a, b) => b.ratio - a.ratio);
  }, [transactions, categories, baseCurrency, monthStartDay, rates]);
}

export interface BudgetSuggestion {
  category: import("./use-data").CategoryDoc;
  /** Suggested monthly limit in base currency, rounded sensibly. */
  suggested: number;
  /** Trailing-3-month average (raw). */
  average: number;
  monthsSeen: number;
}

/**
 * Budget autopilot: suggests a monthly limit per expense category from the
 * trailing 3-month average spend (rounded up to a clean number), excluding
 * categories the caller already has a budget for.
 */
export function useBudgetSuggestions(excludeCategoryIds: Set<string>): BudgetSuggestion[] {
  const transactions = useTransactions();
  const categories = useCategories();
  const baseCurrency = useBaseCurrency();
  const me = useMe();
  const monthStartDay = me?.settings?.monthStartDay ?? 1;
  const rates = useCurrencyStore((s) => s.rates);

  return useMemo(() => {
    const toBase = (amount: number, currency: string) =>
      convert(amount, currency as CurrencyCode, baseCurrency, rates);
    const cur = currentMonthRange(monthStartDay);
    const lookback = 3;
    const windowStart = new Date(cur.from);
    windowStart.setMonth(windowStart.getMonth() - lookback);
    const histFrom = pad(windowStart);
    const histTo = pad(new Date(new Date(cur.from).getTime() - 86_400_000));

    const totals = new Map<string, number>();
    const months = new Map<string, Set<string>>();
    for (const t of transactions) {
      if (t.type !== "expense" || !t.categoryId) continue;
      if (t.date < histFrom || t.date > histTo) continue;
      totals.set(t.categoryId, (totals.get(t.categoryId) ?? 0) + toBase(t.amount, t.currency));
      const set = months.get(t.categoryId) ?? new Set<string>();
      set.add(t.date.slice(0, 7));
      months.set(t.categoryId, set);
    }

    const roundUp = (n: number) => {
      if (n <= 0) return 0;
      const mag = Math.pow(10, Math.floor(Math.log10(n)));
      const step = mag / 2 || 1;
      return Math.ceil(n / step) * step;
    };

    const out: BudgetSuggestion[] = [];
    for (const [key, total] of totals) {
      if (excludeCategoryIds.has(key)) continue;
      const monthsSeen = months.get(key)?.size ?? 0;
      if (monthsSeen === 0) continue;
      const average = total / lookback;
      const suggested = roundUp(average);
      if (suggested <= 0) continue;
      const category = categories.find((c) => c._id === key);
      if (category) out.push({ category, suggested, average, monthsSeen });
    }
    return out.sort((a, b) => b.suggested - a.suggested);
  }, [transactions, categories, baseCurrency, monthStartDay, rates, excludeCategoryIds]);
}

export function useRecentTransactions(limit = 10) {
  const transactions = useTransactions();
  return useMemo(
    () =>
      [...transactions]
        .sort((a, b) => b.date.localeCompare(a.date) || b._creationTime - a._creationTime)
        .slice(0, limit),
    [transactions, limit],
  );
}

export function useMonthlyTrend(months = 6) {
  const transactions = useTransactions();
  const baseCurrency = useBaseCurrency();
  const rates = useCurrencyStore((s) => s.rates);

  return useMemo(() => {
    const now = new Date();
    return Array.from({ length: months }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const from = `${y}-${m}-01`;
      const lastDay = new Date(y, d.getMonth() + 1, 0).getDate();
      const to = `${y}-${m}-${lastDay}`;
      const monthTx = transactions.filter((t) => t.date >= from && t.date <= to);
      const income = monthTx
        .filter((t) => t.type === "income")
        .reduce((s, t) => s + convert(t.amount, t.currency as CurrencyCode, baseCurrency, rates), 0);
      const expense = monthTx
        .filter((t) => t.type === "expense")
        .reduce((s, t) => s + convert(t.amount, t.currency as CurrencyCode, baseCurrency, rates), 0);
      return {
        month: `${y}-${m}`,
        monthIndex: d.getMonth(),
        income,
        expense,
        balance: income - expense,
      };
    });
  }, [transactions, baseCurrency, rates, months]);
}

/** Convert any amount to the user's base currency. */
export function useConvert() {
  const baseCurrency = useBaseCurrency();
  const rates = useCurrencyStore((s) => s.rates);
  return useMemo(
    () => (amount: number, currency: string) =>
      convert(amount, currency as CurrencyCode, baseCurrency, rates),
    [baseCurrency, rates],
  );
}

export interface AccountBalance {
  account: import("./use-data").AccountDoc;
  /** Running balance in the account's own currency. */
  balance: number;
  /** Same balance converted to the user's base currency. */
  baseBalance: number;
}

/**
 * Running balance for every account, computed from its opening balance plus
 * all transactions and transfers that touch it.
 */
export function useAccountBalances(): AccountBalance[] {
  const accounts = useAccounts();
  const transactions = useTransactions();
  const transfers = useTransfers();
  const baseCurrency = useBaseCurrency();
  const rates = useCurrencyStore((s) => s.rates);

  return useMemo(() => {
    return accounts
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((account) => {
        const cur = account.currency as CurrencyCode;
        let balance = account.initialBalance;

        for (const tx of transactions) {
          if (tx.accountId !== account._id) continue;
          const amt = convert(tx.amount, tx.currency as CurrencyCode, cur, rates);
          balance += tx.type === "income" ? amt : -amt;
        }
        for (const tr of transfers) {
          if (tr.fromAccountId === account._id) {
            balance -= convert(tr.amount, tr.currency as CurrencyCode, cur, rates);
          }
          if (tr.toAccountId === account._id) {
            balance += convert(tr.amount, tr.currency as CurrencyCode, cur, rates);
          }
        }

        return {
          account,
          balance,
          baseBalance: convert(balance, cur, baseCurrency, rates),
        };
      });
  }, [accounts, transactions, transfers, baseCurrency, rates]);
}

/** Net worth = sum of all non-archived account balances, in base currency. */
export function useNetWorth(): number {
  const balances = useAccountBalances();
  return useMemo(
    () => balances.filter((b) => !b.account.archived).reduce((s, b) => s + b.baseBalance, 0),
    [balances],
  );
}

/**
 * Compact, anonymised financial snapshot for the AI assistant & insights.
 * All amounts are already converted to the user's base currency.
 */
export function useFinanceSnapshot(): import("@/lib/ai-advisor").FinanceSnapshot {
  const baseCurrency = useBaseCurrency();
  const me = useMe();
  const summary = useMonthSummary();
  const spending = useCategorySpending(summary.monthly);
  const budgets = useBudgets();
  const goals = useGoals();
  const categories = useCategories();

  return useMemo(() => {
    const spentByCat = new Map<string, number>();
    for (const s of spending) spentByCat.set(s.category._id, s.amount);

    return {
      userName: me?.settings?.userName ?? me?.name ?? "",
      currency: baseCurrency,
      period: `${summary.from} — ${summary.to}`,
      income: Math.round(summary.income),
      expense: Math.round(summary.expense),
      balance: Math.round(summary.balance),
      savingsRate: summary.savingsRate,
      expenseTrend: summary.expenseTrend,
      transactionCount: summary.monthly.length,
      topCategories: spending.slice(0, 6).map((s) => ({
        name: s.category.name,
        amount: Math.round(s.amount),
        percent: s.percent,
      })),
      budgets: budgets
        .map((b) => {
          const cat = categories.find((c) => c._id === b.categoryId);
          return {
            name: cat?.name ?? "",
            limit: Math.round(b.amount),
            used: Math.round(spentByCat.get(b.categoryId) ?? 0),
          };
        })
        .filter((b) => b.name),
      goals: goals.map((g) => ({
        name: g.name,
        target: Math.round(g.target),
        saved: Math.round(g.saved),
      })),
    };
  }, [me, baseCurrency, summary, spending, budgets, goals, categories]);
}
