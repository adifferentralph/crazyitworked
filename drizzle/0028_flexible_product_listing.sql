-- A brand is useful catalogue information, but unbranded parts must remain listable.
ALTER TABLE public.products ALTER COLUMN brand DROP NOT NULL;
--> statement-breakpoint
-- Keep the five-genuine-photo marketplace rule without requiring irrelevant
-- product-number or packaging shots for products such as rims.
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
    AND count(*) FILTER (WHERE is_active AND is_primary) >= 1
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
