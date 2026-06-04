"use client";

import { useEffect, useRef, useState } from "react";
import { animate } from "motion";
import { formatCurrency } from "@/lib/format";
import type { CurrencyCode } from "@/lib/types";

interface Props {
  value: number;
  currency?: CurrencyCode;
  /** Show +/- sign for the value */
  sign?: boolean;
  compact?: boolean;
  className?: string;
}

/** Animated number that counts up to its value on mount and changes. */
export function AnimatedNumber({ value, currency, sign, compact, className }: Props) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    const controls = animate(prev.current, value, {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(v),
    });
    prev.current = value;
    return () => controls.stop();
  }, [value]);

  const text = currency
    ? formatCurrency(display, currency, { sign, compact })
    : new Intl.NumberFormat("hy-AM", { maximumFractionDigits: 0 }).format(display);

  return (
    <span className={className} suppressHydrationWarning>
      {text}
    </span>
  );
}
