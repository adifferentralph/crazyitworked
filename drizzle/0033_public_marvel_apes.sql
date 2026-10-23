ALTER POLICY "products_select_approved_anon" ON "products" TO anon USING ("products"."status" = 'APPROVED'
        and exists (
          select 1 from public.seller_profiles
          where user_id = "products"."seller_id"
            and status in ('PENDING_VERIFICATION', 'ACTIVE')
        ));
