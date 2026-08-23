"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/settings/delivery-areas", label: "Delivery Areas" },
  { href: "/settings/pos", label: "POS" },
  { href: "/settings/coupons", label: "Coupons" },
  { href: "/settings/operating-hours", label: "Operating Hours" },
  { href: "/settings/storefront", label: "Storefront" },
];

export function SettingsTabs() {
  const pathname = usePathname();

  return (
    <div className="border-b flex gap-1 overflow-x-auto scrollbar-hide flex-nowrap">
      {TABS.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
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