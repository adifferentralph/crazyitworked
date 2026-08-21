CREATE OR REPLACE FUNCTION public.has_permission(permission_code text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.admin_profiles ap ON ap.user_id = p.id
    JOIN public.admin_role_permissions arp ON arp.role_id = ap.admin_role_id
    JOIN public.permissions permission ON permission.id = arp.permission_id
    WHERE p.id = (SELECT auth.uid())
      AND p.role = 'ADMIN'
      AND p.status = 'ACTIVE'
      AND permission.code = permission_code
  );
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.has_permission(text) FROM PUBLIC, anon;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.has_permission(text) TO authenticated;
--> statement-breakpoint
CREATE TYPE "public"."inventory_import_row_status" AS ENUM('VALID', 'INVALID', 'DUPLICATE', 'IMPORTED');--> statement-breakpoint
CREATE TYPE "public"."inventory_import_status" AS ENUM('VALIDATING', 'READY', 'HAS_ERRORS', 'IMPORTED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."product_creation_source" AS ENUM('SELLER', 'PLATFORM_ASSISTED', 'BULK_IMPORT');--> statement-breakpoint
ALTER TYPE "public"."product_image_source" ADD VALUE 'PLATFORM_ASSISTED_ORIGINAL' BEFORE 'ADMIN_APPROVED';--> statement-breakpoint
ALTER TYPE "public"."product_image_source" ADD VALUE 'BULK_IMPORT_ORIGINAL' BEFORE 'ADMIN_APPROVED';--> statement-breakpoint
CREATE TABLE "inventory_import_rows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"import_id" uuid NOT NULL,
	"row_number" integer NOT NULL,
	"status" "inventory_import_row_status" NOT NULL,
	"raw_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"normalized_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"validation_errors" text[] DEFAULT '{}'::text[] NOT NULL,
	"product_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"imported_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "inventory_import_rows" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "inventory_imports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seller_id" uuid NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"file_name" text NOT NULL,
	"file_sha256" text NOT NULL,
	"status" "inventory_import_status" DEFAULT 'VALIDATING' NOT NULL,
	"total_rows" integer DEFAULT 0 NOT NULL,
	"valid_rows" integer DEFAULT 0 NOT NULL,
	"invalid_rows" integer DEFAULT 0 NOT NULL,
	"duplicate_rows" integer DEFAULT 0 NOT NULL,
	"imported_rows" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inventory_imports" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "creation_source" "product_creation_source" DEFAULT 'SELLER' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "created_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "last_modified_by_user_id" uuid;--> statement-breakpoint
UPDATE public.products SET created_by_user_id = seller_id, last_modified_by_user_id = seller_id WHERE created_by_user_id IS NULL OR last_modified_by_user_id IS NULL;--> statement-breakpoint
ALTER TABLE public.products ALTER COLUMN created_by_user_id SET NOT NULL, ALTER COLUMN last_modified_by_user_id SET NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "assisted_onboarding" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "seller_acknowledged_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "inventory_import_rows" ADD CONSTRAINT "inventory_import_rows_import_id_inventory_imports_id_fk" FOREIGN KEY ("import_id") REFERENCES "public"."inventory_imports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_import_rows" ADD CONSTRAINT "inventory_import_rows_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_imports" ADD CONSTRAINT "inventory_imports_seller_id_seller_profiles_user_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."seller_profiles"("user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_imports" ADD CONSTRAINT "inventory_imports_created_by_user_id_profiles_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_import_rows_import_row_unique" ON "inventory_import_rows" USING btree ("import_id","row_number");--> statement-breakpoint
CREATE INDEX "inventory_import_rows_status_idx" ON "inventory_import_rows" USING btree ("import_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_imports_seller_hash_unique" ON "inventory_imports" USING btree ("seller_id","file_sha256");--> statement-breakpoint
CREATE INDEX "inventory_imports_seller_created_idx" ON "inventory_imports" USING btree ("seller_id","created_at");--> statement-breakpoint
CREATE INDEX "inventory_imports_status_created_idx" ON "inventory_imports" USING btree ("status","created_at");--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_created_by_user_id_profiles_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_last_modified_by_user_id_profiles_id_fk" FOREIGN KEY ("last_modified_by_user_id") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "inventory_import_rows_select_authorized" ON "inventory_import_rows" AS PERMISSIVE FOR SELECT TO "authenticated" USING (public.has_permission('assist_seller_inventory'));--> statement-breakpoint
CREATE POLICY "inventory_import_rows_insert_creator" ON "inventory_import_rows" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (public.has_permission('assist_seller_inventory') and exists (
        select 1 from public.inventory_imports
        where id = "inventory_import_rows"."import_id" and created_by_user_id = (select auth.uid())
      ));--> statement-breakpoint
CREATE POLICY "inventory_import_rows_update_creator" ON "inventory_import_rows" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (public.has_permission('assist_seller_inventory') and exists (
        select 1 from public.inventory_imports
        where id = "inventory_import_rows"."import_id" and created_by_user_id = (select auth.uid())
      )) WITH CHECK (public.has_permission('assist_seller_inventory') and exists (
        select 1 from public.inventory_imports
        where id = "inventory_import_rows"."import_id" and created_by_user_id = (select auth.uid())
      ));--> statement-breakpoint
CREATE POLICY "inventory_imports_select_authorized" ON "inventory_imports" AS PERMISSIVE FOR SELECT TO "authenticated" USING (public.has_permission('assist_seller_inventory'));--> statement-breakpoint
CREATE POLICY "inventory_imports_insert_authorized" ON "inventory_imports" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("inventory_imports"."created_by_user_id" = (select auth.uid()) and public.has_permission('assist_seller_inventory'));--> statement-breakpoint
CREATE POLICY "inventory_imports_update_creator" ON "inventory_imports" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("inventory_imports"."created_by_user_id" = (select auth.uid()) and public.has_permission('assist_seller_inventory')) WITH CHECK ("inventory_imports"."created_by_user_id" = (select auth.uid()) and public.has_permission('assist_seller_inventory'));--> statement-breakpoint
ALTER POLICY "products_insert_own" ON "products" TO authenticated WITH CHECK ((select auth.uid()) = "products"."seller_id"
        and "products"."creation_source" = 'SELLER'
        and "products"."created_by_user_id" = (select auth.uid())
        and "products"."last_modified_by_user_id" = (select auth.uid())
        and "products"."status" = 'DRAFT'
        and "products"."submitted_at" is null
        and "products"."published_at" is null
        and "products"."reserved_quantity" = 0
        and exists (
          select 1 from public.seller_profiles
          where user_id = (select auth.uid()) and onboarding_completed_at is not null
        ));--> statement-breakpoint
ALTER TABLE public.inventory_imports
  ADD CONSTRAINT inventory_imports_counts_nonnegative CHECK (
    total_rows >= 0 AND valid_rows >= 0 AND invalid_rows >= 0
    AND duplicate_rows >= 0 AND imported_rows >= 0
    AND valid_rows + invalid_rows + duplicate_rows = total_rows
    AND imported_rows <= valid_rows
  ),
  ADD CONSTRAINT inventory_imports_hash_format CHECK (file_sha256 ~ '^[a-f0-9]{64}$'),
  ADD CONSTRAINT inventory_imports_file_name_not_blank CHECK (char_length(btrim(file_name)) BETWEEN 1 AND 255);
--> statement-breakpoint
ALTER TABLE public.inventory_import_rows
  ADD CONSTRAINT inventory_import_rows_number_positive CHECK (row_number > 0),
  ADD CONSTRAINT inventory_import_rows_product_when_imported CHECK (
    (status = 'IMPORTED' AND product_id IS NOT NULL AND imported_at IS NOT NULL)
    OR (status <> 'IMPORTED' AND product_id IS NULL AND imported_at IS NULL)
  );
--> statement-breakpoint
CREATE TRIGGER inventory_imports_set_updated_at
  BEFORE UPDATE ON public.inventory_imports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.enforce_product_provenance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id uuid := (SELECT auth.uid());
  actor_role public.user_role;
BEGIN
  IF actor_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT role INTO actor_role FROM public.profiles WHERE id = actor_id;

  IF TG_OP = 'INSERT' THEN
    IF NEW.created_by_user_id <> actor_id OR NEW.last_modified_by_user_id <> actor_id THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Product provenance must identify the authenticated creator';
    END IF;

    IF NEW.creation_source = 'SELLER' THEN
      IF actor_role <> 'SELLER' OR NEW.seller_id <> actor_id OR NEW.assisted_onboarding THEN
        RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Seller-created listing provenance is invalid';
      END IF;
    ELSE
      IF NOT public.has_permission('assist_seller_inventory') OR NOT NEW.assisted_onboarding THEN
        RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Assisted listing permission is required';
      END IF;
      NEW.seller_acknowledged_at = NULL;
    END IF;
  ELSE
    IF NEW.seller_id IS DISTINCT FROM OLD.seller_id
      OR NEW.creation_source IS DISTINCT FROM OLD.creation_source
      OR NEW.created_by_user_id IS DISTINCT FROM OLD.created_by_user_id
      OR NEW.assisted_onboarding IS DISTINCT FROM OLD.assisted_onboarding THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Product ownership and provenance are immutable';
    END IF;

    NEW.last_modified_by_user_id = actor_id;

    IF actor_role = 'SELLER' THEN
      IF OLD.seller_acknowledged_at IS NOT NULL
        AND NEW.seller_acknowledged_at IS DISTINCT FROM OLD.seller_acknowledged_at THEN
        RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Seller acknowledgement cannot be removed or changed';
      END IF;
      IF OLD.seller_acknowledged_at IS NULL AND NEW.seller_acknowledged_at IS NOT NULL THEN
        NEW.seller_acknowledged_at = now();
      END IF;
      IF NEW.creation_source <> 'SELLER'
        AND NEW.status = 'PENDING_REVIEW'
        AND NEW.seller_acknowledged_at IS NULL THEN
        RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Seller confirmation is required before assisted listing submission';
      END IF;
    ELSIF NEW.seller_acknowledged_at IS DISTINCT FROM OLD.seller_acknowledged_at THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Only the owning seller can acknowledge an assisted listing';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER products_a_enforce_provenance
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.enforce_product_provenance();
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.inventory_onboarding_sellers()
RETURNS TABLE (
  seller_id uuid,
  store_name text,
  seller_status public.seller_status,
  state text,
  city text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.has_permission('assist_seller_inventory') THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Assisted inventory permission is required';
  END IF;

  RETURN QUERY
  SELECT sp.user_id, sp.store_name, sp.status, sp.state, sp.city
  FROM public.seller_profiles sp
  WHERE sp.onboarding_completed_at IS NOT NULL
    AND sp.status IN ('PENDING_VERIFICATION', 'ACTIVE')
  ORDER BY lower(sp.store_name);
END;
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.inventory_onboarding_products()
RETURNS TABLE (
  product_id uuid,
  seller_id uuid,
  store_name text,
  product_name text,
  sku text,
  product_status public.product_status,
  creation_source public.product_creation_source,
  seller_acknowledged_at timestamptz,
  active_image_count bigint,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.has_permission('assist_seller_inventory') THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Assisted inventory permission is required';
  END IF;

  RETURN QUERY
  SELECT p.id, p.seller_id, sp.store_name, p.name, p.sku, p.status, p.creation_source,
    p.seller_acknowledged_at,
    count(pi.id) FILTER (WHERE pi.is_active),
    p.updated_at
  FROM public.products p
  JOIN public.seller_profiles sp ON sp.user_id = p.seller_id
  LEFT JOIN public.product_images pi ON pi.product_id = p.id
  WHERE p.creation_source <> 'SELLER'
  GROUP BY p.id, sp.store_name
  ORDER BY p.updated_at DESC;
END;
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.create_assisted_product_draft(
  p_seller_id uuid,
  p_category_id uuid,
  p_name text,
  p_slug text,
  p_description text,
  p_condition public.product_condition,
  p_brand text,
  p_oem_part_number text,
  p_manufacturer_part_number text,
  p_sku text,
  p_price_minor bigint,
  p_quantity integer,
  p_state text,
  p_city text,
  p_pickup_available boolean,
  p_delivery_available boolean,
  p_fitment_ids uuid[],
  p_cross_references text[],
  p_creation_source public.product_creation_source
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id uuid := (SELECT auth.uid());
  product_id uuid := gen_random_uuid();
BEGIN
  IF actor_id IS NULL OR NOT public.has_permission('assist_seller_inventory') THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Assisted inventory permission is required';
  END IF;
  IF p_creation_source NOT IN ('PLATFORM_ASSISTED', 'BULK_IMPORT') THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Invalid assisted listing source';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.seller_profiles
    WHERE user_id = p_seller_id AND onboarding_completed_at IS NOT NULL
      AND status IN ('PENDING_VERIFICATION', 'ACTIVE')
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23503', MESSAGE = 'Seller is not eligible for assisted onboarding';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.product_categories WHERE id = p_category_id AND is_active) THEN
    RAISE EXCEPTION USING ERRCODE = '23503', MESSAGE = 'Product category is not active';
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(coalesce(p_fitment_ids, '{}'::uuid[])) fitment_id
    WHERE NOT EXISTS (SELECT 1 FROM public.vehicle_fitments vf WHERE vf.id = fitment_id)
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23503', MESSAGE = 'A vehicle fitment is invalid';
  END IF;

  INSERT INTO public.products (
    id, seller_id, category_id, name, slug, description, condition, brand,
    oem_part_number, manufacturer_part_number, sku, price_minor, quantity,
    country, state, city, pickup_available, delivery_available, status,
    creation_source, created_by_user_id, last_modified_by_user_id, assisted_onboarding
  ) VALUES (
    product_id, p_seller_id, p_category_id, btrim(p_name), p_slug, btrim(p_description),
    p_condition, btrim(p_brand), nullif(btrim(p_oem_part_number), ''),
    nullif(btrim(p_manufacturer_part_number), ''), btrim(p_sku), p_price_minor,
    p_quantity, 'Nigeria', btrim(p_state), btrim(p_city), p_pickup_available,
    p_delivery_available, 'DRAFT', p_creation_source, actor_id, actor_id, true
  );

  INSERT INTO public.product_fitments (product_id, fitment_id)
  SELECT product_id, fitment_id
  FROM unnest(coalesce(p_fitment_ids, '{}'::uuid[])) fitment_id
  ON CONFLICT DO NOTHING;

  INSERT INTO public.product_cross_references (product_id, reference_number)
  SELECT product_id, btrim(reference_number)
  FROM unnest(coalesce(p_cross_references, '{}'::text[])) reference_number
  WHERE btrim(reference_number) <> ''
  ON CONFLICT DO NOTHING;

  RETURN product_id;
END;
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.register_assisted_product_image(
  p_product_id uuid,
  p_storage_path text,
  p_type public.product_image_type,
  p_is_actual_item boolean,
  p_original_filename text,
  p_mime_type text,
  p_size_bytes integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id uuid := (SELECT auth.uid());
  target_product public.products%ROWTYPE;
  image_id uuid := gen_random_uuid();
  next_position integer;
  image_source public.product_image_source;
BEGIN
  IF actor_id IS NULL OR NOT public.has_permission('assist_seller_inventory') THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Assisted inventory permission is required';
  END IF;

  SELECT * INTO target_product FROM public.products WHERE id = p_product_id;
  IF NOT FOUND OR target_product.creation_source = 'SELLER' OR target_product.status NOT IN ('DRAFT', 'NEEDS_CHANGES') THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Assisted draft is not available for media upload';
  END IF;
  IF p_storage_path NOT LIKE target_product.seller_id::text || '/' || p_product_id::text || '/%' THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Product media path does not match seller ownership';
  END IF;
  IF p_mime_type NOT IN ('image/jpeg', 'image/png', 'image/webp') OR p_size_bytes <= 0 OR p_size_bytes > 8388608 THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Product image metadata is invalid';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'product-media' AND name = p_storage_path) THEN
    RAISE EXCEPTION USING ERRCODE = '23503', MESSAGE = 'Uploaded product media object was not found';
  END IF;

  IF p_type = 'PRIMARY' THEN
    UPDATE public.product_images SET is_active = false
    WHERE product_id = p_product_id AND is_primary AND is_active;
  END IF;

  SELECT coalesce(max(position), -1) + 1 INTO next_position
  FROM public.product_images WHERE product_id = p_product_id;
  image_source := CASE target_product.creation_source
    WHEN 'BULK_IMPORT' THEN 'BULK_IMPORT_ORIGINAL'::public.product_image_source
    ELSE 'PLATFORM_ASSISTED_ORIGINAL'::public.product_image_source
  END;

  INSERT INTO public.product_images (
    id, product_id, storage_bucket, storage_path, type, position, is_primary,
    is_actual_item, uploaded_by, source, original_filename, mime_type, size_bytes,
    metadata
  ) VALUES (
    image_id, p_product_id, 'product-media', p_storage_path, p_type, next_position,
    p_type = 'PRIMARY', p_is_actual_item, actor_id, image_source,
    left(p_original_filename, 255), p_mime_type, p_size_bytes,
    jsonb_build_object('assisted', true, 'captured_by', actor_id)
  );

  RETURN image_id;
END;
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.confirm_assisted_product(p_product_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_product public.products%ROWTYPE;
BEGIN
  SELECT * INTO target_product FROM public.products WHERE id = p_product_id;
  IF NOT FOUND OR target_product.seller_id <> (SELECT auth.uid()) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Only the owning seller can confirm this listing';
  END IF;
  IF target_product.creation_source = 'SELLER' OR target_product.status NOT IN ('DRAFT', 'NEEDS_CHANGES') THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'This listing is not awaiting seller confirmation';
  END IF;
  IF NOT public.product_submission_ready(target_product.id, target_product.condition) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Five required product images are needed before confirmation';
  END IF;

  UPDATE public.products
  SET seller_acknowledged_at = now(), status = 'PENDING_REVIEW'
  WHERE id = p_product_id;
END;
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.inventory_staff_can_upload_product_media(object_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.has_permission('assist_seller_inventory') AND EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.seller_id::text = (storage.foldername(object_name))[1]
      AND p.id::text = (storage.foldername(object_name))[2]
      AND p.creation_source <> 'SELLER'
      AND p.status IN ('DRAFT', 'NEEDS_CHANGES')
  );
$$;
--> statement-breakpoint
DROP POLICY IF EXISTS product_media_insert_inventory_staff ON storage.objects;
--> statement-breakpoint
CREATE POLICY product_media_insert_inventory_staff
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'product-media'
  AND public.inventory_staff_can_upload_product_media(name)
);
--> statement-breakpoint

REVOKE ALL ON TABLE public.inventory_imports, public.inventory_import_rows FROM PUBLIC, anon;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON TABLE public.inventory_imports, public.inventory_import_rows TO authenticated;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.enforce_product_provenance() FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.inventory_onboarding_sellers() FROM PUBLIC, anon;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.inventory_onboarding_products() FROM PUBLIC, anon;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.create_assisted_product_draft(uuid, uuid, text, text, text, public.product_condition, text, text, text, text, bigint, integer, text, text, boolean, boolean, uuid[], text[], public.product_creation_source) FROM PUBLIC, anon;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.register_assisted_product_image(uuid, text, public.product_image_type, boolean, text, text, integer) FROM PUBLIC, anon;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.confirm_assisted_product(uuid) FROM PUBLIC, anon;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.inventory_staff_can_upload_product_media(text) FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.inventory_onboarding_sellers() TO authenticated;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.inventory_onboarding_products() TO authenticated;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.create_assisted_product_draft(uuid, uuid, text, text, text, public.product_condition, text, text, text, text, bigint, integer, text, text, boolean, boolean, uuid[], text[], public.product_creation_source) TO authenticated;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.register_assisted_product_image(uuid, text, public.product_image_type, boolean, text, text, integer) TO authenticated;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.confirm_assisted_product(uuid) TO authenticated;--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.inventory_onboarding_seller_skus(p_seller_id uuid)
RETURNS TABLE (sku text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.has_permission('assist_seller_inventory') THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Assisted inventory permission is required';
  END IF;
  RETURN QUERY SELECT lower(p.sku) FROM public.products p WHERE p.seller_id = p_seller_id;
END;
$$;
--> statement-breakpoint
DROP POLICY IF EXISTS product_media_delete_inventory_staff ON storage.objects;
--> statement-breakpoint
CREATE POLICY product_media_delete_inventory_staff
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'product-media'
  AND public.inventory_staff_can_upload_product_media(name)
);
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.inventory_onboarding_seller_skus(uuid) FROM PUBLIC, anon;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.inventory_onboarding_seller_skus(uuid) TO authenticated;