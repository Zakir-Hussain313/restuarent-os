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
    <div className="hidden min-[800px]:flex items-center gap-3 flex-wrap">
      {ACTIONS.map(({ label, description, href, icon: Icon, accent }) => (
        <Link
          key={href}
          href={href}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-full border text-sm font-medium transition-all duration-150 ${
            accent
              ? "bg-coral border-coral text-white hover:bg-coral-hover hover:border-coral-hover shadow-sm"
              : "bg-card border-border text-foreground hover:border-primary hover:text-primary"
          }`}
        >
          <Icon className="w-4 h-4" />
          <div className="flex flex-col leading-tight">
            <span>{label}</span>
            <span
              className={`text-[10px] font-normal ${
                accent ? "text-white/80" : "text-muted-foreground"
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