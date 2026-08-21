CREATE TYPE "public"."buyer_account_type" AS ENUM('INDIVIDUAL', 'MECHANIC_TECHNICIAN', 'GARAGE_WORKSHOP', 'FLEET_OPERATOR', 'CORPORATE_BUYER');--> statement-breakpoint
CREATE TABLE "cart_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"buyer_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cart_items_quantity_positive" CHECK ("cart_items"."quantity" between 1 and 1000)
);
--> statement-breakpoint
ALTER TABLE "cart_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "saved_parts" (
	"buyer_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "saved_parts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "saved_vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"buyer_id" uuid NOT NULL,
	"fitment_id" uuid NOT NULL,
	"label" text,
	"registration_number" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "saved_vehicles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "buyer_profiles" ADD COLUMN "account_type" "buyer_account_type" DEFAULT 'INDIVIDUAL' NOT NULL;--> statement-breakpoint
ALTER TABLE "buyer_profiles" ADD COLUMN "organization_name" text;--> statement-breakpoint
ALTER TABLE "buyer_profiles" ADD COLUMN "business_registration_number" text;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_buyer_id_buyer_profiles_user_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."buyer_profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_parts" ADD CONSTRAINT "saved_parts_buyer_id_buyer_profiles_user_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."buyer_profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_parts" ADD CONSTRAINT "saved_parts_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_vehicles" ADD CONSTRAINT "saved_vehicles_buyer_id_buyer_profiles_user_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."buyer_profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_vehicles" ADD CONSTRAINT "saved_vehicles_fitment_id_vehicle_fitments_id_fk" FOREIGN KEY ("fitment_id") REFERENCES "public"."vehicle_fitments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cart_items_buyer_product_unique" ON "cart_items" USING btree ("buyer_id","product_id");--> statement-breakpoint
CREATE INDEX "cart_items_buyer_updated_idx" ON "cart_items" USING btree ("buyer_id","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "saved_parts_buyer_product_unique" ON "saved_parts" USING btree ("buyer_id","product_id");--> statement-breakpoint
CREATE INDEX "saved_parts_buyer_created_idx" ON "saved_parts" USING btree ("buyer_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "saved_vehicles_buyer_fitment_unique" ON "saved_vehicles" USING btree ("buyer_id","fitment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "saved_vehicles_one_default_per_buyer" ON "saved_vehicles" USING btree ("buyer_id") WHERE "saved_vehicles"."is_default" = true;--> statement-breakpoint
CREATE INDEX "saved_vehicles_buyer_updated_idx" ON "saved_vehicles" USING btree ("buyer_id","updated_at");--> statement-breakpoint
CREATE POLICY "cart_items_select_own" ON "cart_items" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "cart_items"."buyer_id");--> statement-breakpoint
CREATE POLICY "cart_items_insert_own" ON "cart_items" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) = "cart_items"."buyer_id"
        and exists (
          select 1 from public.products
          where id = "cart_items"."product_id"
            and status = 'APPROVED'
            and quantity - reserved_quantity >= "cart_items"."quantity"
        ));--> statement-breakpoint
CREATE POLICY "cart_items_update_own" ON "cart_items" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.uid()) = "cart_items"."buyer_id") WITH CHECK ((select auth.uid()) = "cart_items"."buyer_id"
        and exists (
          select 1 from public.products
          where id = "cart_items"."product_id"
            and status = 'APPROVED'
            and quantity - reserved_quantity >= "cart_items"."quantity"
        ));--> statement-breakpoint
CREATE POLICY "cart_items_delete_own" ON "cart_items" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select auth.uid()) = "cart_items"."buyer_id");--> statement-breakpoint
CREATE POLICY "saved_parts_select_own" ON "saved_parts" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "saved_parts"."buyer_id");--> statement-breakpoint
CREATE POLICY "saved_parts_insert_own" ON "saved_parts" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) = "saved_parts"."buyer_id"
        and exists (select 1 from public.products where id = "saved_parts"."product_id" and status = 'APPROVED'));--> statement-breakpoint
CREATE POLICY "saved_parts_delete_own" ON "saved_parts" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select auth.uid()) = "saved_parts"."buyer_id");--> statement-breakpoint
CREATE POLICY "saved_vehicles_select_own" ON "saved_vehicles" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "saved_vehicles"."buyer_id");--> statement-breakpoint
CREATE POLICY "saved_vehicles_insert_own" ON "saved_vehicles" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) = "saved_vehicles"."buyer_id"
        and exists (select 1 from public.buyer_profiles where user_id = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "saved_vehicles_update_own" ON "saved_vehicles" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.uid()) = "saved_vehicles"."buyer_id") WITH CHECK ((select auth.uid()) = "saved_vehicles"."buyer_id");--> statement-breakpoint
CREATE POLICY "saved_vehicles_delete_own" ON "saved_vehicles" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select auth.uid()) = "saved_vehicles"."buyer_id");
--> statement-breakpoint

-- Client privileges stay narrower than table ownership; RLS is the second boundary.
REVOKE ALL ON TABLE public.saved_vehicles FROM anon, authenticated;
REVOKE ALL ON TABLE public.saved_parts FROM anon, authenticated;
REVOKE ALL ON TABLE public.cart_items FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.saved_vehicles TO authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.saved_parts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.cart_items TO authenticated;
GRANT UPDATE (account_type, organization_name, business_registration_number, preferred_market)
  ON TABLE public.buyer_profiles TO authenticated;
--> statement-breakpoint

CREATE TRIGGER saved_vehicles_set_updated_at
  BEFORE UPDATE ON public.saved_vehicles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
--> statement-breakpoint
CREATE TRIGGER cart_items_set_updated_at
  BEFORE UPDATE ON public.cart_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
--> statement-breakpoint

-- Account type is accepted only from a fixed allow-list; role remains immutable and can
-- still be requested only as BUYER or SELLER during signup.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  requested_role public.user_role;
  requested_buyer_type public.buyer_account_type;
  normalized_name text;
  normalized_store_name text;
  normalized_organization_name text;
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

  requested_buyer_type := CASE upper(coalesce(NEW.raw_user_meta_data ->> 'buyer_account_type', ''))
    WHEN 'MECHANIC_TECHNICIAN' THEN 'MECHANIC_TECHNICIAN'::public.buyer_account_type
    WHEN 'GARAGE_WORKSHOP' THEN 'GARAGE_WORKSHOP'::public.buyer_account_type
    WHEN 'FLEET_OPERATOR' THEN 'FLEET_OPERATOR'::public.buyer_account_type
    WHEN 'CORPORATE_BUYER' THEN 'CORPORATE_BUYER'::public.buyer_account_type
    ELSE 'INDIVIDUAL'::public.buyer_account_type
  END;

  normalized_name := coalesce(
    nullif(btrim(NEW.raw_user_meta_data ->> 'full_name'), ''),
    'Account holder'
  );
  normalized_organization_name := nullif(
    btrim(NEW.raw_user_meta_data ->> 'organization_name'),
    ''
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
    INSERT INTO public.buyer_profiles (user_id, account_type, organization_name)
    VALUES (NEW.id, requested_buyer_type, normalized_organization_name);
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.handle_new_auth_user() FROM PUBLIC, anon, authenticated;