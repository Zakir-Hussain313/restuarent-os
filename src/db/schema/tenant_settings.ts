import {
    pgTable,
    uuid,
    text,
    boolean,
    integer,
    timestamp,
    jsonb,
    index,
    uniqueIndex,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { branches } from "./branches";

// Operating hours for a single day.
type DayHours = {
    open: boolean;
    openTime: string | null;  // "HH:MM" 24-hour format
    closeTime: string | null; // "HH:MM" 24-hour format
};

// Full week operating hours schedule.
type OperatingHours = {
    monday: DayHours;
    tuesday: DayHours;
    wednesday: DayHours;
    thursday: DayHours;
    friday: DayHours;
    saturday: DayHours;
    sunday: DayHours;
};

// Receipt footer/header customization.
type ReceiptSettings = {
    headerLine1: string | null;
    headerLine2: string | null;
    footerLine1: string | null;
    footerLine2: string | null;
    showLogo: boolean;
    showTaxNumber: boolean;
};

// Notification preferences — which events trigger alerts and via which channel.
type NotificationSettings = {
    newOrder: boolean;
    orderStatusChange: boolean;
    lowStock: boolean;
    newCustomer: boolean;
};

export const tenantSettings = pgTable(
    "tenant_settings",
    {
        id: uuid("id").primaryKey().defaultRandom(),

        // 1:1 with tenants. Enforced via uniqueIndex below.
        // onDelete: "cascade" — settings are meaningless without the tenant.
        tenantId: uuid("tenant_id")
            .notNull()
            .references(() => tenants.id, { onDelete: "cascade" }),

        // ── Website ──────────────────────────────────────────────────────
        // Which branch's menu shows on the public marketing homepage.
        // Nullable — if unset, the app falls back to the earliest-created
        // active branch (see getPublicWebsiteMenuAction).
        websiteBranchId: uuid("website_branch_id").references(() => branches.id, {
            onDelete: "set null",
        }),

        // ── Localization ──────────────────────────────────────────────────
        currency: text("currency").notNull().default("PKR"),
        currencySymbol: text("currency_symbol").notNull().default("₨"),
        timezone: text("timezone").notNull().default("Asia/Karachi"),
        dateFormat: text("date_format").notNull().default("DD/MM/YYYY"),
        timeFormat: text("time_format").notNull().default("12h"),

        // ── Tax ───────────────────────────────────────────────────────────
        // Stored as integer basis points (e.g. 1700 = 17%) to avoid float
        // arithmetic. Divide by 100 at the application layer to get percentage.
        taxRateBps: integer("tax_rate_bps").notNull().default(0),
        taxName: text("tax_name").notNull().default("Tax"),
        taxNumber: text("tax_number"), // e.g. NTN for Pakistani restaurants

        // ── Order settings ────────────────────────────────────────────────
        allowGuestOrders: boolean("allow_guest_orders").notNull().default(true),
        requireTableForDineIn: boolean("require_table_for_dine_in")
            .notNull()
            .default(true),
        autoConfirmOrders: boolean("auto_confirm_orders")
            .notNull()
            .default(false),
        defaultEstimatedDeliveryMinutes: integer(
            "default_estimated_delivery_minutes"
        )
            .notNull()
            .default(30),

        // ── POS settings ──────────────────────────────────────────────────
        posRequirePin: boolean("pos_require_pin").notNull().default(true),
        posAllowDiscounts: boolean("pos_allow_discounts").notNull().default(true),
        posAllowCustomPrice: boolean("pos_allow_custom_price")
            .notNull()
            .default(false),

        // ── Receipt ───────────────────────────────────────────────────────
        receiptSettings: jsonb("receipt_settings")
            .$type<ReceiptSettings>()
            .notNull()
            .default({
                headerLine1: null,
                headerLine2: null,
                footerLine1: null,
                footerLine2: null,
                showLogo: true,
                showTaxNumber: true,
            }),

        // ── Operating hours ───────────────────────────────────────────────
        operatingHours: jsonb("operating_hours").$type<OperatingHours>(),

        // ── Notifications ─────────────────────────────────────────────────
        notificationSettings: jsonb("notification_settings")
            .$type<NotificationSettings>()
            .notNull()
            .default({
                newOrder: true,
                orderStatusChange: true,
                lowStock: false,
                newCustomer: false,
            }),

        createdAt: timestamp("created_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (t) => [
        // Enforces 1:1 relationship with tenants
        uniqueIndex("tenant_settings_tenant_id_udx").on(t.tenantId),
        // RLS enforcement
        index("tenant_settings_tenant_id_idx").on(t.tenantId),
    ]
);

export type TenantSettings = typeof tenantSettings.$inferSelect;
export type NewTenantSettings = typeof tenantSettings.$inferInsert;