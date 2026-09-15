CREATE TYPE "public"."marketplace_banner_placement" AS ENUM('HOME_HERO', 'HOME_MID', 'CATEGORY');--> statement-breakpoint
CREATE TYPE "public"."marketplace_banner_status" AS ENUM('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED');--> statement-breakpoint
CREATE TABLE "marketplace_banners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"subtitle" text,
	"image_url" text NOT NULL,
	"mobile_image_url" text,
	"cta_label" text,
	"cta_url" text,
	"placement" "marketplace_banner_placement" NOT NULL,
	"start_at" timestamp with time zone,
	"end_at" timestamp with time zone,
	"status" "marketplace_banner_status" DEFAULT 'DRAFT' NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "marketplace_banners_schedule_check" CHECK ("marketplace_banners"."end_at" is null or "marketplace_banners"."start_at" is null or "marketplace_banners"."end_at" > "marketplace_banners"."start_at"),
	CONSTRAINT "marketplace_banners_cta_pair_check" CHECK (("marketplace_banners"."cta_label" is null) = ("marketplace_banners"."cta_url" is null))
);
--> statement-breakpoint
ALTER TABLE "marketplace_banners" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "buyer_profiles" ADD COLUMN "marketing_opt_in" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "buyer_profiles" ADD COLUMN "marketing_opted_in_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "buyer_profiles" ADD COLUMN "marketing_unsubscribed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "seller_profiles" ADD COLUMN "marketing_opt_in" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "seller_profiles" ADD COLUMN "marketing_opted_in_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "seller_profiles" ADD COLUMN "marketing_unsubscribed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "vehicle_makes" ADD COLUMN "origin_country" text;--> statement-breakpoint
ALTER TABLE "vehicle_makes" ADD COLUMN "source" text DEFAULT 'CURATED' NOT NULL;--> statement-breakpoint
ALTER TABLE "vehicle_makes" ADD COLUMN "source_identifier" text;--> statement-breakpoint
ALTER TABLE "vehicle_makes" ADD COLUMN "is_discontinued" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "vehicle_models" ADD COLUMN "origin_country" text;--> statement-breakpoint
ALTER TABLE "vehicle_models" ADD COLUMN "source" text DEFAULT 'CURATED' NOT NULL;--> statement-breakpoint
ALTER TABLE "vehicle_models" ADD COLUMN "source_identifier" text;--> statement-breakpoint
ALTER TABLE "vehicle_models" ADD COLUMN "is_discontinued" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "marketplace_banners" ADD CONSTRAINT "marketplace_banners_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "marketplace_banners_placement_schedule_idx" ON "marketplace_banners" USING btree ("placement","status","display_order","start_at","end_at");--> statement-breakpoint
CREATE POLICY "marketplace_banners_read_public" ON "marketplace_banners" AS PERMISSIVE FOR SELECT TO "anon" USING ("marketplace_banners"."status" = 'ACTIVE'
  and ("marketplace_banners"."start_at" is null or "marketplace_banners"."start_at" <= now())
  and ("marketplace_banners"."end_at" is null or "marketplace_banners"."end_at" > now()));--> statement-breakpoint
CREATE POLICY "marketplace_banners_read_authenticated" ON "marketplace_banners" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("marketplace_banners"."status" = 'ACTIVE'
  and ("marketplace_banners"."start_at" is null or "marketplace_banners"."start_at" <= now())
  and ("marketplace_banners"."end_at" is null or "marketplace_banners"."end_at" > now()) or exists (
  select 1 from public.profiles
  where id = (select auth.uid()) and role = 'ADMIN' and status = 'ACTIVE'
));--> statement-breakpoint
CREATE POLICY "marketplace_banners_insert_admin" ON "marketplace_banners" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (exists (
  select 1 from public.profiles
  where id = (select auth.uid()) and role = 'ADMIN' and status = 'ACTIVE'
) and "marketplace_banners"."created_by" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "marketplace_banners_update_admin" ON "marketplace_banners" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (exists (
  select 1 from public.profiles
  where id = (select auth.uid()) and role = 'ADMIN' and status = 'ACTIVE'
)) WITH CHECK (exists (
  select 1 from public.profiles
  where id = (select auth.uid()) and role = 'ADMIN' and status = 'ACTIVE'
));--> statement-breakpoint
CREATE POLICY "marketplace_banners_delete_admin" ON "marketplace_banners" AS PERMISSIVE FOR DELETE TO "authenticated" USING (exists (
  select 1 from public.profiles
  where id = (select auth.uid()) and role = 'ADMIN' and status = 'ACTIVE'
));
--> statement-breakpoint
REVOKE ALL ON TABLE public.marketplace_banners FROM anon, authenticated;
--> statement-breakpoint
GRANT SELECT ON TABLE public.marketplace_banners TO anon;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.marketplace_banners TO authenticated;
--> statement-breakpoint
CREATE TRIGGER marketplace_banners_set_updated_at
  BEFORE UPDATE ON public.marketplace_banners
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
--> statement-breakpoint
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'marketplace-banners',
  'marketplace-banners',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO UPDATE
SET public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
--> statement-breakpoint
CREATE POLICY "marketplace_banner_objects_insert_admin" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'marketplace-banners'
    AND split_part(name, '/', 1) = (SELECT auth.uid())::text
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND role = 'ADMIN' AND status = 'ACTIVE'
    )
  );
--> statement-breakpoint
CREATE POLICY "marketplace_banner_objects_update_admin" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'marketplace-banners'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND role = 'ADMIN' AND status = 'ACTIVE'
    )
  )
  WITH CHECK (
    bucket_id = 'marketplace-banners'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND role = 'ADMIN' AND status = 'ACTIVE'
    )
  );
--> statement-breakpoint
CREATE POLICY "marketplace_banner_objects_delete_admin" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'marketplace-banners'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND role = 'ADMIN' AND status = 'ACTIVE'
    )
  );