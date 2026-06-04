import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AnimatedNumber } from "./animated-number";
import type { CurrencyCode } from "@/lib/types";

interface Props {
  label: string;
  value: number;
  currency: CurrencyCode;
  icon: LucideIcon;
  /** Tailwind text color class for the icon, e.g. "text-success" */
  accent?: string;
  trend?: number;
  /** When true a positive trend is good (green); for expenses set false. */
  trendPositiveIsGood?: boolean;
  sign?: boolean;
}

export function StatCard({
  label,
  value,
  currency,
  icon: Icon,
  accent = "text-primary",
  trend,
  trendPositiveIsGood = true,
  sign,
}: Props) {
  const hasTrend = typeof trend === "number" && isFinite(trend) && trend !== 0;
  const up = (trend ?? 0) > 0;
  const good = up === trendPositiveIsGood;

  return (
    <Card className="p-4 md:p-5 relative overflow-hidden group">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs md:text-sm text-muted-foreground font-medium">{label}</span>
        <div className={cn("w-8 h-8 rounded-lg bg-muted flex items-center justify-center", accent)}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <AnimatedNumber
        value={value}
        currency={currency}
        sign={sign}
        compact
        className="text-xl md:text-2xl font-bold tabular tracking-tight"
      />
      {hasTrend && (
        <div
          className={cn(
            "flex items-center gap-1 mt-2 text-xs font-medium",
            good ? "text-success" : "text-destructive",
          )}
        >
          {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          <span className="tabular">{Math.abs(trend!).toFixed(0)}%</span>
        </div>
      )}
    </Card>
  );
}
