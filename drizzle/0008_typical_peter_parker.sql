CREATE TYPE "public"."part_quote_status" AS ENUM('SUBMITTED', 'REVISED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."part_request_status" AS ENUM('DRAFT', 'OPEN', 'QUOTED', 'ACCEPTED', 'CLOSED', 'CANCELLED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."seller_request_match_status" AS ENUM('MATCHED', 'VIEWED', 'QUOTED', 'DECLINED');--> statement-breakpoint
CREATE TABLE "part_request_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"actor_user_id" uuid,
	"event_type" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "part_request_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "part_request_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"storage_bucket" text DEFAULT 'request-media' NOT NULL,
	"storage_path" text NOT NULL,
	"original_filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "part_request_images_size_positive" CHECK ("part_request_images"."size_bytes" > 0)
);
--> statement-breakpoint
ALTER TABLE "part_request_images" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "part_request_quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"seller_id" uuid NOT NULL,
	"product_id" uuid,
	"quantity" integer NOT NULL,
	"unit_price_minor" bigint NOT NULL,
	"delivery_fee_minor" bigint DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'NGN' NOT NULL,
	"estimated_delivery_days" integer,
	"notes" text,
	"status" "part_quote_status" DEFAULT 'SUBMITTED' NOT NULL,
	"valid_until" timestamp with time zone,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "part_request_quotes_quantity_positive" CHECK ("part_request_quotes"."quantity" between 1 and 1000),
	CONSTRAINT "part_request_quotes_unit_price_positive" CHECK ("part_request_quotes"."unit_price_minor" > 0),
	CONSTRAINT "part_request_quotes_delivery_fee_nonnegative" CHECK ("part_request_quotes"."delivery_fee_minor" >= 0),
	CONSTRAINT "part_request_quotes_currency_ngn" CHECK ("part_request_quotes"."currency" = 'NGN'),
	CONSTRAINT "part_request_quotes_delivery_days_positive" CHECK ("part_request_quotes"."estimated_delivery_days" is null or "part_request_quotes"."estimated_delivery_days" between 1 and 365)
);
--> statement-breakpoint
ALTER TABLE "part_request_quotes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "part_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"buyer_id" uuid NOT NULL,
	"saved_vehicle_id" uuid,
	"fitment_id" uuid,
	"category_id" uuid,
	"part_name" text NOT NULL,
	"description" text NOT NULL,
	"oem_part_number" text,
	"manufacturer_part_number" text,
	"quantity" integer DEFAULT 1 NOT NULL,
	"condition_preferences" text[] DEFAULT '{}'::text[] NOT NULL,
	"budget_min_minor" bigint,
	"budget_max_minor" bigint,
	"currency" text DEFAULT 'NGN' NOT NULL,
	"delivery_state" text NOT NULL,
	"delivery_city" text NOT NULL,
	"status" "part_request_status" DEFAULT 'DRAFT' NOT NULL,
	"submitted_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "part_requests_quantity_positive" CHECK ("part_requests"."quantity" between 1 and 1000),
	CONSTRAINT "part_requests_currency_ngn" CHECK ("part_requests"."currency" = 'NGN'),
	CONSTRAINT "part_requests_budget_min_positive" CHECK ("part_requests"."budget_min_minor" is null or "part_requests"."budget_min_minor" > 0),
	CONSTRAINT "part_requests_budget_max_positive" CHECK ("part_requests"."budget_max_minor" is null or "part_requests"."budget_max_minor" > 0),
	CONSTRAINT "part_requests_budget_range" CHECK ("part_requests"."budget_min_minor" is null or "part_requests"."budget_max_minor" is null or "part_requests"."budget_max_minor" >= "part_requests"."budget_min_minor")
);
--> statement-breakpoint
ALTER TABLE "part_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "seller_categories" (
	"seller_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "seller_categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "seller_request_matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"seller_id" uuid NOT NULL,
	"category_matched" boolean DEFAULT false NOT NULL,
	"location_matched" boolean DEFAULT false NOT NULL,
	"status" "seller_request_match_status" DEFAULT 'MATCHED' NOT NULL,
	"matched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"viewed_at" timestamp with time zone,
	"responded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "seller_request_matches" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "part_request_events" ADD CONSTRAINT "part_request_events_request_id_part_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."part_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "part_request_events" ADD CONSTRAINT "part_request_events_actor_user_id_profiles_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "part_request_images" ADD CONSTRAINT "part_request_images_request_id_part_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."part_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "part_request_images" ADD CONSTRAINT "part_request_images_uploaded_by_profiles_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "part_request_quotes" ADD CONSTRAINT "part_request_quotes_request_id_part_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."part_requests"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "part_request_quotes" ADD CONSTRAINT "part_request_quotes_seller_id_seller_profiles_user_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."seller_profiles"("user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "part_request_quotes" ADD CONSTRAINT "part_request_quotes_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "part_requests" ADD CONSTRAINT "part_requests_buyer_id_buyer_profiles_user_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."buyer_profiles"("user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "part_requests" ADD CONSTRAINT "part_requests_saved_vehicle_id_saved_vehicles_id_fk" FOREIGN KEY ("saved_vehicle_id") REFERENCES "public"."saved_vehicles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "part_requests" ADD CONSTRAINT "part_requests_fitment_id_vehicle_fitments_id_fk" FOREIGN KEY ("fitment_id") REFERENCES "public"."vehicle_fitments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "part_requests" ADD CONSTRAINT "part_requests_category_id_product_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_categories" ADD CONSTRAINT "seller_categories_seller_id_seller_profiles_user_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."seller_profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_categories" ADD CONSTRAINT "seller_categories_category_id_product_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_request_matches" ADD CONSTRAINT "seller_request_matches_request_id_part_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."part_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_request_matches" ADD CONSTRAINT "seller_request_matches_seller_id_seller_profiles_user_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."seller_profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "part_request_events_request_created_idx" ON "part_request_events" USING btree ("request_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "part_request_images_storage_path_unique" ON "part_request_images" USING btree ("storage_path");--> statement-breakpoint
CREATE INDEX "part_request_images_request_created_idx" ON "part_request_images" USING btree ("request_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "part_request_quotes_request_seller_unique" ON "part_request_quotes" USING btree ("request_id","seller_id");--> statement-breakpoint
CREATE INDEX "part_request_quotes_request_status_idx" ON "part_request_quotes" USING btree ("request_id","status","created_at");--> statement-breakpoint
CREATE INDEX "part_request_quotes_seller_status_idx" ON "part_request_quotes" USING btree ("seller_id","status","updated_at");--> statement-breakpoint
CREATE INDEX "part_requests_buyer_status_idx" ON "part_requests" USING btree ("buyer_id","status","updated_at");--> statement-breakpoint
CREATE INDEX "part_requests_category_status_idx" ON "part_requests" USING btree ("category_id","status","created_at");--> statement-breakpoint
CREATE INDEX "part_requests_fitment_status_idx" ON "part_requests" USING btree ("fitment_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "seller_categories_seller_category_unique" ON "seller_categories" USING btree ("seller_id","category_id");--> statement-breakpoint
CREATE INDEX "seller_categories_category_idx" ON "seller_categories" USING btree ("category_id","seller_id");--> statement-breakpoint
CREATE UNIQUE INDEX "seller_request_matches_request_seller_unique" ON "seller_request_matches" USING btree ("request_id","seller_id");--> statement-breakpoint
CREATE INDEX "seller_request_matches_seller_status_idx" ON "seller_request_matches" USING btree ("seller_id","status","created_at");--> statement-breakpoint
CREATE POLICY "part_request_events_select_permitted" ON "part_request_events" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (
        select 1 from public.part_requests
        where id = "part_request_events"."request_id" and buyer_id = (select auth.uid())
      ) or exists (
        select 1 from public.seller_request_matches
        where request_id = "part_request_events"."request_id" and seller_id = (select auth.uid())
      ));--> statement-breakpoint
CREATE POLICY "part_request_images_select_permitted" ON "part_request_images" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (
        select 1 from public.part_requests
        where id = "part_request_images"."request_id" and buyer_id = (select auth.uid())
      ) or exists (
        select 1 from public.seller_request_matches
        where request_id = "part_request_images"."request_id" and seller_id = (select auth.uid())
      ));--> statement-breakpoint
CREATE POLICY "part_request_images_insert_owner" ON "part_request_images" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) = "part_request_images"."uploaded_by"
        and exists (
          select 1 from public.part_requests
          where id = "part_request_images"."request_id" and buyer_id = (select auth.uid()) and status in ('DRAFT', 'OPEN')
        ));--> statement-breakpoint
CREATE POLICY "part_request_quotes_select_permitted" ON "part_request_quotes" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "part_request_quotes"."seller_id"
        or exists (
          select 1 from public.part_requests
          where id = "part_request_quotes"."request_id" and buyer_id = (select auth.uid())
        ));--> statement-breakpoint
CREATE POLICY "part_request_quotes_insert_matched_seller" ON "part_request_quotes" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) = "part_request_quotes"."seller_id"
        and "part_request_quotes"."status" = 'SUBMITTED'
        and exists (
          select 1 from public.seller_request_matches
          where request_id = "part_request_quotes"."request_id" and seller_id = (select auth.uid())
        ));--> statement-breakpoint
CREATE POLICY "part_request_quotes_update_own" ON "part_request_quotes" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.uid()) = "part_request_quotes"."seller_id") WITH CHECK ((select auth.uid()) = "part_request_quotes"."seller_id" and "part_request_quotes"."status" in ('SUBMITTED', 'REVISED', 'WITHDRAWN'));--> statement-breakpoint
CREATE POLICY "part_requests_select_permitted" ON "part_requests" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "part_requests"."buyer_id"
        or exists (
          select 1 from public.seller_request_matches
          where request_id = "part_requests"."id" and seller_id = (select auth.uid())
        ));--> statement-breakpoint
CREATE POLICY "part_requests_insert_own" ON "part_requests" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) = "part_requests"."buyer_id" and "part_requests"."status" = 'DRAFT');--> statement-breakpoint
CREATE POLICY "part_requests_update_own" ON "part_requests" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.uid()) = "part_requests"."buyer_id") WITH CHECK ((select auth.uid()) = "part_requests"."buyer_id" and "part_requests"."status" in ('DRAFT', 'OPEN', 'CANCELLED'));--> statement-breakpoint
CREATE POLICY "seller_categories_select_own" ON "seller_categories" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "seller_categories"."seller_id");--> statement-breakpoint
CREATE POLICY "seller_categories_insert_own" ON "seller_categories" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) = "seller_categories"."seller_id");--> statement-breakpoint
CREATE POLICY "seller_categories_update_own" ON "seller_categories" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.uid()) = "seller_categories"."seller_id") WITH CHECK ((select auth.uid()) = "seller_categories"."seller_id");--> statement-breakpoint
CREATE POLICY "seller_categories_delete_own" ON "seller_categories" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select auth.uid()) = "seller_categories"."seller_id");--> statement-breakpoint
CREATE POLICY "seller_request_matches_select_own" ON "seller_request_matches" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "seller_request_matches"."seller_id");--> statement-breakpoint
CREATE POLICY "seller_request_matches_update_own" ON "seller_request_matches" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.uid()) = "seller_request_matches"."seller_id") WITH CHECK ((select auth.uid()) = "seller_request_matches"."seller_id" and "seller_request_matches"."status" in ('VIEWED', 'QUOTED', 'DECLINED'));
--> statement-breakpoint

REVOKE ALL ON TABLE public.seller_categories FROM anon, authenticated;
REVOKE ALL ON TABLE public.part_requests FROM anon, authenticated;
REVOKE ALL ON TABLE public.seller_request_matches FROM anon, authenticated;
REVOKE ALL ON TABLE public.part_request_quotes FROM anon, authenticated;
REVOKE ALL ON TABLE public.part_request_images FROM anon, authenticated;
REVOKE ALL ON TABLE public.part_request_events FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.seller_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.part_requests TO authenticated;
GRANT SELECT, UPDATE ON TABLE public.seller_request_matches TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.part_request_quotes TO authenticated;
GRANT SELECT, INSERT ON TABLE public.part_request_images TO authenticated;
GRANT SELECT ON TABLE public.part_request_events TO authenticated;
--> statement-breakpoint

CREATE TRIGGER seller_categories_set_updated_at
  BEFORE UPDATE ON public.seller_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
--> statement-breakpoint
CREATE TRIGGER part_requests_set_updated_at
  BEFORE UPDATE ON public.part_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
--> statement-breakpoint
CREATE TRIGGER seller_request_matches_set_updated_at
  BEFORE UPDATE ON public.seller_request_matches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
--> statement-breakpoint
CREATE TRIGGER part_request_quotes_set_updated_at
  BEFORE UPDATE ON public.part_request_quotes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.validate_part_request_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF OLD.buyer_id IS DISTINCT FROM NEW.buyer_id THEN
    RAISE EXCEPTION 'Part request ownership cannot change';
  END IF;

  IF OLD.status <> 'DRAFT'::public.part_request_status AND (
    OLD.saved_vehicle_id IS DISTINCT FROM NEW.saved_vehicle_id OR
    OLD.fitment_id IS DISTINCT FROM NEW.fitment_id OR
    OLD.category_id IS DISTINCT FROM NEW.category_id OR
    OLD.part_name IS DISTINCT FROM NEW.part_name OR
    OLD.description IS DISTINCT FROM NEW.description OR
    OLD.oem_part_number IS DISTINCT FROM NEW.oem_part_number OR
    OLD.manufacturer_part_number IS DISTINCT FROM NEW.manufacturer_part_number OR
    OLD.quantity IS DISTINCT FROM NEW.quantity OR
    OLD.condition_preferences IS DISTINCT FROM NEW.condition_preferences OR
    OLD.budget_min_minor IS DISTINCT FROM NEW.budget_min_minor OR
    OLD.budget_max_minor IS DISTINCT FROM NEW.budget_max_minor OR
    OLD.delivery_state IS DISTINCT FROM NEW.delivery_state OR
    OLD.delivery_city IS DISTINCT FROM NEW.delivery_city
  ) THEN
    RAISE EXCEPTION 'Submitted part request details are immutable';
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NOT (
      (OLD.status = 'DRAFT' AND NEW.status = 'OPEN' AND NEW.submitted_at IS NOT NULL) OR
      (OLD.status IN ('OPEN', 'QUOTED') AND NEW.status = 'CANCELLED') OR
      (OLD.status = 'OPEN' AND NEW.status = 'QUOTED') OR
      (OLD.status = 'QUOTED' AND NEW.status = 'ACCEPTED') OR
      (OLD.status = 'ACCEPTED' AND NEW.status = 'CLOSED') OR
      (OLD.status IN ('OPEN', 'QUOTED') AND NEW.status = 'EXPIRED')
    ) THEN
      RAISE EXCEPTION 'Invalid part request status transition from % to %', OLD.status, NEW.status;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.validate_part_request_update() FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
CREATE TRIGGER part_requests_validate_update
  BEFORE UPDATE ON public.part_requests
  FOR EACH ROW EXECUTE FUNCTION public.validate_part_request_update();
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.match_open_part_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  matched_count integer;
BEGIN
  IF NEW.status <> 'OPEN'::public.part_request_status OR
     OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.seller_request_matches (
    request_id,
    seller_id,
    category_matched,
    location_matched
  )
  SELECT
    NEW.id,
    seller_profiles.user_id,
    NEW.category_id IS NULL OR EXISTS (
      SELECT 1
      FROM public.seller_categories
      LEFT JOIN public.product_categories AS requested_category
        ON requested_category.id = NEW.category_id
      LEFT JOIN public.product_categories AS seller_category
        ON seller_category.id = seller_categories.category_id
      WHERE seller_categories.seller_id = seller_profiles.user_id
        AND (
          seller_categories.category_id = NEW.category_id OR
          seller_categories.category_id = requested_category.parent_id OR
          seller_category.parent_id = NEW.category_id
        )
    ),
    lower(coalesce(seller_profiles.state, '')) = lower(NEW.delivery_state)
  FROM public.seller_profiles
  JOIN public.seller_verifications
    ON seller_verifications.seller_id = seller_profiles.user_id
  WHERE seller_profiles.status = 'ACTIVE'
    AND seller_verifications.status = 'APPROVED'
    AND (
      NEW.category_id IS NULL OR EXISTS (
        SELECT 1
        FROM public.seller_categories
        LEFT JOIN public.product_categories AS requested_category
          ON requested_category.id = NEW.category_id
        LEFT JOIN public.product_categories AS seller_category
          ON seller_category.id = seller_categories.category_id
        WHERE seller_categories.seller_id = seller_profiles.user_id
          AND (
            seller_categories.category_id = NEW.category_id OR
            seller_categories.category_id = requested_category.parent_id OR
            seller_category.parent_id = NEW.category_id
          )
      )
    )
  ON CONFLICT (request_id, seller_id) DO NOTHING;

  GET DIAGNOSTICS matched_count = ROW_COUNT;

  INSERT INTO public.part_request_events (request_id, actor_user_id, event_type, metadata)
  VALUES (
    NEW.id,
    NEW.buyer_id,
    'REQUEST_OPENED',
    jsonb_build_object('matched_sellers', matched_count)
  );

  RETURN NEW;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.match_open_part_request() FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
CREATE TRIGGER part_requests_match_on_open
  AFTER UPDATE OF status ON public.part_requests
  FOR EACH ROW EXECUTE FUNCTION public.match_open_part_request();
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.validate_part_request_quote_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  request_status public.part_request_status;
  match_status public.seller_request_match_status;
BEGIN
  IF TG_OP = 'UPDATE' AND (
    OLD.request_id IS DISTINCT FROM NEW.request_id OR
    OLD.seller_id IS DISTINCT FROM NEW.seller_id
  ) THEN
    RAISE EXCEPTION 'Quote ownership and request cannot change';
  END IF;

  SELECT status INTO request_status
  FROM public.part_requests
  WHERE id = NEW.request_id;

  SELECT status INTO match_status
  FROM public.seller_request_matches
  WHERE request_id = NEW.request_id AND seller_id = NEW.seller_id;

  IF request_status NOT IN ('OPEN', 'QUOTED') OR match_status IS NULL OR match_status = 'DECLINED' THEN
    RAISE EXCEPTION 'This request is not open for a quote from this seller';
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'WITHDRAWN' THEN
    RAISE EXCEPTION 'A withdrawn quote cannot be changed';
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.validate_part_request_quote_write() FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
CREATE TRIGGER part_request_quotes_validate_write
  BEFORE INSERT OR UPDATE ON public.part_request_quotes
  FOR EACH ROW EXECUTE FUNCTION public.validate_part_request_quote_write();
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.record_part_request_quote()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.status IN ('SUBMITTED', 'REVISED') THEN
    UPDATE public.seller_request_matches
    SET status = 'QUOTED', responded_at = now()
    WHERE request_id = NEW.request_id AND seller_id = NEW.seller_id;

    UPDATE public.part_requests
    SET status = 'QUOTED'
    WHERE id = NEW.request_id AND status = 'OPEN';

    INSERT INTO public.part_request_events (request_id, actor_user_id, event_type, metadata)
    VALUES (
      NEW.request_id,
      NEW.seller_id,
      CASE WHEN TG_OP = 'INSERT' THEN 'QUOTE_SUBMITTED' ELSE 'QUOTE_REVISED' END,
      jsonb_build_object('quote_id', NEW.id)
    );
  ELSIF NEW.status = 'WITHDRAWN' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.part_request_events (request_id, actor_user_id, event_type, metadata)
    VALUES (NEW.request_id, NEW.seller_id, 'QUOTE_WITHDRAWN', jsonb_build_object('quote_id', NEW.id));
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.record_part_request_quote() FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
CREATE TRIGGER part_request_quotes_record_workflow
  AFTER INSERT OR UPDATE ON public.part_request_quotes
  FOR EACH ROW EXECUTE FUNCTION public.record_part_request_quote();
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.accept_part_request_quote(p_quote_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_request_id uuid;
  target_buyer_id uuid;
BEGIN
  SELECT quotes.request_id, requests.buyer_id
  INTO target_request_id, target_buyer_id
  FROM public.part_request_quotes AS quotes
  JOIN public.part_requests AS requests ON requests.id = quotes.request_id
  WHERE quotes.id = p_quote_id
    AND quotes.status IN ('SUBMITTED', 'REVISED')
    AND requests.status = 'QUOTED'
  FOR UPDATE OF quotes, requests;

  IF target_request_id IS NULL OR target_buyer_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Quote is unavailable for this buyer';
  END IF;

  UPDATE public.part_request_quotes
  SET status = CASE WHEN id = p_quote_id THEN 'ACCEPTED'::public.part_quote_status ELSE 'REJECTED'::public.part_quote_status END
  WHERE request_id = target_request_id
    AND status IN ('SUBMITTED', 'REVISED');

  UPDATE public.part_requests
  SET status = 'ACCEPTED'
  WHERE id = target_request_id;

  INSERT INTO public.part_request_events (request_id, actor_user_id, event_type, metadata)
  VALUES (target_request_id, target_buyer_id, 'QUOTE_ACCEPTED', jsonb_build_object('quote_id', p_quote_id));

  RETURN target_request_id;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.accept_part_request_quote(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_part_request_quote(uuid) TO authenticated;
--> statement-breakpoint

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'request-media',
  'request-media',
  false,
  8388608,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
--> statement-breakpoint

DROP POLICY IF EXISTS "request_media_select_permitted" ON storage.objects;
DROP POLICY IF EXISTS "request_media_insert_owner" ON storage.objects;
DROP POLICY IF EXISTS "request_media_delete_draft_owner" ON storage.objects;
--> statement-breakpoint
CREATE POLICY "request_media_select_permitted"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'request-media'
  AND (
    EXISTS (
      SELECT 1 FROM public.part_requests
      WHERE part_requests.id::text = (storage.foldername(name))[2]
        AND part_requests.buyer_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.seller_request_matches
      WHERE seller_request_matches.request_id::text = (storage.foldername(name))[2]
        AND seller_request_matches.seller_id = (SELECT auth.uid())
    )
  )
);
--> statement-breakpoint
CREATE POLICY "request_media_insert_owner"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'request-media'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  AND EXISTS (
    SELECT 1 FROM public.part_requests
    WHERE part_requests.id::text = (storage.foldername(name))[2]
      AND part_requests.buyer_id = (SELECT auth.uid())
      AND part_requests.status IN ('DRAFT', 'OPEN')
  )
);
--> statement-breakpoint
CREATE POLICY "request_media_delete_draft_owner"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'request-media'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  AND EXISTS (
    SELECT 1 FROM public.part_requests
    WHERE part_requests.id::text = (storage.foldername(name))[2]
      AND part_requests.buyer_id = (SELECT auth.uid())
      AND part_requests.status = 'DRAFT'
  )
);