"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/reports/sales", label: "Sales" },
  { href: "/reports/profitability", label: "Profitability" },
  { href: "/reports/orders", label: "Orders" },
  { href: "/reports/menu-performance", label: "Menu Performance" },
  { href: "/reports/attendance", label: "Staff & Attendance" },
];

const SUPER_ADMIN_ONLY_TABS = [
  { href: "/reports/branch-comparison", label: "Branch Comparison" },
];

interface ReportsTabsProps {
  isSuperAdmin: boolean;
}

export function ReportsTabs({ isSuperAdmin }: ReportsTabsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const tabs = isSuperAdmin ? [...TABS, ...SUPER_ADMIN_ONLY_TABS] : TABS;

  return (
    <div className="border-b flex gap-1 overflow-x-auto scrollbar-hide flex-nowrap">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={query ? `${tab.href}?${query}` : tab.href}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors shrink-0 whitespace-nowrap",
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}