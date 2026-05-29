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
      {
        label: "Tables",
        href: "/tables",
        icon: "UtensilsCrossed",
        permission: "manage_tables",
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
        label: "Customers",
        href: "/customers",
        icon: "Users",
        permission: "view_dashboard",
      },
      {
        label: "Staff",
        href: "/staff",
        icon: "UserCog",
        permission: "manage_staff",
      },
    ],
  },
  {
    label: "Insights",
    items: [
      {
        label: "Analytics",
        href: "/analytics",
        icon: "BarChart3",
        permission: "view_analytics",
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        label: "Settings",
        href: "/settings",
        icon: "Settings2",
        permission: "manage_settings",
      },
    ],
  },
];