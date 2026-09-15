CREATE OR REPLACE FUNCTION public.validate_admin_profile_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = NEW.user_id
      AND role = 'ADMIN'::public.user_role
  ) THEN
    RAISE EXCEPTION 'Admin profile requires an authoritative ADMIN role';
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.validate_admin_profile_role() FROM PUBLIC, anon, authenticated, service_role;
--> statement-breakpoint
DROP TRIGGER IF EXISTS admin_profiles_validate_role ON public.admin_profiles;
--> statement-breakpoint
CREATE TRIGGER admin_profiles_validate_role
  BEFORE INSERT OR UPDATE ON public.admin_profiles
  FOR EACH ROW EXECUTE FUNCTION public.validate_admin_profile_role();
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.validate_profile_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.role IS NOT DISTINCT FROM OLD.role THEN
    RETURN NEW;
  END IF;

  IF NEW.role = 'ADMIN'::public.user_role AND (
    EXISTS (SELECT 1 FROM public.seller_profiles WHERE user_id = NEW.id)
    OR EXISTS (SELECT 1 FROM public.buyer_profiles WHERE user_id = NEW.id)
  ) THEN
    RAISE EXCEPTION 'Remove buyer or seller role profile before assigning ADMIN';
  END IF;

  IF NEW.role <> 'ADMIN'::public.user_role
    AND EXISTS (SELECT 1 FROM public.admin_profiles WHERE user_id = NEW.id) THEN
    RAISE EXCEPTION 'Remove admin profile before changing the authoritative role';
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.validate_profile_role_change() FROM PUBLIC, anon, authenticated, service_role;
--> statement-breakpoint
DROP TRIGGER IF EXISTS profiles_validate_role_change ON public.profiles;
--> statement-breakpoint
CREATE TRIGGER profiles_validate_role_change
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.validate_profile_role_change();
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.provision_admin_identity(
  p_email text,
  p_admin_role_key public.admin_role_key DEFAULT 'SUPER_ADMIN'::public.admin_role_key
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_user_id uuid;
  target_admin_role_id uuid;
BEGIN
  SELECT profiles.id
  INTO target_user_id
  FROM public.profiles
  JOIN auth.users ON auth.users.id = profiles.id
  WHERE lower(profiles.email) = lower(btrim(p_email))
  FOR UPDATE OF profiles;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Create and verify the authentication account before provisioning admin access';
  END IF;

  SELECT id
  INTO target_admin_role_id
  FROM public.admin_roles
  WHERE key = p_admin_role_key;

  IF target_admin_role_id IS NULL THEN
    RAISE EXCEPTION 'Requested admin role is not seeded';
  END IF;

  IF EXISTS (SELECT 1 FROM public.addresses WHERE user_id = target_user_id)
    OR EXISTS (SELECT 1 FROM public.saved_vehicles WHERE buyer_id = target_user_id)
    OR EXISTS (SELECT 1 FROM public.saved_parts WHERE buyer_id = target_user_id)
    OR EXISTS (SELECT 1 FROM public.cart_items WHERE buyer_id = target_user_id)
    OR EXISTS (SELECT 1 FROM public.part_requests WHERE buyer_id = target_user_id)
    OR EXISTS (SELECT 1 FROM public.orders WHERE buyer_id = target_user_id)
    OR EXISTS (SELECT 1 FROM public.products WHERE seller_id = target_user_id)
  THEN
    RAISE EXCEPTION 'Admin provisioning requires a fresh account with no buyer or seller activity';
  END IF;

  DELETE FROM public.admin_profiles WHERE user_id = target_user_id;
  DELETE FROM public.seller_profiles WHERE user_id = target_user_id;
  DELETE FROM public.buyer_profiles WHERE user_id = target_user_id;

  UPDATE public.profiles
  SET role = 'ADMIN'::public.user_role,
      status = 'ACTIVE'::public.account_status,
      updated_at = now()
  WHERE id = target_user_id;

  INSERT INTO public.admin_profiles (user_id, admin_role_id, job_title)
  VALUES (target_user_id, target_admin_role_id, 'Marketplace administrator');

  INSERT INTO public.audit_logs (
    action,
    object_type,
    object_id,
    new_value,
    reason,
    metadata
  )
  VALUES (
    'admin.identity_provisioned',
    'profile',
    target_user_id::text,
    jsonb_build_object('role', 'ADMIN', 'admin_role', p_admin_role_key::text),
    'Explicit SQL-editor admin provisioning',
    jsonb_build_object('session_user', session_user)
  );

  RETURN target_user_id;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.provision_admin_identity(text, public.admin_role_key)
FROM PUBLIC, anon, authenticated, service_role;
--> statement-breakpoint
COMMENT ON FUNCTION public.provision_admin_identity(text, public.admin_role_key) IS
'Owner-only SQL-editor helper that atomically converts a fresh verified account into an authoritative admin identity.';
