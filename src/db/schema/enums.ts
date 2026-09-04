import { pgEnum } from "drizzle-orm/pg-core";

// ── Staff / Auth ──────────────────────────────────────────────────────────
// Matches the finalized 3-role authz model. JWT app_metadata.role mirrors this.
export const staffRoleEnum = pgEnum("staff_role", ["SUPER_ADMIN", "ADMIN", "STAFF", "RIDER"]);

export const staffStatusEnum = pgEnum("staff_status", ["active", "inactive", "on_leave"]);

// ── Menu ──────────────────────────────────────────────────────────────────
export const menuItemStatusEnum = pgEnum("menu_item_status", [
  "available",
  "unavailable",
  "out_of_stock",
]);

export const spiceLevelEnum = pgEnum("spice_level", [
  "none",
  "mild",
  "medium",
  "hot",
  "extra_hot",
]);

export const dietaryTagEnum = pgEnum("dietary_tag", [
  "vegetarian",
  "vegan",
  "gluten_free",
  "dairy_free",
  "halal",
  "contains_nuts",
  "spicy",
]);

// ── Tables (dine-in) ──────────────────────────────────────────────────────
export const tableStatusEnum = pgEnum("table_status", [
  "available",
  "occupied",
  "reserved",
  "out_of_service"
]);

export const tableShapeEnum = pgEnum("table_shape", ["square", "rectangle", "circle", "oval"]);

export const tableSeatingTypeEnum = pgEnum("table_seating_type", ["chairs", "sofa"]);

export const reservationStatusEnum = pgEnum("reservation_status", [
  "pending",
  "confirmed",
  "seated",
  "cancelled",
  "no_show",
]);

// ── Orders ────────────────────────────────────────────────────────────────
export const orderTypeEnum = pgEnum("order_type", ["dine_in", "takeaway", "delivery"]);

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "confirmed",
  "ready_for_delivery",
  "out_for_delivery",
  "delivered",
  "completed",
  "cancelled",
]);

export const orderItemStatusEnum = pgEnum("order_item_status", ["pending", "cancelled"]);

export const discountTypeEnum = pgEnum("discount_type", ["percentage", "fixed"]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "cash",
  "card",
  "jazzcash",
  "easypaisa",
  "bank_transfer",
  "complimentary",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "unpaid",
  "partial",
  "paid",
  "refunded",
]);

// Payment record lifecycle (distinct from order-level paymentStatusEnum above,
// which tracks the ORDER's aggregate paid/unpaid state). This tracks the
// lifecycle of a single payment/transaction record.
export const paymentStatusLifecycleEnum = pgEnum("payment_status_lifecycle", [
  "pending",
  "processing",
  "paid",
  "failed",
  "cancelled",
  "expired",
  "refunded",
  "partially_refunded",
  "requires_verification",
]);

// ── Deliveries ────────────────────────────────────────────────────────────
export const deliveryStatusEnum = pgEnum("delivery_status", [
  "unassigned",
  "assigned",
  "out_for_delivery",
  "delivered",
  "cancelled",
]);

// ── Attendance ────────────────────────────────────────────────────────────
export const attendanceStatusEnum = pgEnum("attendance_status", [
  "present",
  "absent",
  "late",
  "leave",
  "half_day",
]);

// ── Devices (branch-approved clock-in/out terminals) ────────────────────────
export const deviceStatusEnum = pgEnum("device_status", ["pending", "approved", "rejected"]);

// ── Tenants ───────────────────────────────────────────────────────────────
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "trialing",
  "active",
  "past_due",
  "cancelled",
]);