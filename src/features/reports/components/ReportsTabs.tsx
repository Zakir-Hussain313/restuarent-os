"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/reports/sales", label: "Sales" },
  { href: "/reports/orders", label: "Orders" },
  { href: "/reports/menu-performance", label: "Menu Performance" },
  { href: "/reports/attendance", label: "Staff & Attendance" },
];

export function ReportsTabs() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();

  return (
    <div className="border-b flex gap-1">
      {TABS.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={query ? `${tab.href}?${query}` : tab.href}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              isActive
                ? "border-[#1a1814] text-[#1a1814]"
                : "border-transparent text-[#8a8680] hover:text-[#1a1814]"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}