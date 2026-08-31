CREATE OR REPLACE FUNCTION public.finalize_new_oauth_seller(
  p_user_id uuid,
  p_provider text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  auth_created_at timestamptz;
  current_profile public.profiles%ROWTYPE;
  normalized_store_name text;
  generated_slug text;
BEGIN
  IF p_provider NOT IN ('google', 'apple') THEN
    RETURN false;
  END IF;

  SELECT users.created_at
  INTO auth_created_at
  FROM auth.users AS users
  WHERE users.id = p_user_id;

  IF auth_created_at IS NULL
     OR auth_created_at < now() - interval '30 minutes'
     OR NOT EXISTS (
       SELECT 1
       FROM auth.identities AS identities
       WHERE identities.user_id = p_user_id
         AND identities.provider = p_provider
     )
  THEN
    RETURN false;
  END IF;

  SELECT *
  INTO current_profile
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND
     OR current_profile.role <> 'BUYER'::public.user_role
     OR current_profile.created_at < auth_created_at - interval '10 seconds'
     OR NOT EXISTS (
       SELECT 1
       FROM public.buyer_profiles
       WHERE user_id = p_user_id
     )
  THEN
    RETURN false;
  END IF;

  IF EXISTS (SELECT 1 FROM public.addresses WHERE user_id = p_user_id)
     OR EXISTS (SELECT 1 FROM public.saved_vehicles WHERE buyer_id = p_user_id)
     OR EXISTS (SELECT 1 FROM public.saved_parts WHERE buyer_id = p_user_id)
     OR EXISTS (SELECT 1 FROM public.cart_items WHERE buyer_id = p_user_id)
     OR EXISTS (SELECT 1 FROM public.part_requests WHERE buyer_id = p_user_id)
  THEN
    RETURN false;
  END IF;

  normalized_store_name := coalesce(
    nullif(btrim(current_profile.full_name), ''),
    'New supplier'
  ) || ' Parts';
  generated_slug := coalesce(
    nullif(
      trim(
        both '-'
        FROM regexp_replace(
          lower(normalized_store_name),
          '[^a-z0-9]+',
          '-',
          'g'
        )
      ),
      ''
    ),
    'seller'
  ) || '-' || substring(replace(p_user_id::text, '-', '') FROM 1 FOR 8);

  DELETE FROM public.buyer_profiles
  WHERE user_id = p_user_id;

  UPDATE public.profiles
  SET role = 'SELLER'::public.user_role,
      updated_at = now()
  WHERE id = p_user_id;

  INSERT INTO public.seller_profiles (user_id, store_name, slug)
  VALUES (p_user_id, normalized_store_name, generated_slug);

  INSERT INTO public.seller_verifications (seller_id)
  VALUES (p_user_id)
  ON CONFLICT (seller_id) DO NOTHING;

  INSERT INTO public.audit_logs (
    actor_user_id,
    action,
    object_type,
    object_id,
    previous_value,
    new_value,
    reason,
    metadata
  )
  VALUES (
    p_user_id,
    'oauth.seller_profile_created',
    'profile',
    p_user_id::text,
    jsonb_build_object('role', 'BUYER'),
    jsonb_build_object('role', 'SELLER'),
    'New user selected supplier signup before OAuth authentication',
    jsonb_build_object('provider', p_provider)
  );

  RETURN true;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.finalize_new_oauth_seller(uuid, text)
FROM PUBLIC, anon, authenticated, service_role;
--> statement-breakpoint
COMMENT ON FUNCTION public.finalize_new_oauth_seller(uuid, text) IS
'Owner-only callback helper that converts only a brand-new OAuth buyer placeholder into the requested seller role.';
