import { pgTable, uuid, text, timestamp, boolean, jsonb, doublePrecision } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";

// Operating hours for a single day.
type DayHours = {
  open: boolean;
  openTime: string | null;  // "HH:MM" 24-hour format
  closeTime: string | null; // "HH:MM" 24-hour format
};

// Full week operating hours schedule, per branch.
type OperatingHours = {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
};

export const branches = pgTable("branches", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),

  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),

  // Simple free-text address — no structured sub-fields.
  address: text("address"),
  city: text("city").notNull(),
  image: text("image"),
  isMainBranch: boolean("is_main_branch").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),

    // Nullable - null means "no hours configured", and the reservation
  // hours check treats that as "open anytime" (see isWithinOperatingHours).
  operatingHours: jsonb("operating_hours").$type<OperatingHours>(),
  // Nullable - null means no geofence check is applied for clock-in at
  // this branch (see clockInAction). Set once via "use my current location"
  // in branch settings.
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Branch = typeof branches.$inferSelect;
export type NewBranch = typeof branches.$inferInsert;
export type { DayHours, OperatingHours };