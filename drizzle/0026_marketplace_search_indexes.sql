CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS products_name_trgm_idx ON public.products USING gin (lower(name) gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS products_brand_trgm_idx ON public.products USING gin (lower(brand) gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS products_oem_part_number_trgm_idx ON public.products USING gin (lower(oem_part_number) gin_trgm_ops) WHERE oem_part_number IS NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS products_manufacturer_part_number_trgm_idx ON public.products USING gin (lower(manufacturer_part_number) gin_trgm_ops) WHERE manufacturer_part_number IS NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS seller_profiles_store_name_trgm_idx ON public.seller_profiles USING gin (lower(store_name) gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS product_categories_name_trgm_idx ON public.product_categories USING gin (lower(name) gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS vehicle_makes_name_trgm_idx ON public.vehicle_makes USING gin (lower(name) gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS vehicle_models_name_trgm_idx ON public.vehicle_models USING gin (lower(name) gin_trgm_ops);
--> statement-breakpoint
CREATE OR REPLACE VIEW public.marketplace_sellers WITH (security_barrier = true) AS
select distinct
  seller_profiles.user_id as seller_id,
  seller_profiles.store_name,
  seller_profiles.slug,
  seller_profiles.status::text as seller_status,
  coalesce(seller_verifications.status::text, 'DRAFT') as verification_status,
  seller_profiles.country,
  seller_profiles.state,
  seller_profiles.city
from public.seller_profiles as seller_profiles
join public.products as products on products.seller_id = seller_profiles.user_id
left join public.seller_verifications as seller_verifications
  on seller_verifications.seller_id = seller_profiles.user_id
where products.status = 'APPROVED'
  and seller_profiles.status = 'ACTIVE';
--> statement-breakpoint
CREATE OR REPLACE VIEW public.marketplace_product_search WITH (security_barrier = true) AS
select
  products.id as product_id,
  lower(concat_ws(' ',
    products.name,
    products.brand,
    products.oem_part_number,
    products.manufacturer_part_number,
    product_categories.name,
    seller_profiles.store_name,
    coalesce(string_agg(distinct product_cross_references.reference_number, ' '), ''),
    coalesce(string_agg(distinct concat_ws(' ',
      vehicle_makes.name,
      vehicle_models.name,
      vehicle_years.year::text,
      vehicle_trims.name,
      engines.name,
      transmissions.name,
      drivetrains.name
    ), ' '), '')
  )) as search_text
from public.products as products
join public.product_categories as product_categories
  on product_categories.id = products.category_id
join public.seller_profiles as seller_profiles
  on seller_profiles.user_id = products.seller_id
left join public.product_cross_references as product_cross_references
  on product_cross_references.product_id = products.id
left join public.product_fitments as product_fitments
  on product_fitments.product_id = products.id
left join public.vehicle_fitments as vehicle_fitments
  on vehicle_fitments.id = product_fitments.fitment_id
left join public.vehicle_makes as vehicle_makes on vehicle_makes.id = vehicle_fitments.make_id
left join public.vehicle_models as vehicle_models on vehicle_models.id = vehicle_fitments.model_id
left join public.vehicle_years as vehicle_years on vehicle_years.id = vehicle_fitments.year_id
left join public.vehicle_trims as vehicle_trims on vehicle_trims.id = vehicle_fitments.trim_id
left join public.engines as engines on engines.id = vehicle_fitments.engine_id
left join public.transmissions as transmissions on transmissions.id = vehicle_fitments.transmission_id
left join public.drivetrains as drivetrains on drivetrains.id = vehicle_fitments.drivetrain_id
where products.status = 'APPROVED'
  and seller_profiles.status = 'ACTIVE'
group by products.id, product_categories.name, seller_profiles.store_name;
--> statement-breakpoint
REVOKE ALL ON public.marketplace_sellers FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
GRANT SELECT ON public.marketplace_sellers TO anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON public.marketplace_product_search FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
GRANT SELECT ON public.marketplace_product_search TO anon, authenticated;
