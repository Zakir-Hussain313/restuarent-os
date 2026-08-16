export type StaffRole = "SUPER_ADMIN" | "ADMIN" | "STAFF" | "RIDER";

export type StaffStatus = "active" | "inactive" | "on_leave";

export type Permission =
  | "view_dashboard"
  | "access_pos"
  | "manage_orders"
  | "manage_tables"
  | "manage_menu"
  | "manage_staff"
  | "manage_admins"
  | "manage_branches"
  | "manage_customers"
  | "manage_attendance"
  | "view_analytics"
  | "manage_settings"
  | "view_audit_logs"
  | "manage_deliveries"
  | "view_reports";

const ALL_PERMISSIONS: Permission[] = [
  "view_dashboard",
  "access_pos",
  "manage_orders",
  "manage_tables",
  "manage_menu",
  "manage_staff",
  "manage_admins",
  "manage_branches",
  "manage_customers",
  "manage_attendance",
  "view_analytics",
  "manage_settings",
  "view_audit_logs",
  "manage_deliveries",
  "view_reports",
];

export const ROLE_PERMISSIONS: Record<StaffRole, Permission[]> = {
  SUPER_ADMIN: ALL_PERMISSIONS,
  ADMIN: [
    "view_dashboard", "access_pos", "manage_orders", "manage_tables",
    "manage_menu", "manage_staff", "manage_attendance", "view_analytics", "manage_settings",
    "view_reports", "view_audit_logs",
],
  STAFF: ["access_pos", "manage_orders", "manage_tables", "manage_menu"],
  RIDER: ["manage_deliveries"],
};

export function hasPermission(role: StaffRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}