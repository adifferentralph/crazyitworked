ALTER POLICY "product_images_insert_own" ON "product_images" TO authenticated WITH CHECK ((select auth.uid()) = "product_images"."uploaded_by"
        and "product_images"."source" = 'SELLER_ORIGINAL'
        and exists (select 1 from public.products where id = "product_images"."product_id" and seller_id = (select auth.uid())));--> statement-breakpoint
ALTER POLICY "products_insert_own" ON "products" TO authenticated WITH CHECK ((select auth.uid()) = "products"."seller_id"
        and "products"."status" = 'DRAFT'
        and "products"."submitted_at" is null
        and "products"."published_at" is null
        and "products"."reserved_quantity" = 0
        and exists (
          select 1 from public.seller_profiles
          where user_id = (select auth.uid()) and onboarding_completed_at is not null
        ));