CREATE TYPE "public"."inventory_transaction_type" AS ENUM('INITIAL_STOCK', 'SELLER_ADJUSTMENT', 'RESERVATION', 'RESERVATION_RELEASE', 'SALE', 'RETURN', 'ADMIN_ADJUSTMENT');--> statement-breakpoint
CREATE TYPE "public"."media_history_action" AS ENUM('UPLOADED', 'ACTIVATED', 'DEACTIVATED', 'REPLACED');--> statement-breakpoint
CREATE TYPE "public"."product_condition" AS ENUM('NEW', 'USED', 'REFURBISHED', 'RECONDITIONED', 'OEM_TAKE_OFF', 'AFTERMARKET');--> statement-breakpoint
CREATE TYPE "public"."product_image_source" AS ENUM('SELLER_ORIGINAL', 'ADMIN_APPROVED', 'ADMIN_REPLACEMENT');--> statement-breakpoint
CREATE TYPE "public"."product_image_type" AS ENUM('PRIMARY', 'ANGLE', 'DETAIL', 'PART_NUMBER', 'PACKAGING', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."product_status" AS ENUM('DRAFT', 'PENDING_REVIEW', 'NEEDS_CHANGES', 'APPROVED', 'REJECTED', 'FLAGGED', 'SUSPENDED', 'OUT_OF_STOCK');--> statement-breakpoint
CREATE TYPE "public"."seller_verification_status" AS ENUM('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TABLE "drivetrains" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "drivetrains" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "engines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text,
	"name" text NOT NULL,
	"fuel_type" text,
	"displacement_cc" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "engines" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "inventory_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"type" "inventory_transaction_type" NOT NULL,
	"quantity_before" integer NOT NULL,
	"quantity_delta" integer NOT NULL,
	"quantity_after" integer NOT NULL,
	"reserved_before" integer DEFAULT 0 NOT NULL,
	"reserved_delta" integer DEFAULT 0 NOT NULL,
	"reserved_after" integer DEFAULT 0 NOT NULL,
	"reason" text,
	"actor_user_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inventory_transactions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "product_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"position" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product_categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "product_cross_references" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"reference_number" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product_cross_references" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "product_fitments" (
	"product_id" uuid NOT NULL,
	"fitment_id" uuid NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product_fitments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "product_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"storage_bucket" text DEFAULT 'product-media' NOT NULL,
	"storage_path" text NOT NULL,
	"type" "product_image_type" NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"is_actual_item" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"source" "product_image_source" DEFAULT 'SELLER_ORIGINAL' NOT NULL,
	"original_filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"deactivated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_images_position_nonnegative" CHECK ("product_images"."position" >= 0),
	CONSTRAINT "product_images_size_positive" CHECK ("product_images"."size_bytes" > 0)
);
--> statement-breakpoint
ALTER TABLE "product_images" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "product_media_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"product_image_id" uuid,
	"action" "media_history_action" NOT NULL,
	"actor_user_id" uuid,
	"source" "product_image_source" NOT NULL,
	"storage_path" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product_media_history" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "product_modification_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"actor_user_id" uuid,
	"action" text NOT NULL,
	"previous_value" jsonb,
	"new_value" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product_modification_history" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seller_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text NOT NULL,
	"condition" "product_condition" NOT NULL,
	"brand" text NOT NULL,
	"oem_part_number" text,
	"manufacturer_part_number" text,
	"sku" text NOT NULL,
	"price_minor" bigint NOT NULL,
	"currency" text DEFAULT 'NGN' NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"reserved_quantity" integer DEFAULT 0 NOT NULL,
	"country" text DEFAULT 'Nigeria' NOT NULL,
	"state" text NOT NULL,
	"city" text NOT NULL,
	"pickup_available" boolean DEFAULT false NOT NULL,
	"delivery_available" boolean DEFAULT true NOT NULL,
	"status" "product_status" DEFAULT 'DRAFT' NOT NULL,
	"submitted_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_price_minor_positive" CHECK ("products"."price_minor" > 0),
	CONSTRAINT "products_currency_ngn" CHECK ("products"."currency" = 'NGN'),
	CONSTRAINT "products_quantity_nonnegative" CHECK ("products"."quantity" >= 0),
	CONSTRAINT "products_reserved_nonnegative" CHECK ("products"."reserved_quantity" >= 0),
	CONSTRAINT "products_reserved_within_quantity" CHECK ("products"."reserved_quantity" <= "products"."quantity"),
	CONSTRAINT "products_fulfilment_available" CHECK ("products"."pickup_available" = true or "products"."delivery_available" = true)
);
--> statement-breakpoint
ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "seller_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seller_id" uuid NOT NULL,
	"status" "seller_verification_status" DEFAULT 'DRAFT' NOT NULL,
	"submitted_at" timestamp with time zone,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" uuid,
	"rejection_reason" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "seller_verifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "transmissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "transmissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "vehicle_fitments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"make_id" uuid NOT NULL,
	"model_id" uuid NOT NULL,
	"generation_id" uuid,
	"year_id" uuid NOT NULL,
	"trim_id" uuid,
	"engine_id" uuid,
	"transmission_id" uuid,
	"drivetrain_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "vehicle_fitments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "vehicle_generations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_id" uuid NOT NULL,
	"name" text NOT NULL,
	"start_year" integer NOT NULL,
	"end_year" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vehicle_generations_year_range_check" CHECK ("vehicle_generations"."start_year" between 1950 and 2100),
	CONSTRAINT "vehicle_generations_end_year_check" CHECK ("vehicle_generations"."end_year" is null or "vehicle_generations"."end_year" >= "vehicle_generations"."start_year")
);
--> statement-breakpoint
ALTER TABLE "vehicle_generations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "vehicle_makes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "vehicle_makes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "vehicle_models" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"make_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "vehicle_models" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "vehicle_trims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_id" uuid NOT NULL,
	"generation_id" uuid,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "vehicle_trims" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "vehicle_years" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_id" uuid NOT NULL,
	"generation_id" uuid,
	"year" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vehicle_years_value_check" CHECK ("vehicle_years"."year" between 1950 and 2100)
);
--> statement-breakpoint
ALTER TABLE "vehicle_years" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "seller_profiles" ADD COLUMN "contact_phone" text;--> statement-breakpoint
ALTER TABLE "seller_profiles" ADD COLUMN "website_url" text;--> statement-breakpoint
ALTER TABLE "seller_profiles" ADD COLUMN "onboarding_completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_actor_user_id_profiles_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_parent_id_product_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."product_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_cross_references" ADD CONSTRAINT "product_cross_references_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_fitments" ADD CONSTRAINT "product_fitments_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_fitments" ADD CONSTRAINT "product_fitments_fitment_id_vehicle_fitments_id_fk" FOREIGN KEY ("fitment_id") REFERENCES "public"."vehicle_fitments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_uploaded_by_profiles_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_media_history" ADD CONSTRAINT "product_media_history_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_media_history" ADD CONSTRAINT "product_media_history_product_image_id_product_images_id_fk" FOREIGN KEY ("product_image_id") REFERENCES "public"."product_images"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_media_history" ADD CONSTRAINT "product_media_history_actor_user_id_profiles_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_modification_history" ADD CONSTRAINT "product_modification_history_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_modification_history" ADD CONSTRAINT "product_modification_history_actor_user_id_profiles_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_seller_id_seller_profiles_user_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."seller_profiles"("user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_product_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_verifications" ADD CONSTRAINT "seller_verifications_seller_id_seller_profiles_user_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."seller_profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_verifications" ADD CONSTRAINT "seller_verifications_reviewed_by_profiles_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_fitments" ADD CONSTRAINT "vehicle_fitments_make_id_vehicle_makes_id_fk" FOREIGN KEY ("make_id") REFERENCES "public"."vehicle_makes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_fitments" ADD CONSTRAINT "vehicle_fitments_model_id_vehicle_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."vehicle_models"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_fitments" ADD CONSTRAINT "vehicle_fitments_generation_id_vehicle_generations_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."vehicle_generations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_fitments" ADD CONSTRAINT "vehicle_fitments_year_id_vehicle_years_id_fk" FOREIGN KEY ("year_id") REFERENCES "public"."vehicle_years"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_fitments" ADD CONSTRAINT "vehicle_fitments_trim_id_vehicle_trims_id_fk" FOREIGN KEY ("trim_id") REFERENCES "public"."vehicle_trims"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_fitments" ADD CONSTRAINT "vehicle_fitments_engine_id_engines_id_fk" FOREIGN KEY ("engine_id") REFERENCES "public"."engines"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_fitments" ADD CONSTRAINT "vehicle_fitments_transmission_id_transmissions_id_fk" FOREIGN KEY ("transmission_id") REFERENCES "public"."transmissions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_fitments" ADD CONSTRAINT "vehicle_fitments_drivetrain_id_drivetrains_id_fk" FOREIGN KEY ("drivetrain_id") REFERENCES "public"."drivetrains"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_generations" ADD CONSTRAINT "vehicle_generations_model_id_vehicle_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."vehicle_models"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_models" ADD CONSTRAINT "vehicle_models_make_id_vehicle_makes_id_fk" FOREIGN KEY ("make_id") REFERENCES "public"."vehicle_makes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_trims" ADD CONSTRAINT "vehicle_trims_model_id_vehicle_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."vehicle_models"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_trims" ADD CONSTRAINT "vehicle_trims_generation_id_vehicle_generations_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."vehicle_generations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_years" ADD CONSTRAINT "vehicle_years_model_id_vehicle_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."vehicle_models"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_years" ADD CONSTRAINT "vehicle_years_generation_id_vehicle_generations_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."vehicle_generations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "drivetrains_code_unique" ON "drivetrains" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "engines_name_code_unique" ON "engines" USING btree (lower("name"),"code");--> statement-breakpoint
CREATE INDEX "inventory_transactions_product_created_idx" ON "inventory_transactions" USING btree ("product_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "product_categories_slug_unique" ON "product_categories" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "product_categories_parent_name_unique" ON "product_categories" USING btree ("parent_id",lower("name"));--> statement-breakpoint
CREATE INDEX "product_categories_parent_idx" ON "product_categories" USING btree ("parent_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "product_cross_references_product_number_unique" ON "product_cross_references" USING btree ("product_id",lower("reference_number"));--> statement-breakpoint
CREATE INDEX "product_cross_references_number_idx" ON "product_cross_references" USING btree (lower("reference_number"));--> statement-breakpoint
CREATE UNIQUE INDEX "product_fitments_product_fitment_unique" ON "product_fitments" USING btree ("product_id","fitment_id");--> statement-breakpoint
CREATE INDEX "product_fitments_fitment_idx" ON "product_fitments" USING btree ("fitment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_images_storage_path_unique" ON "product_images" USING btree ("storage_path");--> statement-breakpoint
CREATE UNIQUE INDEX "product_images_active_primary_unique" ON "product_images" USING btree ("product_id") WHERE "product_images"."is_primary" = true and "product_images"."is_active" = true;--> statement-breakpoint
CREATE INDEX "product_images_product_position_idx" ON "product_images" USING btree ("product_id","position");--> statement-breakpoint
CREATE INDEX "product_media_history_product_created_idx" ON "product_media_history" USING btree ("product_id","created_at");--> statement-breakpoint
CREATE INDEX "product_modification_history_product_created_idx" ON "product_modification_history" USING btree ("product_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "products_slug_unique" ON "products" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "products_seller_sku_unique" ON "products" USING btree ("seller_id",lower("sku"));--> statement-breakpoint
CREATE INDEX "products_seller_status_idx" ON "products" USING btree ("seller_id","status");--> statement-breakpoint
CREATE INDEX "products_category_status_idx" ON "products" USING btree ("category_id","status");--> statement-breakpoint
CREATE INDEX "products_name_idx" ON "products" USING btree (lower("name"));--> statement-breakpoint
CREATE INDEX "products_oem_idx" ON "products" USING btree (lower("oem_part_number"));--> statement-breakpoint
CREATE INDEX "products_manufacturer_part_idx" ON "products" USING btree (lower("manufacturer_part_number"));--> statement-breakpoint
CREATE INDEX "products_created_idx" ON "products" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "seller_verifications_seller_unique" ON "seller_verifications" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX "seller_verifications_status_idx" ON "seller_verifications" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "transmissions_code_unique" ON "transmissions" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "vehicle_fitments_configuration_unique" ON "vehicle_fitments" USING btree ("make_id","model_id","year_id","trim_id","engine_id","transmission_id","drivetrain_id");--> statement-breakpoint
CREATE INDEX "vehicle_fitments_lookup_idx" ON "vehicle_fitments" USING btree ("make_id","model_id","year_id");--> statement-breakpoint
CREATE UNIQUE INDEX "vehicle_generations_model_name_unique" ON "vehicle_generations" USING btree ("model_id",lower("name"));--> statement-breakpoint
CREATE INDEX "vehicle_generations_model_idx" ON "vehicle_generations" USING btree ("model_id");--> statement-breakpoint
CREATE UNIQUE INDEX "vehicle_makes_name_unique" ON "vehicle_makes" USING btree (lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "vehicle_makes_slug_unique" ON "vehicle_makes" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "vehicle_models_make_name_unique" ON "vehicle_models" USING btree ("make_id",lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "vehicle_models_make_slug_unique" ON "vehicle_models" USING btree ("make_id","slug");--> statement-breakpoint
CREATE INDEX "vehicle_models_make_idx" ON "vehicle_models" USING btree ("make_id");--> statement-breakpoint
CREATE UNIQUE INDEX "vehicle_trims_model_generation_name_unique" ON "vehicle_trims" USING btree ("model_id","generation_id",lower("name"));--> statement-breakpoint
CREATE INDEX "vehicle_trims_model_idx" ON "vehicle_trims" USING btree ("model_id");--> statement-breakpoint
CREATE UNIQUE INDEX "vehicle_years_model_year_unique" ON "vehicle_years" USING btree ("model_id","year");--> statement-breakpoint
CREATE INDEX "vehicle_years_generation_idx" ON "vehicle_years" USING btree ("generation_id");--> statement-breakpoint
CREATE POLICY "drivetrains_read_authenticated" ON "drivetrains" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "engines_read_authenticated" ON "engines" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "inventory_transactions_select_own" ON "inventory_transactions" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (select 1 from public.products where id = "inventory_transactions"."product_id" and seller_id = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "product_categories_read_authenticated" ON "product_categories" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("product_categories"."is_active" = true);--> statement-breakpoint
CREATE POLICY "product_cross_references_select_product" ON "product_cross_references" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (select 1 from public.products where id = "product_cross_references"."product_id"));--> statement-breakpoint
CREATE POLICY "product_cross_references_write_own" ON "product_cross_references" AS PERMISSIVE FOR ALL TO "authenticated" USING (exists (select 1 from public.products where id = "product_cross_references"."product_id" and seller_id = (select auth.uid()))) WITH CHECK (exists (select 1 from public.products where id = "product_cross_references"."product_id" and seller_id = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "product_fitments_select_product" ON "product_fitments" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (select 1 from public.products where id = "product_fitments"."product_id"));--> statement-breakpoint
CREATE POLICY "product_fitments_write_own" ON "product_fitments" AS PERMISSIVE FOR ALL TO "authenticated" USING (exists (select 1 from public.products where id = "product_fitments"."product_id" and seller_id = (select auth.uid()))) WITH CHECK (exists (select 1 from public.products where id = "product_fitments"."product_id" and seller_id = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "product_images_select_product" ON "product_images" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (select 1 from public.products where id = "product_images"."product_id"));--> statement-breakpoint
CREATE POLICY "product_images_insert_own" ON "product_images" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) = "product_images"."uploaded_by" and exists (select 1 from public.products where id = "product_images"."product_id" and seller_id = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "product_images_update_own" ON "product_images" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (exists (select 1 from public.products where id = "product_images"."product_id" and seller_id = (select auth.uid()))) WITH CHECK (exists (select 1 from public.products where id = "product_images"."product_id" and seller_id = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "product_media_history_select_own" ON "product_media_history" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (select 1 from public.products where id = "product_media_history"."product_id" and seller_id = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "product_modification_history_select_own" ON "product_modification_history" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (select 1 from public.products where id = "product_modification_history"."product_id" and seller_id = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "products_select_seller_or_approved" ON "products" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "products"."seller_id" or "products"."status" = 'APPROVED');--> statement-breakpoint
CREATE POLICY "products_insert_own" ON "products" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) = "products"."seller_id");--> statement-breakpoint
CREATE POLICY "products_update_own" ON "products" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.uid()) = "products"."seller_id") WITH CHECK ((select auth.uid()) = "products"."seller_id");--> statement-breakpoint
CREATE POLICY "seller_verifications_select_own" ON "seller_verifications" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "seller_verifications"."seller_id");--> statement-breakpoint
CREATE POLICY "seller_verifications_insert_own" ON "seller_verifications" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) = "seller_verifications"."seller_id");--> statement-breakpoint
CREATE POLICY "seller_verifications_update_own" ON "seller_verifications" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.uid()) = "seller_verifications"."seller_id") WITH CHECK ((select auth.uid()) = "seller_verifications"."seller_id");--> statement-breakpoint
CREATE POLICY "transmissions_read_authenticated" ON "transmissions" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "vehicle_fitments_read_authenticated" ON "vehicle_fitments" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "vehicle_generations_read_authenticated" ON "vehicle_generations" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "vehicle_makes_read_authenticated" ON "vehicle_makes" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("vehicle_makes"."is_active" = true);--> statement-breakpoint
CREATE POLICY "vehicle_models_read_authenticated" ON "vehicle_models" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("vehicle_models"."is_active" = true);--> statement-breakpoint
CREATE POLICY "vehicle_trims_read_authenticated" ON "vehicle_trims" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "vehicle_years_read_authenticated" ON "vehicle_years" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);
--> statement-breakpoint
-- Public catalog data is readable, while seller drafts and private histories remain owner-only.
CREATE POLICY "product_categories_read_anon" ON public.product_categories
  FOR SELECT TO anon USING (is_active = true);
--> statement-breakpoint
CREATE POLICY "vehicle_makes_read_anon" ON public.vehicle_makes
  FOR SELECT TO anon USING (is_active = true);
--> statement-breakpoint
CREATE POLICY "vehicle_models_read_anon" ON public.vehicle_models
  FOR SELECT TO anon USING (is_active = true);
--> statement-breakpoint
CREATE POLICY "vehicle_generations_read_anon" ON public.vehicle_generations
  FOR SELECT TO anon USING (true);
--> statement-breakpoint
CREATE POLICY "vehicle_years_read_anon" ON public.vehicle_years
  FOR SELECT TO anon USING (true);
--> statement-breakpoint
CREATE POLICY "vehicle_trims_read_anon" ON public.vehicle_trims
  FOR SELECT TO anon USING (true);
--> statement-breakpoint
CREATE POLICY "engines_read_anon" ON public.engines
  FOR SELECT TO anon USING (true);
--> statement-breakpoint
CREATE POLICY "transmissions_read_anon" ON public.transmissions
  FOR SELECT TO anon USING (true);
--> statement-breakpoint
CREATE POLICY "drivetrains_read_anon" ON public.drivetrains
  FOR SELECT TO anon USING (true);
--> statement-breakpoint
CREATE POLICY "vehicle_fitments_read_anon" ON public.vehicle_fitments
  FOR SELECT TO anon USING (true);
--> statement-breakpoint
CREATE POLICY "products_select_approved_anon" ON public.products
  FOR SELECT TO anon USING (status = 'APPROVED');
--> statement-breakpoint
CREATE POLICY "product_cross_references_select_approved_anon" ON public.product_cross_references
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = product_cross_references.product_id
        AND products.status = 'APPROVED'
    )
  );
--> statement-breakpoint
CREATE POLICY "product_fitments_select_approved_anon" ON public.product_fitments
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = product_fitments.product_id
        AND products.status = 'APPROVED'
    )
  );
--> statement-breakpoint
CREATE POLICY "product_images_select_approved_anon" ON public.product_images
  FOR SELECT TO anon
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = product_images.product_id
        AND products.status = 'APPROVED'
    )
  );
--> statement-breakpoint

REVOKE ALL ON TABLE
  public.seller_verifications,
  public.product_categories,
  public.vehicle_makes,
  public.vehicle_models,
  public.vehicle_generations,
  public.vehicle_years,
  public.vehicle_trims,
  public.engines,
  public.transmissions,
  public.drivetrains,
  public.vehicle_fitments,
  public.products,
  public.product_cross_references,
  public.product_fitments,
  public.product_images,
  public.product_media_history,
  public.inventory_transactions,
  public.product_modification_history
FROM anon, authenticated;
--> statement-breakpoint
GRANT SELECT ON TABLE
  public.product_categories,
  public.vehicle_makes,
  public.vehicle_models,
  public.vehicle_generations,
  public.vehicle_years,
  public.vehicle_trims,
  public.engines,
  public.transmissions,
  public.drivetrains,
  public.vehicle_fitments,
  public.products,
  public.product_cross_references,
  public.product_fitments,
  public.product_images
TO anon;
--> statement-breakpoint
GRANT SELECT ON TABLE
  public.product_categories,
  public.vehicle_makes,
  public.vehicle_models,
  public.vehicle_generations,
  public.vehicle_years,
  public.vehicle_trims,
  public.engines,
  public.transmissions,
  public.drivetrains,
  public.vehicle_fitments,
  public.products,
  public.product_cross_references,
  public.product_fitments,
  public.product_images,
  public.product_media_history,
  public.inventory_transactions,
  public.product_modification_history,
  public.seller_verifications
TO authenticated;
--> statement-breakpoint
GRANT INSERT, UPDATE ON TABLE public.products TO authenticated;
--> statement-breakpoint
GRANT INSERT, UPDATE, DELETE ON TABLE
  public.product_cross_references,
  public.product_fitments
TO authenticated;
--> statement-breakpoint
GRANT INSERT, UPDATE ON TABLE public.product_images TO authenticated;
--> statement-breakpoint
GRANT INSERT, UPDATE ON TABLE public.seller_verifications TO authenticated;
--> statement-breakpoint
GRANT UPDATE (
  store_name,
  description,
  business_registration_number,
  contact_phone,
  website_url,
  onboarding_completed_at,
  country,
  state,
  city
) ON TABLE public.seller_profiles TO authenticated;
--> statement-breakpoint

ALTER TABLE public.products
  ADD CONSTRAINT products_name_not_blank CHECK (char_length(btrim(name)) BETWEEN 3 AND 160),
  ADD CONSTRAINT products_description_length CHECK (char_length(btrim(description)) BETWEEN 20 AND 5000),
  ADD CONSTRAINT products_brand_not_blank CHECK (char_length(btrim(brand)) BETWEEN 2 AND 100),
  ADD CONSTRAINT products_sku_not_blank CHECK (char_length(btrim(sku)) BETWEEN 1 AND 100);
--> statement-breakpoint
ALTER TABLE public.product_cross_references
  ADD CONSTRAINT product_cross_references_not_blank
  CHECK (char_length(btrim(reference_number)) BETWEEN 1 AND 120);
--> statement-breakpoint
ALTER TABLE public.product_images
  ADD CONSTRAINT product_images_primary_type_check
  CHECK ((type = 'PRIMARY') = is_primary),
  ADD CONSTRAINT product_images_mime_check
  CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
  ADD CONSTRAINT product_images_size_limit
  CHECK (size_bytes <= 8388608),
  ADD CONSTRAINT product_images_bucket_check
  CHECK (storage_bucket = 'product-media');
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = (SELECT auth.uid())
      AND role = 'ADMIN'
      AND status = 'ACTIVE'
  );
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.current_user_is_admin() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.current_user_is_admin() TO anon, authenticated;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.validate_seller_profile_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF (SELECT auth.uid()) IS NOT NULL AND NOT public.current_user_is_admin() THEN
    IF NEW.user_id IS DISTINCT FROM OLD.user_id
      OR NEW.status IS DISTINCT FROM OLD.status
      OR NEW.slug IS DISTINCT FROM OLD.slug THEN
      RAISE EXCEPTION 'Protected seller identity fields cannot be changed';
    END IF;

    IF OLD.onboarding_completed_at IS NOT NULL AND NEW.onboarding_completed_at IS NULL THEN
      RAISE EXCEPTION 'Seller onboarding completion cannot be reversed';
    END IF;

    IF NEW.onboarding_completed_at IS NOT NULL AND (
      nullif(btrim(NEW.description), '') IS NULL
      OR nullif(btrim(NEW.business_registration_number), '') IS NULL
      OR nullif(btrim(NEW.contact_phone), '') IS NULL
      OR nullif(btrim(NEW.state), '') IS NULL
      OR nullif(btrim(NEW.city), '') IS NULL
    ) THEN
      RAISE EXCEPTION 'Complete all required seller onboarding fields';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER seller_profiles_validate_write
  BEFORE UPDATE ON public.seller_profiles
  FOR EACH ROW EXECUTE FUNCTION public.validate_seller_profile_write();
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.validate_seller_verification_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF (SELECT auth.uid()) IS NOT NULL AND NOT public.current_user_is_admin() THEN
    IF NEW.seller_id <> (SELECT auth.uid())
      OR NEW.status NOT IN ('DRAFT', 'SUBMITTED')
      OR NEW.reviewed_at IS NOT NULL
      OR NEW.reviewed_by IS NOT NULL
      OR NEW.rejection_reason IS NOT NULL THEN
      RAISE EXCEPTION 'Seller cannot set verification review outcomes';
    END IF;

    IF TG_OP = 'UPDATE' AND OLD.status = 'SUBMITTED' AND NEW.status <> OLD.status THEN
      RAISE EXCEPTION 'Submitted verification is awaiting review';
    END IF;

    IF NEW.status = 'SUBMITTED' AND NEW.submitted_at IS NULL THEN
      NEW.submitted_at = now();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER seller_verifications_validate_write
  BEFORE INSERT OR UPDATE ON public.seller_verifications
  FOR EACH ROW EXECUTE FUNCTION public.validate_seller_verification_write();
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.validate_vehicle_fitment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.vehicle_models
    WHERE id = NEW.model_id AND make_id = NEW.make_id
  ) THEN
    RAISE EXCEPTION 'Vehicle model does not belong to selected make';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.vehicle_years
    WHERE id = NEW.year_id AND model_id = NEW.model_id
  ) THEN
    RAISE EXCEPTION 'Vehicle year does not belong to selected model';
  END IF;

  IF NEW.generation_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.vehicle_generations
    WHERE id = NEW.generation_id AND model_id = NEW.model_id
  ) THEN
    RAISE EXCEPTION 'Vehicle generation does not belong to selected model';
  END IF;

  IF NEW.trim_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.vehicle_trims
    WHERE id = NEW.trim_id
      AND model_id = NEW.model_id
      AND (generation_id IS NULL OR generation_id IS NOT DISTINCT FROM NEW.generation_id)
  ) THEN
    RAISE EXCEPTION 'Vehicle trim is not valid for selected model and generation';
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER vehicle_fitments_validate
  BEFORE INSERT OR UPDATE ON public.vehicle_fitments
  FOR EACH ROW EXECUTE FUNCTION public.validate_vehicle_fitment();
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.product_submission_ready(
  target_product_id uuid,
  target_condition public.product_condition
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    count(*) FILTER (WHERE is_active) >= 5
    AND count(*) FILTER (WHERE is_active AND type = 'PRIMARY' AND is_primary) >= 1
    AND count(*) FILTER (WHERE is_active AND type = 'ANGLE') >= 1
    AND count(*) FILTER (WHERE is_active AND type = 'DETAIL') >= 1
    AND count(*) FILTER (WHERE is_active AND type = 'PART_NUMBER') >= 1
    AND count(*) FILTER (WHERE is_active AND type = 'PACKAGING') >= 1
    AND (
      target_condition IN ('NEW', 'AFTERMARKET')
      OR count(*) FILTER (WHERE is_active AND is_actual_item) >= 1
    )
  FROM public.product_images
  WHERE product_id = target_product_id;
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.validate_product_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_role public.user_role;
BEGIN
  IF (SELECT auth.uid()) IS NOT NULL THEN
    SELECT role INTO actor_role
    FROM public.profiles
    WHERE id = (SELECT auth.uid());

    IF actor_role = 'SELLER' THEN
      IF NEW.seller_id <> (SELECT auth.uid()) OR NEW.seller_id IS DISTINCT FROM OLD.seller_id THEN
        RAISE EXCEPTION 'Seller ownership cannot be changed';
      END IF;

      IF OLD.status NOT IN ('DRAFT', 'NEEDS_CHANGES')
        AND ROW(
          NEW.category_id,
          NEW.name,
          NEW.slug,
          NEW.description,
          NEW.condition,
          NEW.brand,
          NEW.oem_part_number,
          NEW.manufacturer_part_number,
          NEW.sku,
          NEW.price_minor,
          NEW.country,
          NEW.state,
          NEW.city,
          NEW.pickup_available,
          NEW.delivery_available
        ) IS DISTINCT FROM ROW(
          OLD.category_id,
          OLD.name,
          OLD.slug,
          OLD.description,
          OLD.condition,
          OLD.brand,
          OLD.oem_part_number,
          OLD.manufacturer_part_number,
          OLD.sku,
          OLD.price_minor,
          OLD.country,
          OLD.state,
          OLD.city,
          OLD.pickup_available,
          OLD.delivery_available
        ) THEN
        RAISE EXCEPTION 'Only draft or needs-changes listings can edit listing details';
      END IF;

      IF NEW.status IS DISTINCT FROM OLD.status AND NOT (
        (OLD.status IN ('DRAFT', 'NEEDS_CHANGES') AND NEW.status = 'PENDING_REVIEW')
        OR (OLD.status = 'APPROVED' AND NEW.status = 'OUT_OF_STOCK' AND NEW.quantity = 0)
        OR (OLD.status = 'OUT_OF_STOCK' AND NEW.status = 'APPROVED' AND NEW.quantity > 0)
      ) THEN
        RAISE EXCEPTION 'Invalid seller product status transition';
      END IF;

      IF NEW.published_at IS DISTINCT FROM OLD.published_at THEN
        RAISE EXCEPTION 'Seller cannot set publication timestamps';
      END IF;
    END IF;
  END IF;

  IF NEW.status = 'PENDING_REVIEW' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT public.product_submission_ready(NEW.id, NEW.condition) THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'Listing submission requires five active required images and an actual-item image when applicable';
    END IF;
    NEW.submitted_at = now();
  END IF;

  IF NEW.quantity = 0 AND OLD.status = 'APPROVED' THEN
    NEW.status = 'OUT_OF_STOCK';
  ELSIF NEW.quantity > 0 AND OLD.status = 'OUT_OF_STOCK' THEN
    NEW.status = 'APPROVED';
  END IF;

  NEW.version = OLD.version + 1;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER products_validate_write
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.validate_product_write();
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.record_product_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.product_modification_history (
    product_id,
    actor_user_id,
    action,
    previous_value,
    new_value
  )
  VALUES (
    NEW.id,
    (SELECT auth.uid()),
    CASE WHEN TG_OP = 'INSERT' THEN 'CREATED' ELSE 'UPDATED' END,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    to_jsonb(NEW)
  );

  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER products_record_history
  AFTER INSERT OR UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.record_product_history();
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.record_inventory_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  transaction_type public.inventory_transaction_type;
BEGIN
  IF TG_OP = 'INSERT' THEN
    transaction_type = 'INITIAL_STOCK';
    INSERT INTO public.inventory_transactions (
      product_id,
      type,
      quantity_before,
      quantity_delta,
      quantity_after,
      reserved_before,
      reserved_delta,
      reserved_after,
      actor_user_id,
      reason
    )
    VALUES (
      NEW.id,
      transaction_type,
      0,
      NEW.quantity,
      NEW.quantity,
      0,
      NEW.reserved_quantity,
      NEW.reserved_quantity,
      (SELECT auth.uid()),
      'Initial listing inventory'
    );
  ELSIF NEW.quantity IS DISTINCT FROM OLD.quantity
    OR NEW.reserved_quantity IS DISTINCT FROM OLD.reserved_quantity THEN
    transaction_type = CASE
      WHEN NEW.reserved_quantity > OLD.reserved_quantity THEN 'RESERVATION'
      WHEN NEW.reserved_quantity < OLD.reserved_quantity THEN 'RESERVATION_RELEASE'
      ELSE 'SELLER_ADJUSTMENT'
    END;

    INSERT INTO public.inventory_transactions (
      product_id,
      type,
      quantity_before,
      quantity_delta,
      quantity_after,
      reserved_before,
      reserved_delta,
      reserved_after,
      actor_user_id,
      reason
    )
    VALUES (
      NEW.id,
      transaction_type,
      OLD.quantity,
      NEW.quantity - OLD.quantity,
      NEW.quantity,
      OLD.reserved_quantity,
      NEW.reserved_quantity - OLD.reserved_quantity,
      NEW.reserved_quantity,
      (SELECT auth.uid()),
      'Inventory quantity changed'
    );
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER products_record_inventory
  AFTER INSERT OR UPDATE OF quantity, reserved_quantity ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.record_inventory_history();
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.validate_product_image_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NOT public.current_user_is_admin() THEN
    IF NEW.product_id IS DISTINCT FROM OLD.product_id
      OR NEW.storage_bucket IS DISTINCT FROM OLD.storage_bucket
      OR NEW.storage_path IS DISTINCT FROM OLD.storage_path
      OR NEW.type IS DISTINCT FROM OLD.type
      OR NEW.uploaded_by IS DISTINCT FROM OLD.uploaded_by
      OR NEW.source IS DISTINCT FROM OLD.source
      OR NEW.original_filename IS DISTINCT FROM OLD.original_filename
      OR NEW.mime_type IS DISTINCT FROM OLD.mime_type
      OR NEW.size_bytes IS DISTINCT FROM OLD.size_bytes THEN
      RAISE EXCEPTION 'Original product media is immutable';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.is_active = false AND OLD.is_active = true THEN
    NEW.deactivated_at = now();
  ELSIF NEW.is_active = true THEN
    NEW.deactivated_at = NULL;
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER product_images_validate_write
  BEFORE UPDATE ON public.product_images
  FOR EACH ROW EXECUTE FUNCTION public.validate_product_image_write();
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.record_product_media_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.product_media_history (
      product_id,
      product_image_id,
      action,
      actor_user_id,
      source,
      storage_path,
      metadata
    )
    VALUES (
      NEW.product_id,
      NEW.id,
      'UPLOADED',
      NEW.uploaded_by,
      NEW.source,
      NEW.storage_path,
      jsonb_build_object('type', NEW.type, 'position', NEW.position, 'is_actual_item', NEW.is_actual_item)
    );
  ELSIF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    INSERT INTO public.product_media_history (
      product_id,
      product_image_id,
      action,
      actor_user_id,
      source,
      storage_path,
      metadata
    )
    VALUES (
      NEW.product_id,
      NEW.id,
      CASE WHEN NEW.is_active THEN 'ACTIVATED' ELSE 'DEACTIVATED' END,
      (SELECT auth.uid()),
      NEW.source,
      NEW.storage_path,
      jsonb_build_object('previous_active', OLD.is_active, 'new_active', NEW.is_active)
    );
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER product_images_record_history
  AFTER INSERT OR UPDATE ON public.product_images
  FOR EACH ROW EXECUTE FUNCTION public.record_product_media_history();
--> statement-breakpoint

CREATE TRIGGER product_categories_set_updated_at
  BEFORE UPDATE ON public.product_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
--> statement-breakpoint
CREATE TRIGGER vehicle_makes_set_updated_at
  BEFORE UPDATE ON public.vehicle_makes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
--> statement-breakpoint
CREATE TRIGGER vehicle_models_set_updated_at
  BEFORE UPDATE ON public.vehicle_models
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
--> statement-breakpoint
CREATE TRIGGER vehicle_generations_set_updated_at
  BEFORE UPDATE ON public.vehicle_generations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
--> statement-breakpoint
CREATE TRIGGER vehicle_years_set_updated_at
  BEFORE UPDATE ON public.vehicle_years
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
--> statement-breakpoint
CREATE TRIGGER vehicle_trims_set_updated_at
  BEFORE UPDATE ON public.vehicle_trims
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
--> statement-breakpoint
CREATE TRIGGER engines_set_updated_at
  BEFORE UPDATE ON public.engines
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
--> statement-breakpoint
CREATE TRIGGER transmissions_set_updated_at
  BEFORE UPDATE ON public.transmissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
--> statement-breakpoint
CREATE TRIGGER drivetrains_set_updated_at
  BEFORE UPDATE ON public.drivetrains
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
--> statement-breakpoint
CREATE TRIGGER vehicle_fitments_set_updated_at
  BEFORE UPDATE ON public.vehicle_fitments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
--> statement-breakpoint
CREATE TRIGGER seller_verifications_set_updated_at
  BEFORE UPDATE ON public.seller_verifications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
--> statement-breakpoint

-- New seller accounts receive a verification record in the same transaction as the profile.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  requested_role public.user_role;
  normalized_name text;
  normalized_store_name text;
  generated_slug text;
BEGIN
  IF NEW.email IS NULL THEN
    RAISE EXCEPTION 'Twenty-Two Parts requires email-based accounts';
  END IF;

  requested_role := CASE
    WHEN upper(coalesce(NEW.raw_user_meta_data ->> 'requested_role', '')) = 'SELLER'
      THEN 'SELLER'::public.user_role
    ELSE 'BUYER'::public.user_role
  END;

  normalized_name := coalesce(
    nullif(btrim(NEW.raw_user_meta_data ->> 'full_name'), ''),
    'Account holder'
  );

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (NEW.id, lower(NEW.email), normalized_name, requested_role);

  IF requested_role = 'SELLER'::public.user_role THEN
    normalized_store_name := coalesce(
      nullif(btrim(NEW.raw_user_meta_data ->> 'store_name'), ''),
      normalized_name || ' Parts'
    );
    generated_slug := coalesce(
      nullif(trim(both '-' FROM regexp_replace(lower(normalized_store_name), '[^a-z0-9]+', '-', 'g')), ''),
      'seller'
    ) || '-' || substring(replace(NEW.id::text, '-', '') FROM 1 FOR 8);

    INSERT INTO public.seller_profiles (user_id, store_name, slug)
    VALUES (NEW.id, normalized_store_name, generated_slug);

    INSERT INTO public.seller_verifications (seller_id)
    VALUES (NEW.id);
  ELSE
    INSERT INTO public.buyer_profiles (user_id)
    VALUES (NEW.id);
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
INSERT INTO public.seller_verifications (seller_id)
SELECT user_id FROM public.seller_profiles
ON CONFLICT (seller_id) DO NOTHING;
--> statement-breakpoint

-- Product media is private. Sellers can upload/read only immutable objects beneath
-- {sellerId}/{productId}/; approved marketplace images can be read through signed URLs.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-media',
  'product-media',
  false,
  8388608,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;
--> statement-breakpoint
CREATE POLICY "product_media_select_permitted"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'product-media'
  AND (
    (SELECT auth.uid())::text = (storage.foldername(name))[1]
    OR public.current_user_is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.product_images
      JOIN public.products ON products.id = product_images.product_id
      WHERE product_images.storage_path = storage.objects.name
        AND product_images.is_active = true
        AND products.status = 'APPROVED'
    )
  )
);
--> statement-breakpoint
CREATE POLICY "product_media_insert_seller_original"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-media'
  AND (SELECT auth.uid())::text = (storage.foldername(name))[1]
  AND EXISTS (
    SELECT 1
    FROM public.products
    WHERE products.id::text = (storage.foldername(name))[2]
      AND products.seller_id = (SELECT auth.uid())
  )
);
--> statement-breakpoint

REVOKE ALL ON FUNCTION public.validate_seller_profile_write() FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.validate_seller_verification_write() FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.validate_vehicle_fitment() FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.product_submission_ready(uuid, public.product_condition) FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.validate_product_write() FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.record_product_history() FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.record_inventory_history() FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.validate_product_image_write() FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.record_product_media_history() FROM PUBLIC, anon, authenticated;