ALTER TABLE "customer_addresses" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "customers" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "customer_addresses" CASCADE;--> statement-breakpoint
DROP TABLE "customers" CASCADE;--> statement-breakpoint
ALTER TABLE "orders" DROP CONSTRAINT "orders_customer_id_customers_id_fk";
--> statement-breakpoint
DROP INDEX "orders_customer_id_idx";--> statement-breakpoint
ALTER TABLE "branches" ALTER COLUMN "address" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "customer_id";