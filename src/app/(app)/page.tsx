"use client";

import Link from "next/link";
import { Wallet, TrendingUp, TrendingDown, PiggyBank, ArrowRight, Receipt } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { AddTransactionDialog } from "@/components/shared/add-transaction-dialog";
import { TransactionRow } from "@/components/shared/transaction-row";
import { AnomalyAlert } from "@/components/shared/anomaly-alert";
import { AnimatedNumber } from "@/components/shared/animated-number";
import { HealthScore } from "@/components/shared/health-score";
import { SpendingHeatmap } from "@/components/shared/spending-heatmap";
import { WeeklyDigest } from "@/components/shared/weekly-digest";
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
  useCategorySpending,
  useRecentTransactions,
  useMonthlyTrend,
  useNetWorth,
} from "@/hooks/use-finance";
import { useMe, useBaseCurrency, useAccounts, useDataLoading } from "@/hooks/use-data";
import { usePrefsStore } from "@/store/use-prefs-store";
import { formatCurrency, formatPercent } from "@/lib/format";
import { getIcon } from "@/lib/icons";
import { t } from "@/lib/i18n";

function greeting() {
  const h = new Date().getHours();
  if (h < 6) return t.dashboard.greetingEvening;
  if (h < 12) return t.dashboard.greetingMorning;
  if (h < 18) return t.dashboard.greetingDay;
  return t.dashboard.greetingEvening;
}

export default function DashboardPage() {
  const me = useMe();
  const baseCurrency = useBaseCurrency();
  const loading = useDataLoading();
  const summary = useMonthSummary();
  const spending = useCategorySpending(summary.monthly);
  const recent = useRecentTransactions(6);
  const trend = useMonthlyTrend(6);
  const netWorth = useNetWorth();
  const accounts = useAccounts();
  const widgets = usePrefsStore((s) => s.widgets);

  const name = me?.settings?.userName || "";

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid lg:grid-cols-3 gap-4">
          <Skeleton className="h-72 rounded-xl lg:col-span-2" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-balance">
            {greeting()}
            {name && <span className="text-gradient"> {name}</span>}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t.appTagline}</p>
        </div>
        <div className="hidden md:block">
          <AddTransactionDialog label={t.form.addTransaction} />
        </div>
      </div>

      <AnomalyAlert />

      {/* Bento Grid Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4">
        {/* Balance Hero — col-span-8 on desktop */}
        {widgets.balance && (
          <Card
            className="md:col-span-8 overflow-hidden border-none gradient-primary text-white shadow-soft"
            style={{ viewTransitionName: "balance-hero" } as React.CSSProperties}
          >
            <CardContent className="p-6">
              <p className="text-sm/none text-white/80">{t.dashboard.balance}</p>
              <p className="text-3xl md:text-4xl font-bold tabular mt-2">
                <AnimatedNumber value={summary.balance} currency={baseCurrency} />
              </p>
              <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4 text-sm">
                <span className="flex items-center gap-1.5 text-white/90">
                  <TrendingUp className="w-4 h-4" />
                  {t.dashboard.totalIncome}: {formatCurrency(summary.income, baseCurrency, { compact: true })}
                </span>
                <span className="flex items-center gap-1.5 text-white/90">
                  <TrendingDown className="w-4 h-4" />
                  {t.dashboard.totalExpense}: {formatCurrency(summary.expense, baseCurrency, { compact: true })}
                </span>
                {accounts.length > 0 && (
                  <Link
                    href="/accounts"
                    className="flex items-center gap-1.5 text-white/90 hover:text-white transition-colors"
                  >
                    <Wallet className="w-4 h-4" />
                    {t.netWorth.title}: {formatCurrency(netWorth, baseCurrency, { compact: true })}
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Health Score — col-span-4, row-span-2 on desktop */}
        <HealthScore />

        {/* Savings Rate — col-span-4, row-span-2 on desktop */}
        {widgets.stats && (
          <Card className="md:col-span-4 md:row-span-2 p-4 md:p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs md:text-sm text-muted-foreground font-medium">
                {t.dashboard.savingsRate}
              </span>
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-primary">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl md:text-2xl font-bold tabular">
              {formatPercent(Math.max(0, summary.savingsRate))}
            </p>
            <Progress
              value={Math.max(0, Math.min(100, summary.savingsRate))}
              aria-label={t.dashboard.savingsRate}
              className="mt-3 h-1.5"
            />
            <div className="mt-4 pt-4 border-t border-border/50 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">{t.dashboard.savings}</p>
                <p className="text-lg font-bold tabular text-primary">
                  <AnimatedNumber value={summary.balance} currency={baseCurrency} compact />
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Income StatCard */}
        {widgets.stats && (
          <StatCard
            className="md:col-span-4"
            label={t.dashboard.totalIncome}
            value={summary.income}
            currency={baseCurrency}
            icon={TrendingUp}
            accent="text-success"
            trend={summary.incomeTrend}
            trendPositiveIsGood
          />
        )}

        {/* Expense StatCard */}
        {widgets.stats && (
          <StatCard
            className="md:col-span-4"
            label={t.dashboard.totalExpense}
            value={summary.expense}
            currency={baseCurrency}
            icon={TrendingDown}
            accent="text-destructive"
            trend={summary.expenseTrend}
            trendPositiveIsGood={false}
          />
        )}

        {/* Trend Chart — col-span-8 on desktop */}
        {widgets.charts && (
          <Card className="md:col-span-8">
            <CardHeader>
              <CardTitle className="text-base">{t.dashboard.incomeVsExpense}</CardTitle>
            </CardHeader>
            <CardContent>
              <TrendChart data={trend} currency={baseCurrency} />
            </CardContent>
          </Card>
        )}

        {/* Category Donut — col-span-4 on desktop */}
        {widgets.charts && (
          <Card className="md:col-span-4">
            <CardHeader>
              <CardTitle className="text-base">{t.dashboard.spendingByCategory}</CardTitle>
            </CardHeader>
            <CardContent>
              {spending.length === 0 ? (
                <EmptyState icon={Receipt} title={t.dashboard.noTransactions} />
              ) : (
                <>
                  <CategoryDonut
                    data={spending.map((s) => ({
                      name: s.category.name,
                      value: s.amount,
                      color: s.category.color,
                    }))}
                    currency={baseCurrency}
                    centerLabel={t.dashboard.totalExpense}
                    centerValue={summary.expense}
                  />
                  <ul className="mt-4 space-y-2">
                    {spending.slice(0, 4).map((s) => (
                      <li key={s.category._id} className="flex items-center gap-2 text-sm">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ background: s.category.color }}
                        />
                        <span className="flex-1 truncate">{s.category.name}</span>
                        <span className="text-muted-foreground tabular">
                          {s.percent.toFixed(0)}%
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Weekly Digest + Heatmap row */}
      <div className="grid md:grid-cols-2 gap-3 md:gap-4">
        <WeeklyDigest />
        <SpendingHeatmap />
      </div>

      {/* Recent transactions */}
      {widgets.recent && (
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">{t.dashboard.recentTransactions}</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link href="/expenses">
              {t.dashboard.seeAll} <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title={t.dashboard.noTransactions}
              description={t.dashboard.addFirst}
              action={<AddTransactionDialog label={t.form.addTransaction} />}
            />
          ) : (
            <div className="divide-y divide-border/60">
              {recent.map((tx) => (
                <TransactionRow key={tx._id} transaction={tx} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {/* Top categories spending bars */}
      {widgets.topCategories && spending.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.dashboard.topCategories}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {spending.slice(0, 5).map((s) => {
              const Icon = getIcon(s.category.icon);
              return (
                <div key={s.category._id} className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm">
                    <span
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: s.category.color + "20" }}
                    >
                      <Icon className="w-3.5 h-3.5" style={{ color: s.category.color }} />
                    </span>
                    <span className="flex-1 font-medium truncate">{s.category.name}</span>
                    <span className="tabular text-muted-foreground">
                      {formatCurrency(s.amount, baseCurrency, { compact: true })}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${s.percent}%`, background: s.category.color }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
