DROP INDEX "branch_delivery_areas_branch_city_area_udx";--> statement-breakpoint
ALTER TABLE "menu_items" ADD COLUMN "is_featured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tenant_settings" ADD COLUMN "website_branch_id" uuid;--> statement-breakpoint
ALTER TABLE "tenant_settings" ADD CONSTRAINT "tenant_settings_website_branch_id_branches_id_fk" FOREIGN KEY ("website_branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "branch_delivery_areas_tenant_city_area_udx" ON "branch_delivery_areas" USING btree ("tenant_id","city","area");