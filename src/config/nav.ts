import type { Permission } from "@/types";

export interface NavChild {
  label: string;
  href: string;
  icon: string;
  permission: Permission;
}

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  permission: Permission;
  badge?: "live" | "new";
  children?: NavChild[];
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
        children: [
          {
            label: "Active Orders",
            href: "/orders",
            icon: "UtensilsCrossed",
            permission: "manage_orders",
          },
          {
            label: "Delivery",
            href: "/orders/delivery",
            icon: "Bike",
            permission: "manage_orders",
          },
          {
            label: "History",
            href: "/orders/history",
            icon: "History",
            permission: "manage_orders",
          },
        ],
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