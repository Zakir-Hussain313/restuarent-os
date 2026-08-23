"use client";

import * as React from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function formatDisplay(value: Date | null): string {
  if (!value) return "Select date";
  return value.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function isSameDay(a: Date | null, b: Date | null): boolean {
  if (!a || !b) return false;
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function buildMonthGrid(month: Date): (Date | null)[] {
  const year = month.getFullYear();
  const m = month.getMonth();
  const firstDay = new Date(year, m, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, m + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, m, d));
  return cells;
}

interface DatePickerProps {
  value: Date | null;
  onChange: (value: Date) => void;
  min?: Date | null;
  max?: Date | null;
  className?: string;
  disabled?: boolean;
}

export function DatePicker({ value, onChange, min, max, className, disabled }: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [viewMonth, setViewMonth] = React.useState(() => value ?? new Date());

  const cells = buildMonthGrid(viewMonth);

  function isDisabled(day: Date): boolean {
    if (min && day < new Date(min.getFullYear(), min.getMonth(), min.getDate())) return true;
    if (max && day > new Date(max.getFullYear(), max.getMonth(), max.getDate())) return true;
    return false;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            disabled={disabled}
            className={cn(
              "flex items-center gap-2 h-8 px-2.5 rounded-lg bg-muted text-xs cursor-pointer transition-colors hover:bg-muted/70 focus-visible:ring-3 focus-visible:ring-primary/20 outline-none disabled:cursor-not-allowed disabled:opacity-50",
              className
            )}
          >
            <span>{formatDisplay(value)}</span>
            <CalendarDays className="w-3.5 h-3.5 text-muted-foreground ml-auto shrink-0" />
          </button>
        }
      />
      <PopoverContent className="w-64 p-3 ring-0" align="start">
        <div className="flex items-center justify-between mb-2">
          <button
            type="button"
            onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
            className="p-1 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold">
            {viewMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </span>
          <button
            type="button"
            onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
            className="p-1 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground hover:text-foreground"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {WEEKDAYS.map((w, i) => (
            <div key={i} className="text-center text-[10px] font-medium text-muted-foreground py-1">
              {w}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((day, i) => {
            if (!day) return <div key={i} />;
            const disabledDay = isDisabled(day);
            const selected = isSameDay(day, value);
            return (
              <button
                key={i}
                type="button"
                disabled={disabledDay}
                onClick={() => {
                  onChange(day);
                  setOpen(false);
                }}
                className={cn(
                  "aspect-square text-xs rounded-lg cursor-pointer transition-colors tabular-nums",
                  selected
                    ? "bg-primary-light text-primary font-semibold"
                    : "hover:bg-muted text-foreground",
                  disabledDay && "opacity-30 cursor-not-allowed hover:bg-transparent"
                )}
              >
                {day.getDate()}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}