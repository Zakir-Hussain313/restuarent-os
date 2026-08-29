"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ProfileModal } from "./ProfileModal";
import { useQuery } from "@tanstack/react-query";
import { getBranchCountAction } from "@/features/delivery-areas/actions";
import { useState, useEffect, useRef } from "react";
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
  MapPin,
  Table2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_GROUPS } from "@/config/nav";
import type { NavItem, NavChild } from "@/config/nav";
import { useAuthStore } from "@/store/useAuthStore";
import { logoutAction } from "@/features/auth/actions";
import { hasPermission } from "@/types/staff";
import { usePendingOrdersCount } from "@/features/orders/hooks/usePendingOrdersCount";
import { NotificationBell } from "@/features/notifications/components/NotificationBell";
import { useSidebarStore } from "@/store/useSidebarStore";

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
  Building2,
  MapPin,
  Table2,
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
          "flex items-center h-9 rounded-full text-sm font-medium transition-all duration-150 gap-2.5 pl-8 pr-2.5",
          isActive
            ? "bg-white/12 text-white"
            : "text-[#c8b6ec] hover:bg-white/8 hover:text-white"
        )}
      >
        {Icon && (
          <Icon
            className={cn(
              "w-3.5 h-3.5 shrink-0",
              isActive ? "text-white" : "text-[#b79ee8]"
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
  pendingOrdersCount: number;
}

function SidebarNavItem({
  item,
  sidebarOpen,
  pathname,
  pendingOrdersCount,
}: SidebarNavItemProps) {
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
            "w-full flex items-center h-10 rounded-full text-sm font-medium transition-all duration-150",
            isActive
              ? "bg-white/12 text-white"
              : "text-[#c8b6ec] hover:bg-white/8 hover:text-white",
            sidebarOpen ? "gap-3 px-2.5" : "justify-center w-10 mx-auto"
          )}
        >
          <Icon
            className={cn(
              "w-4 h-4 shrink-0",
              isActive ? "text-white" : "text-[#b79ee8]"
            )}
          />
          {sidebarOpen && (
            <>
              <span className="flex-1 truncate text-left">{item.label}</span>
              <ChevronDown
                className={cn(
                  "w-3.5 h-3.5 shrink-0 transition-transform duration-200",
                  isActive ? "text-white" : "text-[#b79ee8]",
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
          "flex items-center h-10 rounded-full text-sm font-medium transition-all duration-150",
          isActive
            ? "bg-white/12 text-white"
            : "text-[#c8b6ec] hover:bg-white/8 hover:text-white",
          sidebarOpen ? "gap-3 px-2.5" : "justify-center w-10 mx-auto"
        )}
      >
        <span className="relative shrink-0">
          <Icon
            className={cn(
              "w-4 h-4",
              isActive ? "text-white" : "text-[#b79ee8]"
            )}
          />
          {!sidebarOpen && item.href === "/pos" && pendingOrdersCount > 0 && (
            <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-coral ring-2 ring-[#5B21B6]" />
          )}
        </span>
        {sidebarOpen && (
          <>
            <span className="flex-1 truncate">{item.label}</span>
            {item.href === "/pos" && pendingOrdersCount > 0 && (
              <span className="shrink-0 min-w-4.5 h-4.5 px-1 rounded-full bg-coral text-white text-[10px] font-semibold flex items-center justify-center">
                {pendingOrdersCount > 99 ? "99+" : pendingOrdersCount}
              </span>
            )}
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
  const open = useSidebarStore((s) => s.open);
  const toggleOpen = useSidebarStore((s) => s.toggleOpen);
  const close = useSidebarStore((s) => s.close);
  const [profileOpen, setProfileOpen] = useState(false);

  // Auto-close the mobile/tablet overlay on navigation. Desktop uses the
  // same `open` flag to control push-sidebar width, so this must only
  // fire below the lg breakpoint (1024px) — otherwise every nav click
  // would also collapse the desktop sidebar.
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      close();
    }
  }, [pathname, close]);

  const router = useRouter();
  const currentStaff = useAuthStore((s) => s.currentStaff);
  const role = currentStaff?.role;

  const { data: branchCount } = useQuery({
    queryKey: ["branch-count"],
    queryFn: async () => {
      const res = await getBranchCountAction();
      if (res.error) throw new Error(res.error);
      return res.data;
    },
  });

  const pendingOrdersCount = usePendingOrdersCount();

  const visibleGroups = NAV_GROUPS
    .map((group) => ({
      ...group,
      items: group.items
        .filter((item) => !role || hasPermission(role, item.permission))
        .filter((item) => !item.multiBranchOnly || (branchCount ?? 0) >= 2)
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
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={close}
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          "flex flex-col h-dvh bg-[#5B21B6] transition-all duration-300 ease-in-out shrink-0 overflow-hidden z-40",
          open ? "fixed inset-y-0 left-0 lg:relative w-56" : "relative w-14"
        )}
      >
      <div className="h-14 flex items-center shrink-0 border-b border-white/10">
        <button
          onClick={toggleOpen}
          className="w-14 h-14 flex items-center justify-center shrink-0 text-[#c8b6ec] hover:text-white transition-colors"
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
          <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shrink-0">
            <Flame className="w-3.5 h-3.5 text-[#5B21B6]" />
          </div>
          <span className="text-white font-heading text-sm tracking-tight whitespace-nowrap">
            Restaurant OS
          </span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 space-y-4">
        {visibleGroups.map((group) => (
          <div key={group.label}>
            {open && (
              <p className="px-4 mb-1 text-[10px] font-semibold uppercase tracking-widest text-[#9776cf]">
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
                  pendingOrdersCount={pendingOrdersCount}
                />
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-2 shrink-0 space-y-1">
        <NotificationBell sidebarOpen={open} />
        <div
          className={cn(
            "flex items-center gap-2.5 px-2 py-2 rounded-full",
            !open && "justify-center px-0"
          )}
        >
          <button
            onClick={() => setProfileOpen(true)}
            className={cn(
              "flex items-center gap-2.5 min-w-0 rounded-full hover:bg-white/8 transition-colors",
              open ? "flex-1 text-left" : ""
            )}
          >
            <div className="w-7 h-7 rounded-full bg-coral flex items-center justify-center shrink-0 overflow-hidden">
              {currentStaff?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentStaff.image}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-white text-[11px] font-bold">
                  {currentStaff?.firstName?.[0]}
                  {currentStaff?.lastName?.[0]}
                </span>
              )}
            </div>
            {open && (
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-medium truncate">
                  {currentStaff
                    ? `${currentStaff.firstName} ${currentStaff.lastName}`
                    : ""}
                </p>
                <p className="text-[#b79ee8] text-[10px] capitalize truncate">
                  {currentStaff?.role}
                </p>
              </div>
            )}
          </button>
          {open && (
            <button
              onClick={handleLogout}
              title="Sign out"
              className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-[#c8b6ec] hover:text-white hover:bg-white/8 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

        <ProfileModal open={profileOpen} onOpenChange={setProfileOpen} />
      </aside>
    </>
  );
}