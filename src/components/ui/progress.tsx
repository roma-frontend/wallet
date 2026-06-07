"use client"

import * as React from "react"
import { Progress as ProgressPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Progress({
  className,
  value,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> & {
  "aria-label"?: string;
  "aria-labelledby"?: string;
}) {
  const hasLabel = Boolean(ariaLabel || ariaLabelledBy);
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      // Radix sets role="progressbar" automatically; ensure determinate state
      // is communicated when a value is provided.
      {...(value != null ? { "data-state": "complete" } : {})}
      className={cn(
        "relative flex h-1 w-full items-center overflow-x-hidden rounded-full bg-muted",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="size-full flex-1 bg-primary transition-all"
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
