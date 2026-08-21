CREATE VIEW "public"."marketplace_sellers" WITH (security_barrier = true) AS (
  select distinct
    seller_profiles.user_id as seller_id,
    seller_profiles.store_name,
    seller_profiles.slug,
    seller_profiles.status::text as seller_status,
    coalesce(seller_verifications.status::text, 'DRAFT') as verification_status,
    seller_profiles.country,
    seller_profiles.state,
    seller_profiles.city
  from "seller_profiles" as seller_profiles
  join "products" as products on products.seller_id = seller_profiles.user_id
  left join "seller_verifications" as seller_verifications
    on seller_verifications.seller_id = seller_profiles.user_id
  where products.status = 'APPROVED'
);
--> statement-breakpoint
REVOKE ALL ON public.marketplace_sellers FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
GRANT SELECT ON public.marketplace_sellers TO anon, authenticated;
