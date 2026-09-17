-- Preserve draft flexibility while requiring one authoritative primary fitment
-- whenever a listing moves into marketplace review.
WITH first_active_fitment AS (
  SELECT DISTINCT ON (product_id)
    product_id,
    fitment_id
  FROM public.product_fitments
  WHERE is_active = true
  ORDER BY product_id, created_at, fitment_id
)
UPDATE public.product_fitments AS product_fitments
SET is_primary = true
FROM first_active_fitment
WHERE product_fitments.product_id = first_active_fitment.product_id
  AND product_fitments.fitment_id = first_active_fitment.fitment_id
  AND NOT EXISTS (
    SELECT 1
    FROM public.product_fitments AS existing_primary
    WHERE existing_primary.product_id = product_fitments.product_id
      AND existing_primary.is_active = true
      AND existing_primary.is_primary = true
  );
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
    EXISTS (
      SELECT 1
      FROM public.product_fitments
      WHERE product_id = target_product_id
        AND is_active = true
        AND is_primary = true
    )
    AND count(*) FILTER (WHERE is_active) >= 5
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
REVOKE ALL ON FUNCTION public.product_submission_ready(uuid, public.product_condition)
FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.require_product_primary_fitment_on_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.status = 'PENDING_REVIEW'
    AND NEW.status IS DISTINCT FROM OLD.status
    AND NOT EXISTS (
      SELECT 1
      FROM public.product_fitments
      WHERE product_id = NEW.id
        AND is_active = true
        AND is_primary = true
    ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'Choose at least one primary vehicle fitment before submitting';
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.require_product_primary_fitment_on_submission()
FROM PUBLIC, anon, authenticated, service_role;
--> statement-breakpoint
DROP TRIGGER IF EXISTS products_require_primary_fitment ON public.products;
--> statement-breakpoint
CREATE TRIGGER products_require_primary_fitment
  BEFORE UPDATE OF status ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.require_product_primary_fitment_on_submission();
