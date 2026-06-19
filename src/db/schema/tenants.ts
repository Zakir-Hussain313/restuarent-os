import { pgTable, uuid, text, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { subscriptionStatusEnum } from "./enums";

// A tenant = one restaurant business on the platform (maps to your existing
// `Restaurant` type). Branches belong to a tenant; everything else belongs
// to a tenant (and usually a branch).
export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),

  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),

  // Branding: logo, cover image, colors — kept as jsonb so the frontend's
  // existing Restaurant.logo / coverImage fields map in without rigid columns.
  branding: jsonb("branding").$type<{
    logo?: string;
    coverImage?: string;
    primaryColor?: string;
  }>(),

  // Subscription / billing state — minimal for now, expand later when
  // billing integration (Stripe etc.) is added.
  subscriptionStatus: subscriptionStatusEnum("subscription_status")
    .notNull()
    .default("trialing"),
  subscriptionPlan: text("subscription_plan"), // e.g. "starter", "pro"
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),

  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;