"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MONTHS_HY } from "@/lib/i18n";
import { formatCurrency, formatCompact } from "@/lib/format";
import { t } from "@/lib/i18n";
import { ChartFrame } from "./chart-frame";
import type { CurrencyCode } from "@/lib/types";

interface Point {
  monthIndex: number;
  income: number;
  expense: number;
}

interface Props {
  data: Point[];
  currency: CurrencyCode;
}

interface TooltipPayloadItem {
  name?: string;
  value?: number;
  color?: string;
  dataKey?: string;
}

function ChartTooltip({
  active,
  payload,
  label,
  currency,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: number;
  currency: CurrencyCode;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-popover px-3 py-2 shadow-soft text-xs">
      <p className="font-semibold mb-1">{MONTHS_HY[label ?? 0]}</p>
      {payload.map((item) => (
        <p key={item.dataKey} className="flex items-center gap-2 tabular">
          <span className="w-2 h-2 rounded-full" style={{ background: item.color }} />
          {item.name}: {formatCurrency(item.value ?? 0, currency, { compact: true })}
        </p>
      ))}
    </div>
  );
}

export function TrendChart({ data, currency }: Props) {
  return (
    <ChartFrame height={240}>
      {({ width, height }) => (
        <AreaChart
          width={width}
          height={height}
          data={data}
          margin={{ top: 10, right: 8, left: -8, bottom: 0 }}
        >
        <defs>
          <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-5)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--chart-5)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="monthIndex"
          tickFormatter={(i: number) => MONTHS_HY[i]?.slice(0, 3) ?? ""}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v: number) => formatCompact(v)}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          axisLine={false}
          tickLine={false}
          width={44}
        />
        <Tooltip content={<ChartTooltip currency={currency} />} />
        <Area
          type="monotone"
          dataKey="income"
          name={t.type.income}
          stroke="var(--chart-1)"
          strokeWidth={2.5}
          fill="url(#incomeGrad)"
        />
        <Area
          type="monotone"
          dataKey="expense"
          name={t.type.expense}
          stroke="var(--chart-5)"
          strokeWidth={2.5}
          fill="url(#expenseGrad)"
        />
        </AreaChart>
      )}
    </ChartFrame>
  );
}
