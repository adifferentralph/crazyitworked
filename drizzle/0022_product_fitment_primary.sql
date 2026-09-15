CREATE TABLE "product_sponsorships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"starts_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ends_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_sponsorships_schedule_check" CHECK ("product_sponsorships"."ends_at" is null or "product_sponsorships"."ends_at" > "product_sponsorships"."starts_at")
);
--> statement-breakpoint
ALTER TABLE "product_sponsorships" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "product_fitments" ADD COLUMN "is_primary" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "product_sponsorships" ADD CONSTRAINT "product_sponsorships_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_sponsorships" ADD CONSTRAINT "product_sponsorships_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_sponsorships_schedule_idx" ON "product_sponsorships" USING btree ("product_id","is_active","starts_at","ends_at");--> statement-breakpoint
CREATE UNIQUE INDEX "product_fitments_active_primary_unique" ON "product_fitments" USING btree ("product_id") WHERE "product_fitments"."is_primary" = true and "product_fitments"."is_active" = true;--> statement-breakpoint
CREATE POLICY "product_sponsorships_read_public" ON "product_sponsorships" AS PERMISSIVE FOR SELECT TO "anon" USING ("product_sponsorships"."is_active" and "product_sponsorships"."starts_at" <= now()
        and ("product_sponsorships"."ends_at" is null or "product_sponsorships"."ends_at" > now()));--> statement-breakpoint
CREATE POLICY "product_sponsorships_read_authenticated" ON "product_sponsorships" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("product_sponsorships"."is_active" and "product_sponsorships"."starts_at" <= now()
        and ("product_sponsorships"."ends_at" is null or "product_sponsorships"."ends_at" > now()) or exists (
  select 1 from public.profiles
  where id = (select auth.uid()) and role = 'ADMIN' and status = 'ACTIVE'
));--> statement-breakpoint
CREATE POLICY "product_sponsorships_insert_admin" ON "product_sponsorships" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (exists (
  select 1 from public.profiles
  where id = (select auth.uid()) and role = 'ADMIN' and status = 'ACTIVE'
));--> statement-breakpoint
CREATE POLICY "product_sponsorships_update_admin" ON "product_sponsorships" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (exists (
  select 1 from public.profiles
  where id = (select auth.uid()) and role = 'ADMIN' and status = 'ACTIVE'
)) WITH CHECK (exists (
  select 1 from public.profiles
  where id = (select auth.uid()) and role = 'ADMIN' and status = 'ACTIVE'
));--> statement-breakpoint
CREATE POLICY "product_sponsorships_delete_admin" ON "product_sponsorships" AS PERMISSIVE FOR DELETE TO "authenticated" USING (exists (
  select 1 from public.profiles
  where id = (select auth.uid()) and role = 'ADMIN' and status = 'ACTIVE'
));