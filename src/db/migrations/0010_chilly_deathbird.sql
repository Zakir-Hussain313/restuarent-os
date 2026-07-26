ALTER TABLE "restaurant_tables" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "restaurant_tables" ALTER COLUMN "status" SET DEFAULT 'available'::text;--> statement-breakpoint
DROP TYPE "public"."table_status";--> statement-breakpoint
CREATE TYPE "public"."table_status" AS ENUM('available', 'occupied', 'reserved');--> statement-breakpoint
ALTER TABLE "restaurant_tables" ALTER COLUMN "status" SET DEFAULT 'available'::"public"."table_status";--> statement-breakpoint
ALTER TABLE "restaurant_tables" ALTER COLUMN "status" SET DATA TYPE "public"."table_status" USING "status"::"public"."table_status";