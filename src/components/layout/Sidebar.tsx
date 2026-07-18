"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ProfileModal } from "./ProfileModal";
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
  Bike,
  History,
  ChevronDown,
  LogOut,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_GROUPS } from "@/config/nav";
import type { NavItem, NavChild } from "@/config/nav";
import { useAuthStore } from "@/store/useAuthStore";
import { logoutAction } from "@/features/auth/actions";
import { hasPermission } from "@/types/staff";

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
  Bike,
  History,
  Building2
};

function isChildActive(children: NavChild[], pathname: string): boolean {
  return children.some(
    (child) =>
      pathname === child.href || pathname.startsWith(child.href + "/")
  );
}

interface SidebarChildItemProps {
  child: NavChild;
  isActive: boolean;
}

function SidebarChildItem({ child, isActive }: SidebarChildItemProps) {
  const Icon = ICON_MAP[child.icon];

  return (
    <li>
      <Link
        href={child.href}
        className={cn(
          "flex items-center h-9 rounded-lg text-sm font-medium transition-all duration-150 gap-2.5 pl-8 pr-2.5",
          isActive
            ? "bg-[#fef3ed] text-[#e8570e]"
            : "text-[#6b6966] hover:bg-[#f4f3f0] hover:text-[#1a1814]"
        )}
      >
        {Icon && (
          <Icon
            className={cn(
              "w-3.5 h-3.5 shrink-0",
              isActive ? "text-[#e8570e]" : "text-[#a09d99]"
            )}
          />
        )}
        <span className="flex-1 truncate">{child.label}</span>
      </Link>
    </li>
  );
}

interface SidebarNavItemProps {
  item: NavItem;
  sidebarOpen: boolean;
  pathname: string;
}

function SidebarNavItem({ item, sidebarOpen, pathname }: SidebarNavItemProps) {
  const Icon = ICON_MAP[item.icon];
  const hasChildren = !!item.children?.length;

  const isDirectlyActive =
    !hasChildren &&
    (pathname === item.href || pathname.startsWith(item.href + "/"));

  const isChildrenActive =
    hasChildren && isChildActive(item.children!, pathname);

  const isActive = isDirectlyActive || isChildrenActive;

  const [expanded, setExpanded] = useState<boolean>(isChildrenActive);

  if (hasChildren) {
    return (
      <li>
        <button
          onClick={() => {
            if (sidebarOpen) setExpanded((prev) => !prev);
          }}
          title={!sidebarOpen ? item.label : undefined}
          className={cn(
            "w-full flex items-center h-10 rounded-lg text-sm font-medium transition-all duration-150",
            isActive
              ? "bg-[#fef3ed] text-[#e8570e]"
              : "text-[#4a4744] hover:bg-[#f4f3f0] hover:text-[#1a1814]",
            sidebarOpen ? "gap-3 px-2.5" : "justify-center w-10 mx-auto"
          )}
        >
          <Icon
            className={cn(
              "w-4 h-4 shrink-0",
              isActive ? "text-[#e8570e]" : "text-[#8a8680]"
            )}
          />
          {sidebarOpen && (
            <>
              <span className="flex-1 truncate text-left">{item.label}</span>
              <ChevronDown
                className={cn(
                  "w-3.5 h-3.5 shrink-0 transition-transform duration-200",
                  isActive ? "text-[#e8570e]" : "text-[#8a8680]",
                  expanded && "rotate-180"
                )}
              />
            </>
          )}
        </button>

        {sidebarOpen && expanded && (
          <ul className="mt-0.5 space-y-0.5">
            {item.children!.map((child) => (
              <SidebarChildItem
                key={child.href}
                child={child}
                isActive={
                  child.href === "/orders"
                    ? pathname === "/orders"
                    : pathname === child.href ||
                    pathname.startsWith(child.href + "/")
                }
              />
            ))}
          </ul>
        )}
      </li>
    );
  }

  return (
    <li>
      <Link
        href={item.href}
        title={!sidebarOpen ? item.label : undefined}
        className={cn(
          "flex items-center h-10 rounded-lg text-sm font-medium transition-all duration-150",
          isActive
            ? "bg-[#fef3ed] text-[#e8570e]"
            : "text-[#4a4744] hover:bg-[#f4f3f0] hover:text-[#1a1814]",
          sidebarOpen ? "gap-3 px-2.5" : "justify-center w-10 mx-auto"
        )}
      >
        <Icon
          className={cn(
            "w-4 h-4 shrink-0",
            isActive ? "text-[#e8570e]" : "text-[#8a8680]"
          )}
        />
        {sidebarOpen && (
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
}

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);

  const router = useRouter();
  const currentStaff = useAuthStore((s) => s.currentStaff);
  const role = currentStaff?.role;

  const visibleGroups = NAV_GROUPS
    .map((group) => ({
      ...group,
      items: group.items
        .filter((item) => !role || hasPermission(role, item.permission))
        .map((item) => ({
          ...item,
          children: item.children?.filter(
            (child) => !role || hasPermission(role, child.permission)
          ),
        })),
    }))
    .filter((group) => group.items.length > 0);

  async function handleLogout() {
    await logoutAction();
    router.push("/auth/login");
  }

  return (
    <aside
      className={cn(
        "relative z-40 flex flex-col h-screen bg-white border-r border-[#ebe9e4] transition-all duration-300 ease-in-out shrink-0 overflow-hidden",
        open ? "w-56" : "w-14"
      )}
    >
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
            Restaurant OS
          </span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-2 space-y-4">
        {visibleGroups.map((group) => (
          <div key={group.label}>
            {open && (
              <p className="px-4 mb-1 text-[10px] font-semibold uppercase tracking-widest text-[#b0ada8]">
                {group.label}
              </p>
            )}
            <ul className="space-y-0.5 px-2">
              {group.items.map((item) => (
                <SidebarNavItem
                  key={item.href}
                  item={item}
                  sidebarOpen={open}
                  pathname={pathname}
                />
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-[#ebe9e4] p-2 shrink-0">
        <div
          className={cn(
            "flex items-center gap-2.5 px-2 py-2 rounded-lg",
            !open && "justify-center px-0"
          )}
        >
          <button
            onClick={() => setProfileOpen(true)}
            className={cn(
              "flex items-center gap-2.5 min-w-0 rounded-lg hover:bg-[#f4f3f0] transition-colors",
              open ? "flex-1 text-left" : ""
            )}
          >
            <div className="w-7 h-7 rounded-full bg-[#fef3ed] border border-[#fde0cc] flex items-center justify-center shrink-0">
              <span className="text-[#e8570e] text-[11px] font-bold">
                {currentStaff?.firstName?.[0]}
                {currentStaff?.lastName?.[0]}
              </span>
            </div>
            {open && (
              <div className="flex-1 min-w-0">
                <p className="text-[#1a1814] text-xs font-medium truncate">
                  {currentStaff
                    ? `${currentStaff.firstName} ${currentStaff.lastName}`
                    : ""}
                </p>
                <p className="text-[#b0ada8] text-[10px] capitalize truncate">
                  {currentStaff?.role}
                </p>
              </div>
            )}
          </button>
          {open && (
            <button
              onClick={handleLogout}
              title="Sign out"
              className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-[#8a8680] hover:text-[#e8570e] hover:bg-[#fef3ed] transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <ProfileModal open={profileOpen} onOpenChange={setProfileOpen} />
    </aside>
  );
}