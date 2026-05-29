"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  ShoppingCart,
  ClipboardList,
  UtensilsCrossed,
  BookOpen,
  Users,
  UserCog,
  BarChart3,
  Settings2,
  Menu,
  X,
  Flame,
  Circle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_GROUPS } from "@/config/nav";
import { mockCurrentStaff } from "@/mock-data";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  ShoppingCart,
  ClipboardList,
  UtensilsCrossed,
  BookOpen,
  Users,
  UserCog,
  BarChart3,
  Settings2,
};

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(true);

  return (
    <aside
      className={cn(
        "relative z-40 flex flex-col h-screen bg-white border-r border-[#ebe9e4] transition-all duration-300 ease-in-out shrink-0 overflow-hidden",
        open ? "w-56" : "w-14"
      )}
    >
      {/* Header: burger + logo */}
      <div className="h-14 flex items-center shrink-0 border-b border-[#ebe9e4]">
        <button
          onClick={() => setOpen(!open)}
          className="w-14 h-14 flex items-center justify-center shrink-0 text-[#4a4744] hover:text-[#e8570e] transition-colors"
          aria-label="Toggle sidebar"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        <div
          className={cn(
            "flex items-center gap-2 transition-all duration-200 overflow-hidden",
            open ? "opacity-100 w-auto pr-4" : "opacity-0 w-0"
          )}
        >
          <div className="w-6 h-6 rounded-md bg-[#e8570e] flex items-center justify-center shrink-0">
            <Flame className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-[#1a1814] font-semibold text-sm tracking-tight whitespace-nowrap">
            Rice n Spice
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 space-y-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            {open && (
              <p className="px-4 mb-1 text-[10px] font-semibold uppercase tracking-widest text-[#b0ada8]">
                {group.label}
              </p>
            )}
            <ul className="space-y-0.5 px-2">
              {group.items.map((item) => {
                const Icon = ICON_MAP[item.icon];
                const isActive =
                  pathname === item.href || pathname.startsWith(item.href + "/");

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={!open ? item.label : undefined}
                      className={cn(
                        "flex items-center h-10 rounded-lg text-sm font-medium transition-all duration-150",
                        isActive
                          ? "bg-[#fef3ed] text-[#e8570e]"
                          : "text-[#4a4744] hover:bg-[#f4f3f0] hover:text-[#1a1814]",
                        open ? "gap-3 px-2.5" : "justify-center w-10 mx-auto"
                      )}
                    >
                      <Icon
                        className={cn(
                          "w-4 h-4 shrink-0",
                          isActive ? "text-[#e8570e]" : "text-[#8a8680]"
                        )}
                      />
                      {open && (
                        <>
                          <span className="flex-1 truncate">{item.label}</span>
                          {item.badge === "live" && (
                            <Circle className="w-1.5 h-1.5 fill-emerald-400 text-emerald-400 animate-pulse shrink-0" />
                          )}
                        </>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Staff info */}
      <div className="border-t border-[#ebe9e4] p-2 shrink-0">
        <div
          className={cn(
            "flex items-center gap-2.5 px-2 py-2 rounded-lg",
            !open && "justify-center px-0"
          )}
        >
          <div className="w-7 h-7 rounded-full bg-[#fef3ed] border border-[#fde0cc] flex items-center justify-center shrink-0">
            <span className="text-[#e8570e] text-[11px] font-bold">
              {mockCurrentStaff.firstName[0]}
              {mockCurrentStaff.lastName[0]}
            </span>
          </div>
          {open && (
            <div className="flex-1 min-w-0">
              <p className="text-[#1a1814] text-xs font-medium truncate">
                {mockCurrentStaff.fullName}
              </p>
              <p className="text-[#b0ada8] text-[10px] capitalize truncate">
                {mockCurrentStaff.role}
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}