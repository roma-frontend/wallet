"use client";

import { AlertTriangle, TrendingUp } from "lucide-react";
import { useAnomalies } from "@/hooks/use-finance";
import { useBaseCurrency } from "@/hooks/use-data";
import { formatCurrency } from "@/lib/format";
import { getIcon } from "@/lib/icons";
import { t } from "@/lib/i18n";

/**
 * Proactive banner that surfaces categories where the user is spending
 * noticeably more than their recent average this month.
 */
export function AnomalyAlert() {
  const anomalies = useAnomalies();
  const baseCurrency = useBaseCurrency();

  if (anomalies.length === 0) return null;

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-4.5 h-4.5 text-amber-600 dark:text-amber-400" />
        <p className="font-semibold text-sm">{t.anomaly.title}</p>
      </div>
      <p className="text-sm text-muted-foreground mb-3">{t.anomaly.spendingMore}</p>
      <div className="space-y-2.5">
        {anomalies.slice(0, 3).map(({ category, current, average, ratio }) => {
          const Icon = getIcon(category.icon);
          return (
            <div key={category._id} className="flex items-center gap-2.5">
              <Icon className="w-4 h-4 shrink-0" style={{ color: category.color }} />
              <span className="text-sm flex-1 truncate">{category.name}</span>
              <span className="text-xs text-muted-foreground tabular">
                {formatCurrency(average, baseCurrency, { compact: true })} {t.anomaly.vsUsual}
              </span>
              <span className="flex items-center gap-1 text-sm font-semibold text-destructive tabular shrink-0">
                <TrendingUp className="w-3.5 h-3.5" />
                {ratio.toFixed(1)}× ({formatCurrency(current, baseCurrency, { compact: true })})
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
