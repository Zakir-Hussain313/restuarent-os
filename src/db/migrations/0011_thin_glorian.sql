CREATE TABLE "branch_delivery_areas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"city" text NOT NULL,
	"area" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "staff_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "customer_name" text;--> statement-breakpoint
ALTER TABLE "branch_delivery_areas" ADD CONSTRAINT "branch_delivery_areas_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_delivery_areas" ADD CONSTRAINT "branch_delivery_areas_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "branch_delivery_areas_tenant_id_idx" ON "branch_delivery_areas" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "branch_delivery_areas_branch_id_idx" ON "branch_delivery_areas" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "branch_delivery_areas_city_area_idx" ON "branch_delivery_areas" USING btree ("city","area");--> statement-breakpoint
CREATE UNIQUE INDEX "branch_delivery_areas_branch_city_area_udx" ON "branch_delivery_areas" USING btree ("branch_id","city","area");