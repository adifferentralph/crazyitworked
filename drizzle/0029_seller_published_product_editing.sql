-- Sellers may correct their own published catalogue information while
-- ownership, moderation states, readiness checks, and audit triggers remain intact.
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

      IF OLD.status NOT IN ('DRAFT', 'NEEDS_CHANGES', 'APPROVED', 'OUT_OF_STOCK')
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
        RAISE EXCEPTION 'This listing cannot be edited while it is under marketplace action';
      END IF;

      IF NEW.status IS DISTINCT FROM OLD.status AND NOT (
        (OLD.status IN ('DRAFT', 'NEEDS_CHANGES', 'APPROVED', 'OUT_OF_STOCK') AND NEW.status = 'PENDING_REVIEW')
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
        MESSAGE = 'Publishing requires a primary vehicle fitment and five active product images';
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
REVOKE ALL ON FUNCTION public.validate_product_write()
FROM PUBLIC, anon, authenticated, service_role;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.seller_can_upload_product_media(object_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    (SELECT auth.uid()) IS NOT NULL
    AND (storage.foldername(object_name))[1] = (SELECT auth.uid())::text
    AND EXISTS (
      SELECT 1
      FROM public.products
      WHERE products.id::text = (storage.foldername(object_name))[2]
        AND products.seller_id = (SELECT auth.uid())
        AND products.status IN ('DRAFT', 'NEEDS_CHANGES', 'APPROVED', 'OUT_OF_STOCK')
    );
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.seller_can_upload_product_media(text)
FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.seller_can_upload_product_media(text) TO authenticated;
