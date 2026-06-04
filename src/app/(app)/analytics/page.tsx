"use client";

import { useMemo } from "react";
import { TrendingUp, TrendingDown, Calendar, Wallet, Target, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { AiInsights } from "@/components/shared/ai-insights";
import dynamic from "next/dynamic";
const TrendChart = dynamic(
  () => import("@/components/charts/trend-chart").then((m) => m.TrendChart),
  { ssr: false, loading: () => <Skeleton className="h-60 w-full rounded-xl" /> },
);
const CategoryDonut = dynamic(
  () => import("@/components/charts/category-donut").then((m) => m.CategoryDonut),
  { ssr: false, loading: () => <Skeleton className="h-60 w-full rounded-xl" /> },
);
import {
  useMonthSummary,
  useMonthlyTrend,
  useCategorySpending,
  usePeriodComparison,
} from "@/hooks/use-finance";
import { useBaseCurrency, useDataLoading, useTransactions } from "@/hooks/use-data";
import { formatCurrency, formatPercent } from "@/lib/format";
import { getIcon } from "@/lib/icons";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

function InsightCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "success" | "destructive";
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          <Icon className="w-4 h-4" />
          <span className="text-xs font-medium">{label}</span>
        </div>
        <p
          className={cn(
            "text-xl font-bold tabular",
            tone === "success" && "text-success",
            tone === "destructive" && "text-destructive",
          )}
        >
          {value}
        </p>
        {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export default function AnalyticsPage() {
  const baseCurrency = useBaseCurrency();
  const loading = useDataLoading();
  const transactions = useTransactions();
  const summary = useMonthSummary();
  const trend = useMonthlyTrend(6);
  const spending = useCategorySpending(summary.monthly);
  const comparison = usePeriodComparison();

  const insights = useMemo(() => {
    const expenses = summary.monthly.filter((tx) => tx.type === "expense");
    const now = new Date();
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dailyAverage = dayOfMonth > 0 ? summary.expense / dayOfMonth : 0;
    const forecast = dailyAverage * daysInMonth;
    const biggest = expenses.reduce(
      (max, tx) => (tx.amount > max ? tx.amount : max),
      0,
    );
    return { dailyAverage, forecast, biggest, count: summary.monthly.length };
  }, [summary]);

  const hasData = transactions.length > 0;

  return (
    <div>
      <PageHeader title={t.analytics.title} subtitle={t.analytics.subtitle} />

      {!loading && hasData && (
        <div className="mb-4">
          <AiInsights />
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-72 rounded-xl" />
        </div>
      ) : !hasData ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={BarChart3}
              title={t.common.noData}
              description={t.dashboard.addFirst}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Insights */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <InsightCard
              icon={Calendar}
              label={t.analytics.dailyAverage}
              value={formatCurrency(insights.dailyAverage, baseCurrency, { compact: true })}
            />
            <InsightCard
              icon={TrendingUp}
              label={t.analytics.biggestExpense}
              value={formatCurrency(insights.biggest, baseCurrency, { compact: true })}
            />
            <InsightCard
              icon={Wallet}
              label={t.dashboard.savingsRate}
              value={formatPercent(summary.savingsRate)}
              tone={summary.savingsRate >= 0 ? "success" : "destructive"}
            />
            <InsightCard
              icon={Target}
              label={t.dashboard.balance}
              value={formatCurrency(summary.balance, baseCurrency, { compact: true })}
              tone={summary.balance >= 0 ? "success" : "destructive"}
            />
          </div>

          {/* Forecast + comparison */}
          <div className="grid md:grid-cols-2 gap-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> {t.analytics.comparison}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-muted-foreground">{t.type.expense}</span>
                    <span
                      className={cn(
                        "text-sm font-medium tabular flex items-center gap-1",
                        summary.expenseTrend > 0 ? "text-destructive" : "text-success",
                      )}
                    >
                      {summary.expenseTrend > 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      {formatPercent(Math.abs(summary.expenseTrend))}
                    </span>
                  </div>
                  <p className="text-lg font-bold tabular">
                    {formatCurrency(summary.expense, baseCurrency, { compact: true })}
                  </p>
                  <p className="text-xs text-muted-foreground">{t.dashboard.vsLastMonth}</p>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-muted-foreground">{t.type.income}</span>
                    <span
                      className={cn(
                        "text-sm font-medium tabular flex items-center gap-1",
                        summary.incomeTrend >= 0 ? "text-success" : "text-destructive",
                      )}
                    >
                      {summary.incomeTrend >= 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      {formatPercent(Math.abs(summary.incomeTrend))}
                    </span>
                  </div>
                  <p className="text-lg font-bold tabular">
                    {formatCurrency(summary.income, baseCurrency, { compact: true })}
                  </p>
                  <p className="text-xs text-muted-foreground">{t.dashboard.vsLastMonth}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> {t.dashboard.monthlyOverview}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-1">
                  {t.analytics.dailyAverage} × {t.common.thisMonth}
                </p>
                <p className="text-3xl font-bold tabular mb-1">
                  {formatCurrency(insights.forecast, baseCurrency, { compact: true })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t.dashboard.totalExpense}:{" "}
                  {formatCurrency(summary.expense, baseCurrency, { compact: true })}
                </p>
                <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full gradient-primary rounded-full"
                    style={{
                      width: `${Math.min(100, insights.forecast > 0 ? (summary.expense / insights.forecast) * 100 : 0)}%`,
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Trend chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t.analytics.trend}</CardTitle>
            </CardHeader>
            <CardContent>
              <TrendChart data={trend} currency={baseCurrency} />
            </CardContent>
          </Card>

          {/* Category breakdown */}
          {spending.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t.analytics.byCategory}</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="list">
                  <TabsList className="mb-4">
                    <TabsTrigger value="list">{t.common.all}</TabsTrigger>
                    <TabsTrigger value="chart">{t.analytics.byCategory}</TabsTrigger>
                  </TabsList>
                  <TabsContent value="list" className="space-y-3">
                    {spending.map(({ category, amount, percent }) => {
                      const Icon = getIcon(category.icon);
                      return (
                        <div key={category._id}>
                          <div className="flex items-center gap-2 mb-1.5">
                            <Icon className="w-4 h-4" style={{ color: category.color }} />
                            <span className="text-sm flex-1 truncate">{category.name}</span>
                            <span className="text-sm font-medium tabular">
                              {formatCurrency(amount, baseCurrency, { compact: true })}
                            </span>
                            <span className="text-xs text-muted-foreground tabular w-12 text-right">
                              {percent.toFixed(0)}%
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${percent}%`, background: category.color }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </TabsContent>
                  <TabsContent value="chart">
                    <CategoryDonut
                      data={spending.map((s) => ({
                        name: s.category.name,
                        value: s.amount,
                        color: s.category.color,
                      }))}
                      currency={baseCurrency}
                      centerValue={summary.expense}
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}

          {/* Period comparison: this month vs last month */}
          {comparison.rows.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t.analytics.vsLastMonth}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <div className="rounded-xl border border-border p-3">
                    <p className="text-xs text-muted-foreground">{t.analytics.thisMonth}</p>
                    <p className="text-lg font-bold tabular">
                      {formatCurrency(comparison.currentTotal, baseCurrency, { compact: true })}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border p-3">
                    <p className="text-xs text-muted-foreground">{t.analytics.lastMonth}</p>
                    <p className="text-lg font-bold tabular text-muted-foreground">
                      {formatCurrency(comparison.previousTotal, baseCurrency, { compact: true })}
                    </p>
                  </div>
                </div>
                {comparison.rows.slice(0, 8).map(({ category, current, previous, delta, changePct }) => {
                  const Icon = getIcon(category.icon);
                  const up = delta > 0;
                  return (
                    <div key={category._id} className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 shrink-0" style={{ color: category.color }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{category.name}</p>
                        <p className="text-xs text-muted-foreground tabular">
                          {formatCurrency(previous, baseCurrency, { compact: true })} →{" "}
                          {formatCurrency(current, baseCurrency, { compact: true })}
                        </p>
                      </div>
                      <div
                        className={cn(
                          "flex items-center gap-1 text-sm font-medium tabular shrink-0",
                          up ? "text-destructive" : "text-success",
                        )}
                      >
                        {up ? (
                          <TrendingUp className="w-3.5 h-3.5" />
                        ) : (
                          <TrendingDown className="w-3.5 h-3.5" />
                        )}
                        {up ? "+" : ""}
                        {changePct.toFixed(0)}%
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
