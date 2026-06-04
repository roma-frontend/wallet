"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { TransactionRow } from "@/components/shared/transaction-row";
import { useTransactions, useBaseCurrency, useDataLoading } from "@/hooks/use-data";
import { useConvert } from "@/hooks/use-finance";
import { MONTHS_HY, WEEKDAYS_HY, t } from "@/lib/i18n";
import { formatCurrency, formatCompact, toISODate, todayISO } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function CalendarPage() {
  const transactions = useTransactions();
  const baseCurrency = useBaseCurrency();
  const convert = useConvert();
  const loading = useDataLoading();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState<string | null>(todayISO());

  /** Aggregate income/expense per ISO day for the visible month. */
  const byDay = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>();
    for (const tx of transactions) {
      const d = new Date(tx.date + "T00:00:00");
      if (d.getFullYear() !== year || d.getMonth() !== month) continue;
      const cur = map.get(tx.date) ?? { income: 0, expense: 0 };
      const val = convert(tx.amount, tx.currency);
      if (tx.type === "income") cur.income += val;
      else cur.expense += val;
      map.set(tx.date, cur);
    }
    return map;
  }, [transactions, year, month, convert]);

  const monthTotals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const v of byDay.values()) {
      income += v.income;
      expense += v.expense;
    }
    return { income, expense };
  }, [byDay]);

  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    const startDow = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const out: (string | null)[] = [];
    for (let i = 0; i < startDow; i++) out.push(null);
    for (let d = 1; d <= daysInMonth; d++) out.push(toISODate(new Date(year, month, d)));
    return out;
  }, [year, month]);

  const selectedTx = useMemo(() => {
    if (!selected) return [];
    return transactions
      .filter((tx) => tx.date === selected)
      .sort((a, b) => b._creationTime - a._creationTime);
  }, [transactions, selected]);

  const prev = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };
  const next = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };

  const today = todayISO();

  return (
    <div>
      <PageHeader title={t.calendar.title} subtitle={t.calendar.subtitle} />

      <div className="grid grid-cols-2 gap-3 mb-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t.calendar.monthIncome}</p>
            <p className="text-lg font-bold tabular text-success mt-1">{formatCurrency(monthTotals.income, baseCurrency)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t.calendar.monthExpense}</p>
            <p className="text-lg font-bold tabular text-destructive mt-1">{formatCurrency(monthTotals.expense, baseCurrency)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-3 sm:p-4">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-3">
            <Button variant="ghost" size="icon" className="w-8 h-8" onClick={prev} aria-label="<">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="font-semibold">{MONTHS_HY[month]} {year}</span>
            <Button variant="ghost" size="icon" className="w-8 h-8" onClick={next} aria-label=">">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS_HY.map((w) => (
              <div key={w} className="text-center text-[10px] font-medium text-muted-foreground py-1">{w}</div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((iso, i) => {
              if (!iso) return <div key={`e${i}`} />;
              const data = byDay.get(iso);
              const net = data ? data.income - data.expense : 0;
              const isToday = iso === today;
              const isSelected = iso === selected;
              const dayNum = Number(iso.slice(8, 10));
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => setSelected(iso)}
                  className={cn(
                    "aspect-square rounded-lg border p-1 flex flex-col items-center justify-start text-center transition-colors",
                    isSelected ? "border-primary bg-primary/5" : "border-transparent hover:bg-muted/50",
                    isToday && !isSelected && "border-border",
                  )}
                >
                  <span className={cn("text-[11px] leading-none mb-0.5", isToday && "font-bold text-primary")}>{dayNum}</span>
                  {data && (
                    <span className="flex flex-col items-center gap-px w-full">
                      {data.income > 0 && (
                        <span className="text-[8px] leading-tight text-success tabular truncate w-full">+{formatCompact(data.income)}</span>
                      )}
                      {data.expense > 0 && (
                        <span className="text-[8px] leading-tight text-destructive tabular truncate w-full">−{formatCompact(data.expense)}</span>
                      )}
                    </span>
                  )}
                  {data && (
                    <span
                      className={cn("mt-auto h-1 w-1 rounded-full", net >= 0 ? "bg-success" : "bg-destructive")}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected day details */}
      {selected && (
        <Card className="mt-4">
          <CardContent className="p-4">
            <p className="font-semibold mb-2">{t.calendar.dayDetails} · {selected}</p>
            {loading ? null : selectedTx.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">{t.calendar.noActivity}</p>
            ) : (
              <div className="divide-y divide-border">
                {selectedTx.map((tx) => (
                  <TransactionRow key={tx._id} transaction={tx} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
