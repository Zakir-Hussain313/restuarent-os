"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ReportPeriod } from "../lib/getReportDateRange";

const PERIOD_LABELS: Record<ReportPeriod, string> = {
  today: "Today",
  week: "This Week",
  month: "This Month",
  last_month: "Last Month",
};

interface ReportPeriodFilterProps {
  selectedPeriod: ReportPeriod;
}

export function ReportPeriodFilter({ selectedPeriod }: ReportPeriodFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(value: string | null) {
    if (!value) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Select value={selectedPeriod} onValueChange={handleChange}>
      <SelectTrigger className="w-48">
        <SelectValue placeholder="Select period" />
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(PERIOD_LABELS) as ReportPeriod[]).map((p) => (
          <SelectItem key={p} value={p}>
            {PERIOD_LABELS[p]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}