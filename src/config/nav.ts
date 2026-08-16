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
  multiBranchOnly?: boolean;
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
      {
        label: "Tables",
        href: "/tables",
        icon: "Table2",
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
        label: "Staff",
        href: "/staff",
        icon: "UserCog",
        permission: "manage_staff",
      },
      {
        label: "Attendance",
        href: "/attendance",
        icon: "ClipboardList",
        permission: "manage_attendance",
      },
      {
        label: "Admins",
        href: "/admins",
        icon: "Users",
        permission: "manage_admins",
      },
      {
        label: "Branches",
        href: "/branches",
        icon: "Building2",
        permission: "manage_branches",
      },
      {
        label: "Settings",
        href: "/settings/delivery-areas",
        icon: "Settings2",
        permission: "manage_settings",
      },
      {
        label: "Audit Logs",
        href: "/audit-logs",
        icon: "History",
        permission: "view_audit_logs",
      },
      {
        label: "Reports",
        href: "/reports/sales",
        icon: "BarChart3",
        permission: "view_reports",
      },
    ],
  },
];