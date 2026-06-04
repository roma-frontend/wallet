"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

interface Props {
  height: number;
  /** Render the chart with concrete pixel dimensions once they are known. */
  children: (size: { width: number; height: number }) => ReactNode;
  className?: string;
}

/**
 * Measures its own width with a ResizeObserver and only renders the chart once
 * it has real dimensions. This avoids Recharts' `ResponsiveContainer`
 * "width(0)/height(0)" warnings that fire during dynamic-import mounting.
 */
export function ChartFrame({ height, children, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={className} style={{ width: "100%", height }}>
      {width > 0 && children({ width, height })}
    </div>
  );
}
