import {
    pgTable,
    uuid,
    text,
    integer,
    boolean,
    timestamp,
    jsonb,
    index,
    uniqueIndex,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { branches } from "./branches";
import { restaurantTables } from "./tables";
import { staff } from "./staff";
import { menuItems } from "./menu";
import {
    orderTypeEnum,
    orderStatusEnum,
    orderItemStatusEnum,
    discountTypeEnum,
    paymentMethodEnum,
    paymentStatusEnum,
} from "./enums";

export const orders = pgTable(
    "orders",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        tenantId: uuid("tenant_id")
            .notNull()
            .references(() => tenants.id, { onDelete: "cascade" }),
        branchId: uuid("branch_id")
            .notNull()
            .references(() => branches.id, { onDelete: "cascade" }),

        // Unique per tenant, not globally (e.g. "ORD-0041")
        orderNumber: text("order_number").notNull(),

        tableId: uuid("table_id").references(() => restaurantTables.id, {
            onDelete: "set null",
        }),
        // Retained independently of customerId — walk-in or delivery orders may
        // have a phone number without a registered customer record.
        customerPhone: text("customer_phone"),
        customerName: text("customer_name"),

        // Denormalized pointer to the assigned rider. The authoritative delivery
        // lifecycle (status, timestamps, address snapshot) lives on the
        // `deliveries` table. This field exists solely to avoid a join on every
        // order list / dashboard query that needs "who is delivering this".
        riderId: uuid("rider_id").references(() => staff.id, {
            onDelete: "set null",
        }),

        orderType: orderTypeEnum("order_type").notNull(),
        status: orderStatusEnum("status").notNull().default("pending"),

        subtotal: integer("subtotal").notNull(),
        totalDiscount: integer("total_discount").notNull().default(0),
        deliveryFee: integer("delivery_fee").notNull().default(0),
        total: integer("total").notNull(),

        paymentStatus: paymentStatusEnum("payment_status")
            .notNull()
            .default("unpaid"),
        totalPaid: integer("total_paid").notNull().default(0),
        balance: integer("balance").notNull().default(0),

        // Plain text — intentionally kept lightweight for quick display on order
        // list views. The structured jsonb address snapshot (with city, area,
        // coordinates etc.) lives on `deliveries.delivery_address`.
        deliveryAddress: text("delivery_address"),
        estimatedDeliveryMinutes: integer("estimated_delivery_minutes"),

        notes: text("notes"),

        // Client-generated UUID, one per distinct order attempt. Lets the
        // server recognize and discard a duplicate request that lands late
        // (e.g. a background retry from an offline client) instead of
        // creating a second order. Nullable — non-POS-originated orders
        // (if any ever exist) simply won't participate in this check.
        idempotencyKey: text("idempotency_key"),

        // True only for orders that were originally placed while the POS
        // was offline (queued locally, then synced by OfflineSyncManager).
        // NOT the same as "has an idempotencyKey" — every order gets one
        // of those, online or offline. This flag is the real signal.
        wasOfflineOrder: boolean("was_offline_order").notNull().default(false),

        // Staff member who created / took the order.
        // onDelete: "restrict" — prevents deleting a staff record that has orders.
        staffId: uuid("staff_id")
            .references(() => staff.id, { onDelete: "restrict" }),

        createdAt: timestamp("created_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
        completedAt: timestamp("completed_at", { withTimezone: true }),
    },
    (t) => [
        // RLS + all tenant-scoped queries
        index("orders_tenant_id_idx").on(t.tenantId),
        // Branch-level filtering
        index("orders_branch_id_idx").on(t.branchId),
        // Order queue / status board queries
        index("orders_status_idx").on(t.status),
        // Rider active orders
        index("orders_rider_id_idx").on(t.riderId),
        // Who took the order
        index("orders_staff_id_idx").on(t.staffId),
        // Table's current / recent orders
        index("orders_table_id_idx").on(t.tableId),
        // Unpaid orders view / payment reconciliation
        index("orders_payment_status_idx").on(t.paymentStatus),
        // Primary dashboard query: tenant + status
        index("orders_tenant_status_idx").on(t.tenantId, t.status),
        // Branch-level ops: tenant + branch + status
        index("orders_tenant_branch_status_idx").on(
            t.tenantId,
            t.branchId,
            t.status
        ),
        // Sales report: tenant + completedAt range scans (completedAt, not
        // createdAt, since revenue is recognized at completion — see
        // reports feature design notes)
        index("orders_tenant_completed_at_idx").on(t.tenantId, t.completedAt),
        // orderNumber must be unique within a branch (not tenant-wide —
        // each branch runs its own independent order number sequence)
        uniqueIndex("orders_branch_order_number_udx").on(
            t.branchId,
            t.orderNumber
        ),
        // Enforces the dedup guarantee at the DB level too, not just in
        // application code — protects against two near-simultaneous
        // requests both passing the "does it exist" check before either
        // has inserted. Multiple NULLs are allowed by Postgres unique
        // indexes, so orders without a key are unaffected.
        uniqueIndex("orders_idempotency_key_udx").on(t.idempotencyKey),
    ]
);

type SelectedModifier = {
    groupId: string;
    groupName: string;
    optionId: string;
    optionName: string;
    priceAdjustment: number;
};

type SelectedVariant = {
    variantId: string;
    variantName: string;
    priceAdjustment: number;
} | null;

export const orderCounters = pgTable("order_counters", {
    branchId: uuid("branch_id")
        .primaryKey()
        .references(() => branches.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id")
        .notNull()
        .references(() => tenants.id, { onDelete: "cascade" }),
    nextNumber: integer("next_number").notNull().default(1),
});

export const orderItems = pgTable(
    "order_items",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        tenantId: uuid("tenant_id")
            .notNull()
            .references(() => tenants.id, { onDelete: "cascade" }),
        orderId: uuid("order_id")
            .notNull()
            .references(() => orders.id, { onDelete: "cascade" }),

        // onDelete: "restrict" — menu items with order history cannot be hard-deleted.
        // A soft-delete / discontinue pattern must be used on the menu instead.
        menuItemId: uuid("menu_item_id")
            .notNull()
            .references(() => menuItems.id, { onDelete: "restrict" }),

        // Snapshot fields — name, category, and price are frozen at order time.
        // Menu edits after the order is placed must not retroactively alter
        // existing order records.
        menuItemName: text("menu_item_name").notNull(),
        menuItemImage: text("menu_item_image"),
        categoryId: uuid("category_id").notNull(),
        categoryName: text("category_name").notNull(),

        quantity: integer("quantity").notNull(),
        unitPrice: integer("unit_price").notNull(),
        itemTotal: integer("item_total").notNull(),

        // jsonb snapshots — variant and modifiers are captured at order time.
        // Not stored as FKs into menu_item_variants / modifier_options because
        // those records can be edited or deleted without invalidating order history.
        // Validation that the variant/modifier existed and was valid at order time
        // must happen in the server action layer, not at the DB constraint level.
        selectedVariant: jsonb("selected_variant").$type<SelectedVariant>(),
        selectedModifiers: jsonb("selected_modifiers")
            .$type<SelectedModifier[]>()
            .notNull()
            .default([]),
        notes: text("notes"),
        status: orderItemStatusEnum("status").notNull().default("pending"),

        createdAt: timestamp("created_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (t) => [
        // All order item queries start with the parent order
        index("order_items_order_id_idx").on(t.orderId),
        // RLS enforcement
        index("order_items_tenant_id_idx").on(t.tenantId),
        // "Orders containing this menu item" — analytics, soft-delete guard
        index("order_items_menu_item_id_idx").on(t.menuItemId),
    ]
);

export const coupons = pgTable(
    "coupons",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        tenantId: uuid("tenant_id")
            .notNull()
            .references(() => tenants.id, { onDelete: "cascade" }),

        name: text("name").notNull(),
        description: text("description"),
        discountType: discountTypeEnum("discount_type").notNull(),
        discountValue: integer("discount_value").notNull(),

        validFrom: timestamp("valid_from", { withTimezone: true }),
        validTo: timestamp("valid_to", { withTimezone: true }),
        maxUses: integer("max_uses"),
        usesCount: integer("uses_count").notNull().default(0),

        branchIds: uuid("branch_ids").array(),
        menuItemIds: uuid("menu_item_ids").array(),
        categoryIds: uuid("category_ids").array(),

        isActive: boolean("is_active").notNull().default(true),
        createdBy: uuid("created_by")
            .notNull()
            .references(() => staff.id, { onDelete: "restrict" }),

        createdAt: timestamp("created_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (t) => [
        index("coupons_tenant_id_idx").on(t.tenantId),
    ]
);

export const couponBranchAllocations = pgTable(
    "coupon_branch_allocations",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        tenantId: uuid("tenant_id")
            .notNull()
            .references(() => tenants.id, { onDelete: "cascade" }),
        couponId: uuid("coupon_id")
            .notNull()
            .references(() => coupons.id, { onDelete: "cascade" }),
        branchId: uuid("branch_id")
            .notNull()
            .references(() => branches.id, { onDelete: "cascade" }),

        // Fixed at coupon creation time — never recalculated afterward,
        // even if maxUses or the branch list changes later (see note below).
        allocatedUses: integer("allocated_uses").notNull(),
        usedCount: integer("used_count").notNull().default(0),

        createdAt: timestamp("created_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (t) => [
        index("coupon_branch_allocations_tenant_id_idx").on(t.tenantId),
        index("coupon_branch_allocations_coupon_id_idx").on(t.couponId),
        index("coupon_branch_allocations_branch_id_idx").on(t.branchId),
        // One allocation row per branch per coupon — never two.
        uniqueIndex("coupon_branch_allocations_coupon_branch_udx").on(
            t.couponId,
            t.branchId
        ),
    ]
);

export type CouponBranchAllocation = typeof couponBranchAllocations.$inferSelect;
export type NewCouponBranchAllocation = typeof couponBranchAllocations.$inferInsert;

export type Coupon = typeof coupons.$inferSelect;
export type NewCoupon = typeof coupons.$inferInsert;

export const orderDiscounts = pgTable(
    "order_discounts",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        tenantId: uuid("tenant_id")
            .notNull()
            .references(() => tenants.id, { onDelete: "cascade" }),
        orderId: uuid("order_id")
            .notNull()
            .references(() => orders.id, { onDelete: "cascade" }),

        name: text("name").notNull(), // e.g. "Loyalty Discount", "Weekend Special"
        type: discountTypeEnum("type").notNull(),
        value: integer("value").notNull(), // the % or flat amount as entered
        appliedAmount: integer("applied_amount").notNull(), // computed discount in smallest currency unit

        appliedBy: uuid("applied_by")
            .notNull()
            .references(() => staff.id, { onDelete: "restrict" }),

        couponId: uuid("coupon_id").references(() => coupons.id, { onDelete: "set null" }),

        createdAt: timestamp("created_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (t) => [
        index("order_discounts_order_id_idx").on(t.orderId),
        index("order_discounts_tenant_id_idx").on(t.tenantId),
        index("order_discounts_coupon_id_idx").on(t.couponId),
    ]
);

export const payments = pgTable(
    "payments",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        tenantId: uuid("tenant_id")
            .notNull()
            .references(() => tenants.id, { onDelete: "cascade" }),
        orderId: uuid("order_id")
            .notNull()
            .references(() => orders.id, { onDelete: "cascade" }),

        method: paymentMethodEnum("method").notNull(),
        amount: integer("amount").notNull(),
        reference: text("reference"), // transaction ref for card / JazzCash / Easypaisa

        processedBy: uuid("processed_by")
            .notNull()
            .references(() => staff.id, { onDelete: "restrict" }),
        processedAt: timestamp("processed_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (t) => [
        index("payments_order_id_idx").on(t.orderId),
        index("payments_tenant_id_idx").on(t.tenantId),
        // Payment reconciliation by method
        index("payments_method_idx").on(t.method),
    ]
);

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;
export type OrderDiscount = typeof orderDiscounts.$inferSelect;
export type NewOrderDiscount = typeof orderDiscounts.$inferInsert;
export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
export type OrderCounter = typeof orderCounters.$inferSelect;
export type NewOrderCounter = typeof orderCounters.$inferInsert;