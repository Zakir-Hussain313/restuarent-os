import { relations } from "drizzle-orm";
import { tenants } from "./schema/tenants";
import { branches } from "./schema/branches";
import { staff } from "./schema/staff";
import { menuCategories, menuItems, menuItemVariants, modifierGroups, modifierOptions } from "./schema/menu";
import { tableSections, restaurantTables } from "./schema/tables";
import { orders, orderItems, orderDiscounts, coupons, couponBranchAllocations, payments } from "./schema/orders";
import { deliveries } from "./schema/deliveries";
import { attendance } from "./schema/attendance";
import { auditLogs } from "./schema/audit_logs";
import { tenantSettings } from "./schema/tenant_settings";

// ── Tenants ───────────────────────────────────────────────────────────────

export const tenantsRelations = relations(tenants, ({ one, many }) => ({
    settings: one(tenantSettings, {
        fields: [tenants.id],
        references: [tenantSettings.tenantId],
    }),
    branches: many(branches),
    staff: many(staff),
    menuCategories: many(menuCategories),
    menuItems: many(menuItems),
    tableSections: many(tableSections),
    restaurantTables: many(restaurantTables),
    orders: many(orders),
    deliveries: many(deliveries),
    attendance: many(attendance),
    auditLogs: many(auditLogs),
}));

// ── Tenant Settings ───────────────────────────────────────────────────────

export const tenantSettingsRelations = relations(tenantSettings, ({ one }) => ({
    tenant: one(tenants, {
        fields: [tenantSettings.tenantId],
        references: [tenants.id],
    }),
}));

// ── Branches ──────────────────────────────────────────────────────────────

export const branchesRelations = relations(branches, ({ one, many }) => ({
    tenant: one(tenants, {
        fields: [branches.tenantId],
        references: [tenants.id],
    }),
    staff: many(staff),
    tableSections: many(tableSections),
    restaurantTables: many(restaurantTables),
    orders: many(orders),
    deliveries: many(deliveries),
    attendance: many(attendance),
}));

// ── Staff ─────────────────────────────────────────────────────────────────

export const staffRelations = relations(staff, ({ one, many }) => ({
    tenant: one(tenants, {
        fields: [staff.tenantId],
        references: [tenants.id],
    }),
    branch: one(branches, {
        fields: [staff.branchId],
        references: [branches.id],
    }),

    // Orders this staff member created / took
    takenOrders: many(orders, { relationName: "orderTakenBy" }),

    // Orders this staff member is delivering as a rider
    riderOrders: many(orders, { relationName: "orderRider" }),

    // Deliveries assigned to this staff member as a rider
    deliveries: many(deliveries),

    // Discounts this staff member applied
    appliedDiscounts: many(orderDiscounts),

    // Payments this staff member processed
    processedPayments: many(payments),

    // Attendance records belonging to this staff member
    attendanceRecords: many(attendance, { relationName: "attendanceStaffMember" }),

    // Attendance records this staff member logged (SUPER_ADMIN only — enforced in server action)
    loggedAttendance: many(attendance, { relationName: "attendanceLoggedBy" }),

    // Audit log entries where this staff member was the actor
    auditLogs: many(auditLogs),
}));

// ── Menu Categories ───────────────────────────────────────────────────────

export const menuCategoriesRelations = relations(menuCategories, ({ one, many }) => ({
    tenant: one(tenants, {
        fields: [menuCategories.tenantId],
        references: [tenants.id],
    }),
    menuItems: many(menuItems),
}));

// ── Menu Items ────────────────────────────────────────────────────────────

export const menuItemsRelations = relations(menuItems, ({ one, many }) => ({
    tenant: one(tenants, {
        fields: [menuItems.tenantId],
        references: [tenants.id],
    }),
    category: one(menuCategories, {
        fields: [menuItems.categoryId],
        references: [menuCategories.id],
    }),
    variants: many(menuItemVariants),
    modifierGroups: many(modifierGroups),
    orderItems: many(orderItems),
}));

// ── Menu Item Variants ────────────────────────────────────────────────────

export const menuItemVariantsRelations = relations(menuItemVariants, ({ one }) => ({
    menuItem: one(menuItems, {
        fields: [menuItemVariants.menuItemId],
        references: [menuItems.id],
    }),
}));

// ── Modifier Groups ───────────────────────────────────────────────────────

export const modifierGroupsRelations = relations(modifierGroups, ({ one, many }) => ({
    menuItem: one(menuItems, {
        fields: [modifierGroups.menuItemId],
        references: [menuItems.id],
    }),
    options: many(modifierOptions),
}));

// ── Modifier Options ──────────────────────────────────────────────────────

export const modifierOptionsRelations = relations(modifierOptions, ({ one }) => ({
    group: one(modifierGroups, {
        fields: [modifierOptions.modifierGroupId],
        references: [modifierGroups.id],
    }),
}));

// ── Table Sections ────────────────────────────────────────────────────────

export const tableSectionsRelations = relations(tableSections, ({ one, many }) => ({
    tenant: one(tenants, {
        fields: [tableSections.tenantId],
        references: [tenants.id],
    }),
    branch: one(branches, {
        fields: [tableSections.branchId],
        references: [branches.id],
    }),
    tables: many(restaurantTables),
}));

// ── Restaurant Tables ─────────────────────────────────────────────────────

export const restaurantTablesRelations = relations(restaurantTables, ({ one, many }) => ({
    tenant: one(tenants, {
        fields: [restaurantTables.tenantId],
        references: [tenants.id],
    }),
    branch: one(branches, {
        fields: [restaurantTables.branchId],
        references: [branches.id],
    }),
    section: one(tableSections, {
        fields: [restaurantTables.sectionId],
        references: [tableSections.id],
    }),
    orders: many(orders),
}));

// ── Orders ────────────────────────────────────────────────────────────────

export const ordersRelations = relations(orders, ({ one, many }) => ({
    tenant: one(tenants, {
        fields: [orders.tenantId],
        references: [tenants.id],
    }),
    branch: one(branches, {
        fields: [orders.branchId],
        references: [branches.id],
    }),

    // Staff who created / took the order
    takenBy: one(staff, {
        fields: [orders.staffId],
        references: [staff.id],
        relationName: "orderTakenBy",
    }),

    // Rider assigned to deliver the order
    rider: one(staff, {
        fields: [orders.riderId],
        references: [staff.id],
        relationName: "orderRider",
    }),

    table: one(restaurantTables, {
        fields: [orders.tableId],
        references: [restaurantTables.id],
    }),
    items: many(orderItems),
    discounts: many(orderDiscounts),
    payments: many(payments),

    // 1:1 — only exists if orderType is "delivery"
    delivery: one(deliveries, {
        fields: [orders.id],
        references: [deliveries.orderId],
    }),
}));

// ── Order Items ───────────────────────────────────────────────────────────

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
    tenant: one(tenants, {
        fields: [orderItems.tenantId],
        references: [tenants.id],
    }),
    order: one(orders, {
        fields: [orderItems.orderId],
        references: [orders.id],
    }),
    menuItem: one(menuItems, {
        fields: [orderItems.menuItemId],
        references: [menuItems.id],
    }),
}));

// ── Order Discounts ───────────────────────────────────────────────────────

export const orderDiscountsRelations = relations(orderDiscounts, ({ one }) => ({
    tenant: one(tenants, {
        fields: [orderDiscounts.tenantId],
        references: [tenants.id],
    }),
    order: one(orders, {
        fields: [orderDiscounts.orderId],
        references: [orders.id],
    }),
    appliedBy: one(staff, {
        fields: [orderDiscounts.appliedBy],
        references: [staff.id],
    }),
    coupon: one(coupons, {
        fields: [orderDiscounts.couponId],
        references: [coupons.id],
    }),
}));

// ── Coupons ───────────────────────────────────────────────────────────────

export const couponsRelations = relations(coupons, ({ one, many }) => ({
    tenant: one(tenants, {
        fields: [coupons.tenantId],
        references: [tenants.id],
    }),
    createdByStaff: one(staff, {
        fields: [coupons.createdBy],
        references: [staff.id],
    }),
    redemptions: many(orderDiscounts),
    branchAllocations: many(couponBranchAllocations),
}));

// ── Coupon Branch Allocations ────────────────────────────────────────────

export const couponBranchAllocationsRelations = relations(couponBranchAllocations, ({ one }) => ({
    tenant: one(tenants, {
        fields: [couponBranchAllocations.tenantId],
        references: [tenants.id],
    }),
    coupon: one(coupons, {
        fields: [couponBranchAllocations.couponId],
        references: [coupons.id],
    }),
    branch: one(branches, {
        fields: [couponBranchAllocations.branchId],
        references: [branches.id],
    }),
}));

// ── Payments ──────────────────────────────────────────────────────────────

export const paymentsRelations = relations(payments, ({ one }) => ({
    tenant: one(tenants, {
        fields: [payments.tenantId],
        references: [tenants.id],
    }),
    order: one(orders, {
        fields: [payments.orderId],
        references: [orders.id],
    }),
    processedBy: one(staff, {
        fields: [payments.processedBy],
        references: [staff.id],
    }),
}));

// ── Deliveries ────────────────────────────────────────────────────────────

export const deliveriesRelations = relations(deliveries, ({ one }) => ({
    tenant: one(tenants, {
        fields: [deliveries.tenantId],
        references: [tenants.id],
    }),
    branch: one(branches, {
        fields: [deliveries.branchId],
        references: [branches.id],
    }),
    order: one(orders, {
        fields: [deliveries.orderId],
        references: [orders.id],
    }),
    rider: one(staff, {
        fields: [deliveries.riderId],
        references: [staff.id],
    }),
}));

// ── Attendance ────────────────────────────────────────────────────────────

export const attendanceRelations = relations(attendance, ({ one }) => ({
    tenant: one(tenants, {
        fields: [attendance.tenantId],
        references: [tenants.id],
    }),
    branch: one(branches, {
        fields: [attendance.branchId],
        references: [branches.id],
    }),

    // The employee this record belongs to
    staffMember: one(staff, {
        fields: [attendance.staffId],
        references: [staff.id],
        relationName: "attendanceStaffMember",
    }),

    // The SUPER_ADMIN who logged this record
    loggedByStaff: one(staff, {
        fields: [attendance.loggedBy],
        references: [staff.id],
        relationName: "attendanceLoggedBy",
    }),
}));

// ── Audit Logs ────────────────────────────────────────────────────────────

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
    tenant: one(tenants, {
        fields: [auditLogs.tenantId],
        references: [tenants.id],
    }),
    branch: one(branches, {
        fields: [auditLogs.branchId],
        references: [branches.id],
    }),
    actor: one(staff, {
        fields: [auditLogs.actorId],
        references: [staff.id],
    }),
}));