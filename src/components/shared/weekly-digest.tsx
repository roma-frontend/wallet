"use client";

import { useMemo } from "react";
import { TrendingUp, TrendingDown, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useMonthSummary, useCategorySpending } from "@/hooks/use-finance";
import { useBaseCurrency, useDataLoading } from "@/hooks/use-data";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

export function WeeklyDigest() {
  const loading = useDataLoading();
  const baseCurrency = useBaseCurrency();
  const summary = useMonthSummary();
  const spending = useCategorySpending(summary.monthly);

  const digest = useMemo(() => {
    if (loading || summary.monthly.length === 0) return null;

    const topCategory = spending.length > 0 ? spending[0] : null;
    const expenseTrend = summary.expenseTrend;
    const savingsRate = Math.max(0, summary.savingsRate);
    const txCount = summary.monthly.length;

    let headline: string;
    let tone: "positive" | "neutral" | "warning";

    if (expenseTrend < -10) {
      headline = `Այս ամիս ծախսերը նվազել են ${Math.abs(expenseTrend).toFixed(0)}%-ով 🎉`;
      tone = "positive";
    } else if (expenseTrend > 20) {
      headline = `Ծախսերն աճել են ${expenseTrend.toFixed(0)}%-ով նախորդ ամսվա համեմատ`;
      tone = "warning";
    } else if (savingsRate > 20) {
      headline = `Խնայողության տոկոսը ${savingsRate.toFixed(0)}% է — շարունակե՛ք`;
      tone = "positive";
    } else {
      headline = `${txCount} գործարք այս ամիս`;
      tone = "neutral";
    }

    return {
      headline,
      tone,
      topCategory,
      expenseTrend,
      totalExpense: summary.expense,
    };
  }, [loading, summary, spending]);

  if (loading || !digest) return null;

  return (
    <Card className="overflow-hidden border-none bg-gradient-to-br from-primary/10 via-accent/20 to-primary/5">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">Շաբաթվա ամփոփում</h3>
        </div>

        <p
          className={cn(
            "text-lg font-bold leading-snug text-balance",
            digest.tone === "positive" && "text-success",
            digest.tone === "warning" && "text-warning",
            digest.tone === "neutral" && "text-foreground",
          )}
        >
          {digest.headline}
        </p>

        <div className="flex flex-wrap gap-4 text-sm">
          {digest.topCategory && (
            <div className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: digest.topCategory.category.color }}
              />
              <span className="text-muted-foreground">Տոպ կատեգորիա:</span>
              <span className="font-medium truncate max-w-[120px]">
                {digest.topCategory.category.name}
              </span>
              <span className="tabular text-muted-foreground">
                ({digest.topCategory.percent.toFixed(0)}%)
              </span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            {digest.expenseTrend <= 0 ? (
              <TrendingDown className="w-3.5 h-3.5 text-success" />
            ) : (
              <TrendingUp className="w-3.5 h-3.5 text-destructive" />
            )}
            <span className="text-muted-foreground"> Ընդհանուր ծախսեր:</span>
            <span className="font-medium tabular">
              {formatCurrency(digest.totalExpense, baseCurrency, { compact: true })}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
