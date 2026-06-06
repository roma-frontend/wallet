"use client";

import { useMemo } from "react";
import { Heart, TrendingUp, PiggyBank, Target, HandCoins } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useMonthSummary } from "@/hooks/use-finance";
import { useDataLoading } from "@/hooks/use-data";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

function getScoreColor(score: number) {
  if (score >= 80) return "text-success";
  if (score >= 60) return "text-primary";
  if (score >= 40) return "text-warning";
  return "text-destructive";
}

function getScoreLabel(score: number) {
  if (score >= 80) return t.health.excellent;
  if (score >= 60) return t.health.good;
  if (score >= 40) return t.health.fair;
  if (score >= 20) return t.health.poor;
  return t.health.critical;
}

function getScoreGradient(score: number) {
  if (score >= 80) return "from-success to-success/60";
  if (score >= 60) return "from-primary to-primary/60";
  if (score >= 40) return "from-warning to-warning/60";
  return "from-destructive to-destructive/60";
}

export function HealthScore() {
  const loading = useDataLoading();
  const summary = useMonthSummary();

  const score = useMemo(() => {
    if (loading) return 0;

    // Savings rate component (0-30 points)
    const savingsRate = Math.max(0, Math.min(100, summary.savingsRate));
    const savingsPoints = (savingsRate / 100) * 30;

    // Income vs expense balance (0-30 points)
    // If income > expense, full points. If expense > income, reduced proportionally.
    let balancePoints = 30;
    if (summary.income > 0) {
      const ratio = Math.min(1, summary.expense / summary.income);
      balancePoints = 30 * (1 - ratio * 0.7);
    } else if (summary.expense > 0) {
      balancePoints = 0;
    }

    // Positive balance bonus (0-20 points)
    const balanceBonus = summary.balance >= 0 ? 20 : Math.max(0, 20 + (summary.balance / 100000) * 20);

    // Trend improvement bonus (0-20 points)
    let trendPoints = 10; // neutral baseline
    if (summary.incomeTrend > 0) trendPoints += Math.min(5, summary.incomeTrend / 5);
    if (summary.expenseTrend < 0) trendPoints += Math.min(5, Math.abs(summary.expenseTrend) / 5);
    if (summary.expenseTrend > 20) trendPoints -= 5;

    const total = Math.round(Math.max(0, Math.min(100, savingsPoints + balancePoints + balanceBonus + trendPoints)));
    return total;
  }, [loading, summary]);

  if (loading) return null;

  const colorClass = getScoreColor(score);
  const label = getScoreLabel(score);
  const gradient = getScoreGradient(score);

  return (
    <Card className="md:col-span-4 md:row-span-2 overflow-hidden">
      <CardContent className="p-5 flex flex-col items-center justify-center h-full text-center space-y-4">
        {/* Circular score */}
        <div className="relative">
          <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
            {/* Background ring */}
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="var(--muted)"
              strokeWidth="8"
            />
            {/* Score ring */}
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${(score / 100) * 264} 264`}
              className={cn("transition-all duration-1000 ease-out", colorClass)}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn("text-3xl font-bold tabular", colorClass)}>{score}</span>
            <span className="text-[10px] text-muted-foreground font-medium">/ 100</span>
          </div>
        </div>

        {/* Label */}
        <div>
          <p className={cn("text-sm font-semibold", colorClass)}>{label}</p>
          <p className="text-xs text-muted-foreground">{t.health.title}</p>
        </div>

        {/* Mini breakdown */}
        <div className="w-full space-y-2 pt-2 border-t border-border/50">
          <div className="flex items-center gap-2 text-xs">
            <PiggyBank className="w-3 h-3 text-muted-foreground" />
            <span className="flex-1 text-left text-muted-foreground">{t.health.savingsRate}</span>
            <span className="tabular font-medium">{Math.max(0, summary.savingsRate).toFixed(0)}%</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <TrendingUp className="w-3 h-3 text-muted-foreground" />
            <span className="flex-1 text-left text-muted-foreground">{t.dashboard.balance}</span>
            <span className={cn("tabular font-medium", summary.balance >= 0 ? "text-success" : "text-destructive")}>
              {summary.balance >= 0 ? "+" : ""}{(summary.balance / 1000).toFixed(0)}k
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
