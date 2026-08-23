"use client";

import * as React from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1); // 1–12
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5); // 0,5,10...55
const PERIODS = ["AM", "PM"] as const;

function to24Hour(hour12: number, minute: number, period: "AM" | "PM"): string {
  let hour24 = hour12 % 12;
  if (period === "PM") hour24 += 12;
  return `${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function from24Hour(value: string | null | undefined): { hour: number; minute: number; period: "AM" | "PM" } {
  if (!value) return { hour: 9, minute: 0, period: "AM" };
  const [h, m] = value.split(":").map(Number);
  const period: "AM" | "PM" = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return { hour, minute: m ?? 0, period };
}

function formatDisplay(value: string | null | undefined): string {
  if (!value) return "Select time";
  const { hour, minute, period } = from24Hour(value);
  return `${hour}:${String(minute).padStart(2, "0")} ${period}`;
}

interface TimePickerProps {
  value: string | null | undefined; // "HH:mm" 24-hour
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

export function TimePicker({ value, onChange, className, disabled }: TimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const parsed = from24Hour(value);

  function commit(patch: Partial<{ hour: number; minute: number; period: "AM" | "PM" }>) {
    const next = { ...parsed, ...patch };
    onChange(to24Hour(next.hour, next.minute, next.period));
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            disabled={disabled}
            className={cn(
              "flex items-center gap-2 h-9 px-3 rounded-lg bg-muted text-sm cursor-pointer transition-colors hover:bg-muted/70 focus-visible:ring-3 focus-visible:ring-primary/20 outline-none disabled:cursor-not-allowed disabled:opacity-50",
              className
            )}
          >
            <span className="tabular-nums">{formatDisplay(value)}</span>
            <Clock className="w-3.5 h-3.5 text-muted-foreground ml-auto shrink-0" />
          </button>
        }
      />
      <PopoverContent className="w-auto p-1.5 ring-0" align="start">
        <div className="flex gap-1">
          {/* Hours */}
          <div className="w-14 max-h-56 overflow-y-auto themed-scrollbar space-y-0.5 pr-1">
            {HOURS.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => commit({ hour: h })}
                className={cn(
                  "w-full text-center py-1.5 text-sm rounded-lg cursor-pointer transition-colors tabular-nums",
                  parsed.hour === h
                    ? "bg-primary-light text-primary font-semibold"
                    : "hover:bg-muted text-foreground"
                )}
              >
                {h}
              </button>
            ))}
          </div>

          {/* Minutes */}
          <div className="w-14 max-h-56 overflow-y-auto themed-scrollbar space-y-0.5 px-1">
            {MINUTES.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => commit({ minute: m })}
                className={cn(
                  "w-full text-center py-1.5 text-sm rounded-lg cursor-pointer transition-colors tabular-nums",
                  parsed.minute === m
                    ? "bg-primary-light text-primary font-semibold"
                    : "hover:bg-muted text-foreground"
                )}
              >
                {String(m).padStart(2, "0")}
              </button>
            ))}
          </div>

          {/* AM/PM */}
          <div className="w-14 space-y-0.5 pl-1">
            {PERIODS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => commit({ period: p })}
                className={cn(
                  "w-full text-center py-1.5 text-sm rounded-lg cursor-pointer transition-colors",
                  parsed.period === p
                    ? "bg-primary-light text-primary font-semibold"
                    : "hover:bg-muted text-foreground"
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}