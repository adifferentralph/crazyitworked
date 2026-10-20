-- Valid seller submissions publish immediately after the existing submission
-- readiness and primary-fitment triggers accept them. Trigger names are ordered
-- alphabetically by PostgreSQL, so this runs after products_validate_write.
CREATE OR REPLACE FUNCTION public.auto_publish_ready_product()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.status = 'PENDING_REVIEW'
    AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT public.product_submission_ready(NEW.id, NEW.condition) THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'Publishing requires a primary vehicle fitment and five required product images';
    END IF;

    NEW.status = CASE WHEN NEW.quantity > 0 THEN 'APPROVED' ELSE 'OUT_OF_STOCK' END;
    NEW.published_at = coalesce(NEW.published_at, now());
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.auto_publish_ready_product()
FROM PUBLIC, anon, authenticated, service_role;
--> statement-breakpoint
DROP TRIGGER IF EXISTS products_z_auto_publish_ready ON public.products;
--> statement-breakpoint
CREATE TRIGGER products_z_auto_publish_ready
  BEFORE UPDATE OF status ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.auto_publish_ready_product();
