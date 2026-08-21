CREATE VIEW "public"."marketplace_product_search" WITH (security_barrier = true) AS (
  select
    products.id as product_id,
    lower(concat_ws(' ',
      products.name,
      products.brand,
      products.oem_part_number,
      products.manufacturer_part_number,
      product_categories.name,
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
  from "products" as products
  join "product_categories" as product_categories
    on product_categories.id = products.category_id
  left join "product_cross_references" as product_cross_references
    on product_cross_references.product_id = products.id
  left join "product_fitments" as product_fitments
    on product_fitments.product_id = products.id
  left join "vehicle_fitments" as vehicle_fitments
    on vehicle_fitments.id = product_fitments.fitment_id
  left join "vehicle_makes" as vehicle_makes on vehicle_makes.id = vehicle_fitments.make_id
  left join "vehicle_models" as vehicle_models on vehicle_models.id = vehicle_fitments.model_id
  left join "vehicle_years" as vehicle_years on vehicle_years.id = vehicle_fitments.year_id
  left join "vehicle_trims" as vehicle_trims on vehicle_trims.id = vehicle_fitments.trim_id
  left join "engines" as engines on engines.id = vehicle_fitments.engine_id
  left join "transmissions" as transmissions on transmissions.id = vehicle_fitments.transmission_id
  left join "drivetrains" as drivetrains on drivetrains.id = vehicle_fitments.drivetrain_id
  where products.status = 'APPROVED'
  group by products.id, product_categories.name
);
--> statement-breakpoint
REVOKE ALL ON public.marketplace_product_search FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
GRANT SELECT ON public.marketplace_product_search TO anon, authenticated;
