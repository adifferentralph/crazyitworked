CREATE TABLE "delivery_fallback_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"config_id" uuid NOT NULL,
	"origin_town" text NOT NULL,
	"destination_town" text NOT NULL,
	"distance_km" double precision,
	"fee_minor" bigint NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "delivery_fallback_rates_fee_positive" CHECK ("delivery_fallback_rates"."fee_minor" > 0),
	CONSTRAINT "delivery_fallback_rates_distance_positive" CHECK ("delivery_fallback_rates"."distance_km" is null or "delivery_fallback_rates"."distance_km" > 0)
);
--> statement-breakpoint
ALTER TABLE "delivery_fallback_rates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "delivery_pricing_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" integer NOT NULL,
	"name" text NOT NULL,
	"state" text DEFAULT 'Anambra' NOT NULL,
	"currency" text DEFAULT 'NGN' NOT NULL,
	"base_charge_minor" bigint NOT NULL,
	"minimum_charge_minor" bigint NOT NULL,
	"cost_per_km_minor" bigint NOT NULL,
	"handling_charge_minor" bigint DEFAULT 0 NOT NULL,
	"fragile_surcharge_minor" bigint DEFAULT 0 NOT NULL,
	"bulky_surcharge_minor" bigint DEFAULT 0 NOT NULL,
	"marketplace_markup_minor" bigint DEFAULT 0 NOT NULL,
	"maximum_automatic_fee_minor" bigint NOT NULL,
	"rounding_step_minor" integer DEFAULT 100 NOT NULL,
	"manual_quote_above_grams" integer,
	"manual_quote_above_volume_mm3" bigint,
	"handling_min_days" integer DEFAULT 0 NOT NULL,
	"handling_max_days" integer DEFAULT 1 NOT NULL,
	"transit_min_days" integer DEFAULT 1 NOT NULL,
	"transit_max_days" integer DEFAULT 7 NOT NULL,
	"return_policy_active" boolean DEFAULT false NOT NULL,
	"return_window_days" integer,
	"return_method" text,
	"return_fees" text,
	"service_active" boolean DEFAULT false NOT NULL,
	"production_approved" boolean DEFAULT false NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "delivery_pricing_configs_anambra_only" CHECK (lower("delivery_pricing_configs"."state") = 'anambra'),
	CONSTRAINT "delivery_pricing_configs_ngn_only" CHECK ("delivery_pricing_configs"."currency" = 'NGN'),
	CONSTRAINT "delivery_pricing_configs_money_nonnegative" CHECK ("delivery_pricing_configs"."base_charge_minor" >= 0
        and "delivery_pricing_configs"."minimum_charge_minor" >= 0
        and "delivery_pricing_configs"."cost_per_km_minor" >= 0
        and "delivery_pricing_configs"."handling_charge_minor" >= 0
        and "delivery_pricing_configs"."fragile_surcharge_minor" >= 0
        and "delivery_pricing_configs"."bulky_surcharge_minor" >= 0
        and "delivery_pricing_configs"."marketplace_markup_minor" >= 0
        and "delivery_pricing_configs"."maximum_automatic_fee_minor" > 0),
	CONSTRAINT "delivery_pricing_configs_rounding_positive" CHECK ("delivery_pricing_configs"."rounding_step_minor" > 0),
	CONSTRAINT "delivery_pricing_configs_days_valid" CHECK ("delivery_pricing_configs"."handling_min_days" >= 0
        and "delivery_pricing_configs"."handling_max_days" >= "delivery_pricing_configs"."handling_min_days"
        and "delivery_pricing_configs"."transit_min_days" >= 0
        and "delivery_pricing_configs"."transit_max_days" >= "delivery_pricing_configs"."transit_min_days"),
	CONSTRAINT "delivery_pricing_configs_return_policy_valid" CHECK ((
        "delivery_pricing_configs"."return_policy_active" = false
        and "delivery_pricing_configs"."return_window_days" is null
        and "delivery_pricing_configs"."return_method" is null
        and "delivery_pricing_configs"."return_fees" is null
      ) or (
        "delivery_pricing_configs"."return_policy_active" = true
        and "delivery_pricing_configs"."return_window_days" between 1 and 365
        and "delivery_pricing_configs"."return_method" in ('RETURN_BY_MAIL', 'RETURN_IN_STORE')
        and "delivery_pricing_configs"."return_fees" in ('FREE_RETURN', 'RETURN_SHIPPING_FEES')
      ))
);
--> statement-breakpoint
ALTER TABLE "delivery_pricing_configs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "delivery_quote_shipments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quote_id" uuid NOT NULL,
	"seller_id" uuid NOT NULL,
	"pickup_location_id" uuid NOT NULL,
	"pickup_snapshot" jsonb NOT NULL,
	"product_ids" jsonb NOT NULL,
	"total_weight_grams" integer NOT NULL,
	"volume_mm3" bigint,
	"distance_meters" integer,
	"distance_source" text NOT NULL,
	"vehicle_category_code" text NOT NULL,
	"actual_cost_minor" bigint NOT NULL,
	"platform_component_minor" bigint DEFAULT 0 NOT NULL,
	"customer_charge_minor" bigint NOT NULL,
	"pricing_breakdown" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "delivery_quote_shipments_weight_positive" CHECK ("delivery_quote_shipments"."total_weight_grams" > 0),
	CONSTRAINT "delivery_quote_shipments_charge_exact" CHECK ("delivery_quote_shipments"."customer_charge_minor" = "delivery_quote_shipments"."actual_cost_minor" + "delivery_quote_shipments"."platform_component_minor")
);
--> statement-breakpoint
ALTER TABLE "delivery_quote_shipments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "delivery_quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"buyer_id" uuid NOT NULL,
	"pricing_config_id" uuid NOT NULL,
	"cart_fingerprint" text NOT NULL,
	"address_snapshot" jsonb NOT NULL,
	"product_subtotal_minor" bigint NOT NULL,
	"delivery_total_minor" bigint NOT NULL,
	"total_minor" bigint NOT NULL,
	"vat_minor" bigint DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'NGN' NOT NULL,
	"status" text DEFAULT 'VALID' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "delivery_quotes_status_valid" CHECK ("delivery_quotes"."status" in ('VALID', 'EXPIRED', 'CONSUMED', 'MANUAL_REQUIRED', 'INVALID')),
	CONSTRAINT "delivery_quotes_ngn_only" CHECK ("delivery_quotes"."currency" = 'NGN'),
	CONSTRAINT "delivery_quotes_vat_disabled" CHECK ("delivery_quotes"."vat_minor" = 0),
	CONSTRAINT "delivery_quotes_total_exact" CHECK ("delivery_quotes"."total_minor" = "delivery_quotes"."product_subtotal_minor" + "delivery_quotes"."delivery_total_minor" + "delivery_quotes"."vat_minor")
);
--> statement-breakpoint
ALTER TABLE "delivery_quotes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "delivery_vehicle_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"config_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"max_weight_grams" integer NOT NULL,
	"max_length_mm" integer,
	"max_width_mm" integer,
	"max_height_mm" integer,
	"surcharge_minor" bigint DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "delivery_vehicle_categories_weight_positive" CHECK ("delivery_vehicle_categories"."max_weight_grams" > 0),
	CONSTRAINT "delivery_vehicle_categories_surcharge_nonnegative" CHECK ("delivery_vehicle_categories"."surcharge_minor" >= 0)
);
--> statement-breakpoint
ALTER TABLE "delivery_vehicle_categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "delivery_weight_brackets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"config_id" uuid NOT NULL,
	"min_grams" integer NOT NULL,
	"max_grams" integer,
	"surcharge_minor" bigint DEFAULT 0 NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "delivery_weight_brackets_range_valid" CHECK ("delivery_weight_brackets"."min_grams" >= 0 and ("delivery_weight_brackets"."max_grams" is null or "delivery_weight_brackets"."max_grams" > "delivery_weight_brackets"."min_grams")),
	CONSTRAINT "delivery_weight_brackets_surcharge_nonnegative" CHECK ("delivery_weight_brackets"."surcharge_minor" >= 0)
);
--> statement-breakpoint
ALTER TABLE "delivery_weight_brackets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "product_shipping_profiles" (
	"product_id" uuid PRIMARY KEY NOT NULL,
	"pickup_location_id" uuid,
	"weight_grams" integer,
	"packaging_weight_grams" integer DEFAULT 0 NOT NULL,
	"length_mm" integer,
	"width_mm" integer,
	"height_mm" integer,
	"is_fragile" boolean DEFAULT false NOT NULL,
	"is_bulky" boolean DEFAULT false NOT NULL,
	"delivery_eligible" boolean DEFAULT false NOT NULL,
	"requires_location_update" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_shipping_profiles_weight_positive" CHECK ("product_shipping_profiles"."weight_grams" is null or "product_shipping_profiles"."weight_grams" > 0),
	CONSTRAINT "product_shipping_profiles_packaging_nonnegative" CHECK ("product_shipping_profiles"."packaging_weight_grams" >= 0),
	CONSTRAINT "product_shipping_profiles_dimensions_positive" CHECK (("product_shipping_profiles"."length_mm" is null or "product_shipping_profiles"."length_mm" > 0)
        and ("product_shipping_profiles"."width_mm" is null or "product_shipping_profiles"."width_mm" > 0)
        and ("product_shipping_profiles"."height_mm" is null or "product_shipping_profiles"."height_mm" > 0)),
	CONSTRAINT "product_shipping_profiles_delivery_complete" CHECK ("product_shipping_profiles"."delivery_eligible" = false or (
        "product_shipping_profiles"."pickup_location_id" is not null
        and "product_shipping_profiles"."weight_grams" is not null
        and "product_shipping_profiles"."requires_location_update" = false
      ))
);
--> statement-breakpoint
ALTER TABLE "product_shipping_profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "seller_pickup_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seller_id" uuid NOT NULL,
	"label" text NOT NULL,
	"state" text DEFAULT 'Anambra' NOT NULL,
	"lga" text NOT NULL,
	"town" text NOT NULL,
	"street_address" text NOT NULL,
	"landmark" text,
	"latitude" double precision,
	"longitude" double precision,
	"contact_name" text NOT NULL,
	"contact_phone" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "seller_pickup_locations_anambra_only" CHECK (lower("seller_pickup_locations"."state") = 'anambra'),
	CONSTRAINT "seller_pickup_locations_coordinates_pair" CHECK (("seller_pickup_locations"."latitude" is null and "seller_pickup_locations"."longitude" is null) or (
        "seller_pickup_locations"."latitude" between -90 and 90 and "seller_pickup_locations"."longitude" between -180 and 180
      ))
);
--> statement-breakpoint
ALTER TABLE "seller_pickup_locations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "seller_payout_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seller_id" uuid NOT NULL,
	"bank_name" text NOT NULL,
	"bank_code" text,
	"account_name" text NOT NULL,
	"account_number" text NOT NULL,
	"account_number_last4" text NOT NULL,
	"currency" text DEFAULT 'NGN' NOT NULL,
	"status" text DEFAULT 'PENDING_VERIFICATION' NOT NULL,
	"verified_at" timestamp with time zone,
	"verified_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "seller_payout_accounts_ngn_only" CHECK ("seller_payout_accounts"."currency" = 'NGN'),
	CONSTRAINT "seller_payout_accounts_status_valid" CHECK ("seller_payout_accounts"."status" in ('PENDING_VERIFICATION', 'VERIFIED', 'REJECTED', 'DISABLED')),
	CONSTRAINT "seller_payout_accounts_number_valid" CHECK ("seller_payout_accounts"."account_number" ~ '^[0-9]{10}$' and "seller_payout_accounts"."account_number_last4" ~ '^[0-9]{4}$')
);
--> statement-breakpoint
ALTER TABLE "seller_payout_accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "seller_withdrawal_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seller_id" uuid NOT NULL,
	"payout_account_id" uuid NOT NULL,
	"amount_minor" bigint NOT NULL,
	"currency" text DEFAULT 'NGN' NOT NULL,
	"status" text DEFAULT 'REQUESTED' NOT NULL,
	"seller_note" text,
	"admin_note" text,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"payout_reference" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "seller_withdrawal_requests_amount_positive" CHECK ("seller_withdrawal_requests"."amount_minor" > 0),
	CONSTRAINT "seller_withdrawal_requests_ngn_only" CHECK ("seller_withdrawal_requests"."currency" = 'NGN'),
	CONSTRAINT "seller_withdrawal_requests_status_valid" CHECK ("seller_withdrawal_requests"."status" in ('REQUESTED', 'APPROVED', 'PROCESSING', 'PAID', 'REJECTED', 'CANCELLED'))
);
--> statement-breakpoint
ALTER TABLE "seller_withdrawal_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "product_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"buyer_id" uuid NOT NULL,
	"order_item_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"reviewer_name" text NOT NULL,
	"title" text,
	"body" text,
	"status" text DEFAULT 'PUBLISHED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_reviews_rating_range" CHECK ("product_reviews"."rating" between 1 and 5),
	CONSTRAINT "product_reviews_reviewer_name_present" CHECK (length(trim("product_reviews"."reviewer_name")) between 2 and 80),
	CONSTRAINT "product_reviews_status_valid" CHECK ("product_reviews"."status" in ('PUBLISHED', 'HIDDEN'))
);
--> statement-breakpoint
ALTER TABLE "product_reviews" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "orders" DROP CONSTRAINT "orders_buyer_total_exact";--> statement-breakpoint
ALTER TABLE "seller_ledger_entries" ALTER COLUMN "order_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "seller_ledger_entries" ALTER COLUMN "order_item_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "addresses" ADD COLUMN "lga" text;--> statement-breakpoint
ALTER TABLE "addresses" ADD COLUMN "town" text;--> statement-breakpoint
ALTER TABLE "addresses" ADD COLUMN "landmark" text;--> statement-breakpoint
ALTER TABLE "addresses" ADD COLUMN "latitude" double precision;--> statement-breakpoint
ALTER TABLE "addresses" ADD COLUMN "longitude" double precision;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "pickup_location_id" uuid;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "pickup_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_lga" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_town" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_landmark" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_latitude" double precision;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_longitude" double precision;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_address_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_quote_id" uuid;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_pricing_version" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "vat_minor" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "delivery_fallback_rates" ADD CONSTRAINT "delivery_fallback_rates_config_id_delivery_pricing_configs_id_fk" FOREIGN KEY ("config_id") REFERENCES "public"."delivery_pricing_configs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_quote_shipments" ADD CONSTRAINT "delivery_quote_shipments_quote_id_delivery_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."delivery_quotes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_quote_shipments" ADD CONSTRAINT "delivery_quote_shipments_seller_id_seller_profiles_user_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."seller_profiles"("user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_quote_shipments" ADD CONSTRAINT "delivery_quote_shipments_pickup_location_id_seller_pickup_locations_id_fk" FOREIGN KEY ("pickup_location_id") REFERENCES "public"."seller_pickup_locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_quotes" ADD CONSTRAINT "delivery_quotes_buyer_id_buyer_profiles_user_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."buyer_profiles"("user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_quotes" ADD CONSTRAINT "delivery_quotes_pricing_config_id_delivery_pricing_configs_id_fk" FOREIGN KEY ("pricing_config_id") REFERENCES "public"."delivery_pricing_configs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_vehicle_categories" ADD CONSTRAINT "delivery_vehicle_categories_config_id_delivery_pricing_configs_id_fk" FOREIGN KEY ("config_id") REFERENCES "public"."delivery_pricing_configs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_weight_brackets" ADD CONSTRAINT "delivery_weight_brackets_config_id_delivery_pricing_configs_id_fk" FOREIGN KEY ("config_id") REFERENCES "public"."delivery_pricing_configs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_shipping_profiles" ADD CONSTRAINT "product_shipping_profiles_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_shipping_profiles" ADD CONSTRAINT "product_shipping_profiles_pickup_location_id_seller_pickup_locations_id_fk" FOREIGN KEY ("pickup_location_id") REFERENCES "public"."seller_pickup_locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_pickup_locations" ADD CONSTRAINT "seller_pickup_locations_seller_id_seller_profiles_user_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."seller_profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_payout_accounts" ADD CONSTRAINT "seller_payout_accounts_seller_id_seller_profiles_user_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."seller_profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_withdrawal_requests" ADD CONSTRAINT "seller_withdrawal_requests_seller_id_seller_profiles_user_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."seller_profiles"("user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_withdrawal_requests" ADD CONSTRAINT "seller_withdrawal_requests_payout_account_id_seller_payout_accounts_id_fk" FOREIGN KEY ("payout_account_id") REFERENCES "public"."seller_payout_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_buyer_id_buyer_profiles_user_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."buyer_profiles"("user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "delivery_fallback_rates_route_unique" ON "delivery_fallback_rates" USING btree ("config_id",lower("origin_town"),lower("destination_town"));--> statement-breakpoint
CREATE UNIQUE INDEX "delivery_pricing_configs_version_unique" ON "delivery_pricing_configs" USING btree ("version");--> statement-breakpoint
CREATE INDEX "delivery_pricing_configs_active_idx" ON "delivery_pricing_configs" USING btree ("service_active","production_approved");--> statement-breakpoint
CREATE INDEX "delivery_quote_shipments_quote_idx" ON "delivery_quote_shipments" USING btree ("quote_id");--> statement-breakpoint
CREATE INDEX "delivery_quote_shipments_seller_idx" ON "delivery_quote_shipments" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX "delivery_quotes_buyer_created_idx" ON "delivery_quotes" USING btree ("buyer_id","created_at");--> statement-breakpoint
CREATE INDEX "delivery_quotes_fingerprint_expiry_idx" ON "delivery_quotes" USING btree ("cart_fingerprint","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "delivery_vehicle_categories_config_code_unique" ON "delivery_vehicle_categories" USING btree ("config_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "delivery_weight_brackets_config_min_unique" ON "delivery_weight_brackets" USING btree ("config_id","min_grams");--> statement-breakpoint
CREATE INDEX "product_shipping_profiles_pickup_idx" ON "product_shipping_profiles" USING btree ("pickup_location_id");--> statement-breakpoint
CREATE INDEX "seller_pickup_locations_seller_idx" ON "seller_pickup_locations" USING btree ("seller_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "seller_pickup_locations_default_unique" ON "seller_pickup_locations" USING btree ("seller_id") WHERE "seller_pickup_locations"."is_default" = true and "seller_pickup_locations"."is_active" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "seller_payout_accounts_seller_unique" ON "seller_payout_accounts" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX "seller_withdrawal_requests_seller_created_idx" ON "seller_withdrawal_requests" USING btree ("seller_id","created_at");--> statement-breakpoint
CREATE INDEX "seller_withdrawal_requests_status_created_idx" ON "seller_withdrawal_requests" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "seller_withdrawal_requests_payout_reference_unique" ON "seller_withdrawal_requests" USING btree ("payout_reference") WHERE "seller_withdrawal_requests"."payout_reference" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "product_reviews_order_item_unique" ON "product_reviews" USING btree ("order_item_id");--> statement-breakpoint
CREATE INDEX "product_reviews_product_status_idx" ON "product_reviews" USING btree ("product_id","status");--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_coordinates_pair" CHECK (("addresses"."latitude" is null and "addresses"."longitude" is null) or (
      "addresses"."latitude" between -90 and 90 and "addresses"."longitude" between -180 and 180
    ));--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_vat_disabled" CHECK ("orders"."vat_minor" = 0);--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_delivery_coordinates_pair" CHECK (("orders"."delivery_latitude" is null and "orders"."delivery_longitude" is null) or (
        "orders"."delivery_latitude" between -90 and 90 and "orders"."delivery_longitude" between -180 and 180
      ));--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_buyer_total_exact" CHECK ("orders"."total_minor" = "orders"."product_subtotal_minor" + "orders"."delivery_total_minor" + "orders"."vat_minor");--> statement-breakpoint
CREATE POLICY "delivery_fallback_rates_admin_read" ON "delivery_fallback_rates" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (
  select 1 from public.profiles
  where id = (select auth.uid()) and role = 'ADMIN' and status = 'ACTIVE'
));--> statement-breakpoint
CREATE POLICY "delivery_pricing_configs_admin_read" ON "delivery_pricing_configs" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (
  select 1 from public.profiles
  where id = (select auth.uid()) and role = 'ADMIN' and status = 'ACTIVE'
));--> statement-breakpoint
CREATE POLICY "delivery_quote_shipments_participant_or_admin" ON "delivery_quote_shipments" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "delivery_quote_shipments"."seller_id" or exists (
  select 1 from public.profiles
  where id = (select auth.uid()) and role = 'ADMIN' and status = 'ACTIVE'
));--> statement-breakpoint
CREATE POLICY "delivery_quotes_select_owner_or_admin" ON "delivery_quotes" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "delivery_quotes"."buyer_id" or exists (
  select 1 from public.profiles
  where id = (select auth.uid()) and role = 'ADMIN' and status = 'ACTIVE'
));--> statement-breakpoint
CREATE POLICY "delivery_vehicle_categories_admin_read" ON "delivery_vehicle_categories" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (
  select 1 from public.profiles
  where id = (select auth.uid()) and role = 'ADMIN' and status = 'ACTIVE'
));--> statement-breakpoint
CREATE POLICY "delivery_weight_brackets_admin_read" ON "delivery_weight_brackets" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (
  select 1 from public.profiles
  where id = (select auth.uid()) and role = 'ADMIN' and status = 'ACTIVE'
));--> statement-breakpoint
CREATE POLICY "product_shipping_profiles_select_owner_or_admin" ON "product_shipping_profiles" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (
        select 1 from public.products
        where id = "product_shipping_profiles"."product_id" and seller_id = (select auth.uid())
      ) or exists (
  select 1 from public.profiles
  where id = (select auth.uid()) and role = 'ADMIN' and status = 'ACTIVE'
));--> statement-breakpoint
CREATE POLICY "product_shipping_profiles_write_owner" ON "product_shipping_profiles" AS PERMISSIVE FOR ALL TO "authenticated" USING (exists (
        select 1 from public.products
        where id = "product_shipping_profiles"."product_id" and seller_id = (select auth.uid())
      )) WITH CHECK (exists (
        select 1 from public.products
        where id = "product_shipping_profiles"."product_id" and seller_id = (select auth.uid())
      ));--> statement-breakpoint
CREATE POLICY "seller_pickup_locations_select_owner_or_admin" ON "seller_pickup_locations" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "seller_pickup_locations"."seller_id" or exists (
  select 1 from public.profiles
  where id = (select auth.uid()) and role = 'ADMIN' and status = 'ACTIVE'
));--> statement-breakpoint
CREATE POLICY "seller_pickup_locations_insert_owner" ON "seller_pickup_locations" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) = "seller_pickup_locations"."seller_id");--> statement-breakpoint
CREATE POLICY "seller_pickup_locations_update_owner" ON "seller_pickup_locations" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.uid()) = "seller_pickup_locations"."seller_id") WITH CHECK ((select auth.uid()) = "seller_pickup_locations"."seller_id");--> statement-breakpoint
CREATE POLICY "seller_payout_accounts_select_owner_or_admin" ON "seller_payout_accounts" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "seller_payout_accounts"."seller_id" or exists (
  select 1 from public.profiles
  where id = (select auth.uid()) and role = 'ADMIN' and status = 'ACTIVE'
));--> statement-breakpoint
CREATE POLICY "seller_payout_accounts_insert_owner" ON "seller_payout_accounts" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) = "seller_payout_accounts"."seller_id" and "seller_payout_accounts"."status" = 'PENDING_VERIFICATION');--> statement-breakpoint
CREATE POLICY "seller_payout_accounts_update_owner" ON "seller_payout_accounts" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.uid()) = "seller_payout_accounts"."seller_id") WITH CHECK ((select auth.uid()) = "seller_payout_accounts"."seller_id" and "seller_payout_accounts"."status" = 'PENDING_VERIFICATION');--> statement-breakpoint
CREATE POLICY "seller_withdrawal_requests_select_owner_or_admin" ON "seller_withdrawal_requests" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "seller_withdrawal_requests"."seller_id" or exists (
  select 1 from public.profiles
  where id = (select auth.uid()) and role = 'ADMIN' and status = 'ACTIVE'
));--> statement-breakpoint
CREATE POLICY "seller_withdrawal_requests_insert_owner" ON "seller_withdrawal_requests" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) = "seller_withdrawal_requests"."seller_id" and "seller_withdrawal_requests"."status" = 'REQUESTED');--> statement-breakpoint
CREATE POLICY "product_reviews_public_read" ON "product_reviews" AS PERMISSIVE FOR SELECT TO "anon" USING ("product_reviews"."status" = 'PUBLISHED');--> statement-breakpoint
CREATE POLICY "product_reviews_authenticated_read" ON "product_reviews" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("product_reviews"."status" = 'PUBLISHED' or (select auth.uid()) = "product_reviews"."buyer_id");--> statement-breakpoint
CREATE POLICY "product_reviews_insert_verified_buyer" ON "product_reviews" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) = "product_reviews"."buyer_id"
        and "product_reviews"."status" = 'PUBLISHED'
        and exists (
          select 1
          from public.order_items
          join public.orders on orders.id = order_items.order_id
          where order_items.id = "product_reviews"."order_item_id"
            and order_items.product_id = "product_reviews"."product_id"
            and orders.buyer_id = (select auth.uid())
            and orders.status = 'COMPLETED'
        ));
--> statement-breakpoint
CREATE UNIQUE INDEX "delivery_pricing_configs_one_active_unique"
ON public.delivery_pricing_configs ((service_active))
WHERE service_active = true AND production_approved = true;
--> statement-breakpoint
INSERT INTO public.product_shipping_profiles (
  product_id,
  delivery_eligible,
  requires_location_update
)
SELECT id, false, true
FROM public.products
ON CONFLICT (product_id) DO NOTHING;
--> statement-breakpoint
UPDATE public.products
SET delivery_available = false,
    updated_at = now()
WHERE delivery_available = true
  AND NOT EXISTS (
    SELECT 1
    FROM public.product_shipping_profiles
    WHERE product_shipping_profiles.product_id = products.id
      AND product_shipping_profiles.delivery_eligible = true
  );
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.product_delivery_submission_ready(product_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.products
    JOIN public.product_shipping_profiles
      ON product_shipping_profiles.product_id = products.id
    JOIN public.seller_pickup_locations
      ON seller_pickup_locations.id = product_shipping_profiles.pickup_location_id
    WHERE products.id = product_uuid
      AND product_shipping_profiles.delivery_eligible = true
      AND product_shipping_profiles.weight_grams > 0
      AND product_shipping_profiles.requires_location_update = false
      AND seller_pickup_locations.seller_id = products.seller_id
      AND seller_pickup_locations.is_active = true
      AND seller_pickup_locations.verified_at IS NOT NULL
      AND lower(seller_pickup_locations.state) = 'anambra'
  );
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.product_delivery_submission_ready(uuid)
FROM PUBLIC, anon, authenticated, service_role;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.validate_product_delivery_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.status = 'PENDING_REVIEW'
    AND NEW.status IS DISTINCT FROM OLD.status
    AND NEW.delivery_available = true
    AND NOT public.product_delivery_submission_ready(NEW.id) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'Delivery products require a verified Anambra pickup location and a positive shipping weight';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.validate_product_delivery_submission()
FROM PUBLIC, anon, authenticated, service_role;
--> statement-breakpoint
DROP TRIGGER IF EXISTS products_y_validate_delivery_submission ON public.products;
--> statement-breakpoint
CREATE TRIGGER products_y_validate_delivery_submission
  BEFORE UPDATE OF status ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.validate_product_delivery_submission();
--> statement-breakpoint
GRANT SELECT ON TABLE
  public.delivery_fallback_rates,
  public.delivery_pricing_configs,
  public.delivery_quote_shipments,
  public.delivery_quotes,
  public.delivery_vehicle_categories,
  public.delivery_weight_brackets,
  public.product_shipping_profiles,
  public.seller_pickup_locations,
  public.seller_payout_accounts,
  public.seller_withdrawal_requests,
  public.product_reviews
TO authenticated;
--> statement-breakpoint
GRANT SELECT ON TABLE public.product_reviews TO anon;
--> statement-breakpoint
GRANT INSERT, UPDATE ON TABLE public.product_shipping_profiles TO authenticated;
--> statement-breakpoint
GRANT INSERT, UPDATE ON TABLE public.seller_pickup_locations TO authenticated;
--> statement-breakpoint
GRANT INSERT ON TABLE public.product_reviews TO authenticated;
