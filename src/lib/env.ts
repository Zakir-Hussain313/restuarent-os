import { z } from "zod";

// Validates all required environment variables at startup, once, with clear
// error messages — instead of failing unpredictably mid-request weeks later
// when some rarely-hit code path finally touches a missing var.

const envSchema = z.object({
  // Database
  DATABASE_POOL_URL: z.string().min(1, "DATABASE_POOL_URL is required"),

  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required"),
  SUPABASE_SECRET_KEY: z.string().min(1, "SUPABASE_SECRET_KEY is required"),

  // Tenant
  TENANT_ID: z.string().uuid("TENANT_ID must be a valid UUID"),

  // App
  NEXT_PUBLIC_APP_URL: z.string().url("NEXT_PUBLIC_APP_URL must be a valid URL"),

  // Cron
  CRON_SECRET: z.string().min(16, "CRON_SECRET should be at least 16 characters"),

  // Push notifications (VAPID)
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().min(1, "NEXT_PUBLIC_VAPID_PUBLIC_KEY is required"),
  VAPID_PRIVATE_KEY: z.string().min(1, "VAPID_PRIVATE_KEY is required"),
  VAPID_SUBJECT: z.string().min(1, "VAPID_SUBJECT is required"),

  // Restaurant config
  NEXT_PUBLIC_RESTAURANT_NAME: z.string().min(1),
  NEXT_PUBLIC_RESTAURANT_ADDRESS: z.string().min(1),
  NEXT_PUBLIC_RESTAURANT_CITY: z.string().min(1),
  NEXT_PUBLIC_RESTAURANT_COUNTRY: z.string().min(1),
  NEXT_PUBLIC_RESTAURANT_PHONE: z.string().min(1),
  NEXT_PUBLIC_RESTAURANT_CURRENCY: z.string().optional(),
  NEXT_PUBLIC_RESTAURANT_CURRENCY_SYMBOL: z.string().optional(),
  NEXT_PUBLIC_RESTAURANT_LOCALE: z.string().optional(),
  NEXT_PUBLIC_RESTAURANT_TIMEZONE: z.string().min(1),
  RESTAURANT_LOGO_FILENAME: z.string().optional(),

  // Rate limiting (Upstash)
  UPSTASH_REDIS_REST_URL: z.string().url("UPSTASH_REDIS_REST_URL must be a valid URL"),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1, "UPSTASH_REDIS_REST_TOKEN is required"),
});

export function validateEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("\n❌ Invalid environment configuration:\n");
    for (const issue of result.error.issues) {
      console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
    }
    console.error("\nCheck your .env.local file against .env.example.\n");
    throw new Error("Environment validation failed — see errors above.");
  }
  return result.data;
}