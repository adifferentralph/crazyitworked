-- Keep the database contract aligned with the onboarding form: CAC/business
-- registration and the public business description are optional at launch.
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
      nullif(btrim(NEW.store_name), '') IS NULL
      OR nullif(btrim(NEW.contact_phone), '') IS NULL
      OR nullif(btrim(NEW.country), '') IS NULL
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
REVOKE ALL ON FUNCTION public.validate_seller_profile_write() FROM PUBLIC, anon, authenticated;
