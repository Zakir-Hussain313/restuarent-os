import type { Permission } from "@/types";

export interface NavItem {
  label: string;
  href: string;
  icon: string; // lucide icon name
  permission: Permission;
  badge?: "live" | "new";
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: "LayoutDashboard",
        permission: "view_dashboard",
      },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        label: "POS",
        href: "/pos",
        icon: "ShoppingCart",
        permission: "access_pos",
        badge: "live",
      },
      {
        label: "Orders",
        href: "/orders",
        icon: "ClipboardList",
        permission: "manage_orders",
      },
    ],
  },
  {
    label: "Management",
    items: [
      {
        label: "Menu",
        href: "/menu",
        icon: "BookOpen",
        permission: "manage_menu",
      },
      {
        label: "Staff",
        href: "/staff",
        icon: "UserCog",
        permission: "manage_staff",
      },
    ],
  },
];