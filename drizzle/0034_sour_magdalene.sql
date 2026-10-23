CREATE OR REPLACE FUNCTION public.seller_is_marketplace_visible(target_seller_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.seller_profiles
    WHERE user_id = target_seller_id
      AND status IN ('PENDING_VERIFICATION', 'ACTIVE')
  );
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION public.seller_is_marketplace_visible(uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.seller_is_marketplace_visible(uuid) TO anon, authenticated;--> statement-breakpoint
ALTER POLICY "products_select_seller_or_approved" ON "products" TO authenticated USING ((select auth.uid()) = "products"."seller_id" or (
        "products"."status" = 'APPROVED'
        and public.seller_is_marketplace_visible("products"."seller_id")
      ));--> statement-breakpoint
ALTER POLICY "products_select_approved_anon" ON "products" TO anon USING ("products"."status" = 'APPROVED'
        and public.seller_is_marketplace_visible("products"."seller_id"));
