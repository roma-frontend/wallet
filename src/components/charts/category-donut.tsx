"use client";

import { Cell, Pie, PieChart } from "recharts";
import { formatCurrency } from "@/lib/format";
import { ChartFrame } from "./chart-frame";
import type { CurrencyCode } from "@/lib/types";

export interface DonutSlice {
  name: string;
  value: number;
  color: string;
}

interface Props {
  data: DonutSlice[];
  currency: CurrencyCode;
  centerLabel?: string;
  centerValue?: number;
}

export function CategoryDonut({ data, currency, centerLabel, centerValue }: Props) {
  const total = centerValue ?? data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="relative w-full" style={{ height: 240 }}>
      <ChartFrame height={240}>
        {({ width, height }) => (
          <PieChart width={width} height={height}>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={70}
              outerRadius={100}
              paddingAngle={2}
              stroke="none"
              startAngle={90}
              endAngle={-270}
            >
              {data.map((slice, i) => (
                <Cell key={i} fill={slice.color} />
              ))}
            </Pie>
          </PieChart>
        )}
      </ChartFrame>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        {centerLabel && <span className="text-xs text-muted-foreground">{centerLabel}</span>}
        <span className="text-lg font-bold tabular">
          {formatCurrency(total, currency, { compact: true })}
        </span>
      </div>
    </div>
  );
}
