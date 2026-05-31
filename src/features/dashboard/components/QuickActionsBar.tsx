"use client";

import Link from "next/link";
import { Plus, ClipboardList, Utensils } from "lucide-react";

const ACTIONS = [
  {
    label: "New Order",
    description: "Open POS",
    href: "/pos",
    icon: Plus,
    accent: true,
  },
  {
    label: "View Orders",
    description: "All orders",
    href: "/orders",
    icon: ClipboardList,
    accent: false,
  },
  {
    label: "Menu",
    description: "Edit items",
    href: "/menu",
    icon: Utensils,
    accent: false,
  },
] as const;

export function QuickActionsBar() {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {ACTIONS.map(({ label, description, href, icon: Icon, accent }) => (
        <Link
          key={href}
          href={href}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all duration-150 ${
            accent
              ? "bg-[#e8570e] border-[#e8570e] text-white hover:bg-[#c44a0c] hover:border-[#c44a0c] shadow-sm"
              : "bg-white border-[#ebe9e4] text-[#1a1815] hover:border-[#e8570e] hover:text-[#e8570e]"
          }`}
        >
          <Icon className="w-4 h-4" />
          <div className="flex flex-col leading-tight">
            <span>{label}</span>
            <span
              className={`text-[10px] font-normal ${
                accent ? "text-orange-100" : "text-[#8a8680]"
              }`}
            >
              {description}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}