"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTransactions, useBaseCurrency } from "@/hooks/use-data";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

function getIntensityColor(amount: number, max: number) {
  if (max === 0 || amount === 0) return "var(--muted)";
  const intensity = Math.min(1, amount / max);
  return `color-mix(in oklch, var(--primary) ${Math.round(intensity * 100)}%, var(--muted))`;
}

export function SpendingHeatmap() {
  const transactions = useTransactions();
  const baseCurrency = useBaseCurrency();

  const { grid, maxDaily } = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();

    const dailyTotals: Record<number, number> = {};
    transactions.forEach((tx) => {
      if (tx.type !== "expense") return;
      const d = new Date(tx.date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        dailyTotals[day] = (dailyTotals[day] || 0) + tx.amount;
      }
    });

    const max = Math.max(...Object.values(dailyTotals), 0);

    const cells: { day: number | null; amount: number }[] = [];
    for (let i = 0; i < firstDay; i++) {
      cells.push({ day: null, amount: 0 });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, amount: dailyTotals[d] || 0 });
    }

    return { grid: cells, maxDaily: max };
  }, [transactions]);

  const weekdays = ["Կ", "Ե", "Ե", "Չ", "Հ", "Ո", "Շ"];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t.nav.calendar}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1 mb-1">
          {weekdays.map((w, i) => (
            <div key={i} className="text-[10px] text-center text-muted-foreground font-medium">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {grid.map((cell, i) => (
            <div
              key={i}
              className={cn(
                "aspect-square rounded-md flex items-center justify-center text-[10px] tabular transition-colors",
                cell.day === null ? "invisible" : "cursor-default",
              )}
              style={{
                background: cell.day ? getIntensityColor(cell.amount, maxDaily) : undefined,
              }}
              title={cell.day ? `${cell.day}: ${cell.amount.toLocaleString()} ${baseCurrency}` : undefined}
            >
              {cell.day}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-end gap-1.5 mt-3 text-[10px] text-muted-foreground">
          <span>Քիչ</span>
          <div className="flex gap-0.5">
            {[0, 0.25, 0.5, 0.75, 1].map((v) => (
              <div
                key={v}
                className="w-3 h-3 rounded-sm"
                style={{ background: getIntensityColor(v, 1) }}
              />
            ))}
          </div>
          <span>Շատ</span>
        </div>
      </CardContent>
    </Card>
  );
}
