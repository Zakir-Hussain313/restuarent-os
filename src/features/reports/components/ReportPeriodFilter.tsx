"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { CalendarRange, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DatePicker, toDateKey, fromDateKey } from "@/components/ui/date-picker";
import { PERIOD_LABELS, PERIOD_GROUPS, type ReportPeriod } from "../lib/getReportDateRange";

interface ReportPeriodFilterProps {
  selectedPeriod: ReportPeriod;
}

function formatDateShort(date: Date): string {
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function ReportPeriodFilter({ selectedPeriod }: ReportPeriodFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  const currentStart = searchParams.get("start");
  const currentEnd = searchParams.get("end");

  const [customStart, setCustomStart] = useState<Date | null>(
    currentStart ? fromDateKey(currentStart) : null
  );
  const [customEnd, setCustomEnd] = useState<Date | null>(
    currentEnd ? fromDateKey(currentEnd) : null
  );

  function applyPeriod(period: ReportPeriod, start?: string, end?: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", period);
    if (start && end) {
      params.set("start", start);
      params.set("end", end);
    } else {
      params.delete("start");
      params.delete("end");
    }
    router.push(`${pathname}?${params.toString()}`);
    setOpen(false);
  }

  function handleApplyCustom() {
    if (!customStart || !customEnd) return;
    applyPeriod("custom", toDateKey(customStart), toDateKey(customEnd));
  }

  const triggerLabel =
    selectedPeriod === "custom" && currentStart && currentEnd
      ? `${formatDateShort(fromDateKey(currentStart))} – ${formatDateShort(fromDateKey(currentEnd))}`
      : PERIOD_LABELS[selectedPeriod];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="flex items-center gap-2 h-9 px-3 rounded-xl border border-border bg-card text-sm cursor-pointer transition-colors hover:bg-muted"
          >
            <CalendarRange className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-foreground font-medium whitespace-nowrap">{triggerLabel}</span>
          </button>
        }
      />
      <PopoverContent className="w-85 p-0 ring-0" align="end">
        <div className="flex flex-col divide-y divide-border">
          <div className="p-3 space-y-3">
            {PERIOD_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground px-1 mb-1">
                  {group.label}
                </p>
                <div className="grid grid-cols-2 gap-1">
                  {group.periods.map((p) => {
                    const isSelected = selectedPeriod === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => applyPeriod(p)}
                        className={cn(
                          "flex items-center justify-between gap-1 px-2.5 py-1.5 rounded-lg text-xs text-left cursor-pointer transition-colors",
                          isSelected
                            ? "bg-primary-light text-primary font-semibold"
                            : "hover:bg-muted text-foreground"
                        )}
                      >
                        {PERIOD_LABELS[p]}
                        {isSelected && <Check className="w-3 h-3 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground px-1">
              Custom Range
            </p>
            <div className="flex items-center gap-2">
              <DatePicker value={customStart} onChange={setCustomStart} max={customEnd} className="flex-1" />
              <span className="text-xs text-muted-foreground shrink-0">to</span>
              <DatePicker value={customEnd} onChange={setCustomEnd} min={customStart} className="flex-1" />
            </div>
            <button
              type="button"
              disabled={!customStart || !customEnd}
              onClick={handleApplyCustom}
              className="w-full h-8 rounded-lg bg-primary text-primary-foreground text-xs font-medium cursor-pointer transition-colors hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Apply
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}