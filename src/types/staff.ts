export type StaffRole =
  | "owner"
  | "manager"
  | "cashier"
  | "waiter"
  | "chef"
  | "kitchen_staff"
  | "delivery_rider";

export type StaffStatus = "active" | "inactive" | "on_leave";

export interface Staff {
  id: string;
  restaurantId: string;
  branchId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  role: StaffRole;
  status: StaffStatus;
  avatar?: string;
  pin: string; // 4-digit POS PIN
  salary?: number;
  joinedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  staffId: string;
  staff: Staff;
  token: string; // mock JWT
  expiresAt: string;
}

export type Permission =
  | "view_dashboard"
  | "manage_menu"
  | "manage_orders"
  | "manage_tables"
  | "manage_staff"
  | "view_analytics"
  | "manage_settings"
  | "access_pos"
  | "apply_discounts"
  | "void_orders";

export const ROLE_PERMISSIONS: Record<StaffRole, Permission[]> = {
  owner: [
    "view_dashboard",
    "manage_menu",
    "manage_orders",
    "manage_tables",
    "manage_staff",
    "view_analytics",
    "manage_settings",
    "access_pos",
    "apply_discounts",
    "void_orders",
  ],
  manager: [
    "view_dashboard",
    "manage_menu",
    "manage_orders",
    "manage_tables",
    "manage_staff",
    "view_analytics",
    "access_pos",
    "apply_discounts",
    "void_orders",
  ],
  cashier: ["access_pos", "manage_orders", "apply_discounts"],
  waiter: ["access_pos", "manage_orders", "manage_tables"],
  chef: ["manage_orders"],
  kitchen_staff: ["manage_orders"],
  delivery_rider: ["manage_orders"],
};