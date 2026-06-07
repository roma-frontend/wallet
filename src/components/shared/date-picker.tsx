"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MONTHS_HY, WEEKDAYS_HY } from "@/lib/i18n";
import { formatDate, parseISO, toISODate, todayISO } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Props {
  /** ISO date string yyyy-MM-dd. */
  value: string;
  onChange: (iso: string) => void;
  className?: string;
  placeholder?: string;
  id?: string;
}

/** Armenian-localised date picker that replaces the native (OS-locale) date input. */
export function DatePicker({ value, onChange, className, placeholder, id }: Props) {
  const [open, setOpen] = useState(false);
  const selected = value || todayISO();
  const selDate = parseISO(selected);
  const [viewYear, setViewYear] = useState(selDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(selDate.getMonth());

  const days = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    const startDow = first.getDay(); // 0 = Sunday
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (string | null)[] = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(toISODate(new Date(viewYear, viewMonth, d)));
    }
    return cells;
  }, [viewYear, viewMonth]);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const today = todayISO();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-start font-normal",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <CalendarDays className="w-4 h-4" />
          {value ? formatDate(value) : placeholder ?? ""}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <div className="flex items-center justify-between mb-3">
          <Button type="button" variant="ghost" size="icon" className="w-7 h-7" onClick={prevMonth} aria-label="<">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-semibold">
            {MONTHS_HY[viewMonth]} {viewYear}
          </span>
          <Button type="button" variant="ghost" size="icon" className="w-7 h-7" onClick={nextMonth} aria-label=">">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAYS_HY.map((w) => (
            <div key={w} className="text-center text-[10px] font-medium text-muted-foreground py-1">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((iso, i) =>
            iso === null ? (
              <div key={`e${i}`} />
            ) : (
              <button
                key={iso}
                type="button"
                onClick={() => {
                  onChange(iso);
                  setOpen(false);
                }}
                className={cn(
                  "h-8 w-8 rounded-md text-xs tabular transition-colors hover:bg-accent",
                  iso === selected && "bg-primary text-primary-foreground hover:bg-primary dark:text-white",
                  iso === today && iso !== selected && "ring-1 ring-primary/40",
                )}
              >
                {parseISO(iso).getDate()}
              </button>
            ),
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
