ALTER POLICY "products_select_seller_or_approved" ON "products" TO authenticated USING ((select auth.uid()) = "products"."seller_id" or (
        "products"."status" = 'APPROVED'
        and exists (
          select 1 from public.seller_profiles
          where user_id = "products"."seller_id"
            and status in ('PENDING_VERIFICATION', 'ACTIVE')
        )
      ));--> statement-breakpoint
ALTER POLICY "seller_verifications_insert_own" ON "seller_verifications" TO authenticated WITH CHECK ((select auth.uid()) = "seller_verifications"."seller_id"
        and "seller_verifications"."status" in ('DRAFT', 'SUBMITTED')
        and "seller_verifications"."reviewed_at" is null
        and "seller_verifications"."reviewed_by" is null
        and "seller_verifications"."rejection_reason" is null);--> statement-breakpoint
ALTER POLICY "seller_verifications_update_own" ON "seller_verifications" TO authenticated USING ((select auth.uid()) = "seller_verifications"."seller_id") WITH CHECK ((select auth.uid()) = "seller_verifications"."seller_id"
        and "seller_verifications"."status" in ('DRAFT', 'SUBMITTED')
        and "seller_verifications"."reviewed_at" is null
        and "seller_verifications"."reviewed_by" is null
        and "seller_verifications"."rejection_reason" is null);