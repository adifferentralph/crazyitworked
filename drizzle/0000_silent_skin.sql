CREATE TYPE "public"."account_status" AS ENUM('ACTIVE', 'RESTRICTED', 'SUSPENDED');--> statement-breakpoint
CREATE TYPE "public"."address_type" AS ENUM('SHIPPING', 'BILLING', 'PICKUP');--> statement-breakpoint
CREATE TYPE "public"."admin_role_key" AS ENUM('SUPER_ADMIN', 'OPERATIONS_ADMIN', 'PRODUCT_MODERATOR', 'FINANCE_ADMIN', 'DISPUTE_OFFICER', 'SELLER_MANAGER', 'SUPPORT_AGENT', 'LOGISTICS_MANAGER', 'CONTENT_MODERATOR');--> statement-breakpoint
CREATE TYPE "public"."seller_status" AS ENUM('PENDING_VERIFICATION', 'ACTIVE', 'RESTRICTED', 'SUSPENDED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('BUYER', 'SELLER', 'ADMIN');--> statement-breakpoint
CREATE TABLE "addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "address_type" DEFAULT 'SHIPPING' NOT NULL,
	"label" text NOT NULL,
	"recipient_name" text NOT NULL,
	"phone" text NOT NULL,
	"line_1" text NOT NULL,
	"line_2" text,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"country" text DEFAULT 'Nigeria' NOT NULL,
	"postal_code" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "addresses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "admin_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"admin_role_id" uuid NOT NULL,
	"job_title" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "admin_role_permissions" (
	"role_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_role_permissions_role_id_permission_id_pk" PRIMARY KEY("role_id","permission_id")
);
--> statement-breakpoint
ALTER TABLE "admin_role_permissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "admin_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" "admin_role_key" NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_roles_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "admin_roles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid,
	"action" text NOT NULL,
	"object_type" text NOT NULL,
	"object_id" text NOT NULL,
	"previous_value" jsonb,
	"new_value" jsonb,
	"reason" text,
	"ip_address" text,
	"user_agent" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "buyer_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"preferred_market" text DEFAULT 'Nigeria' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "buyer_profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "permissions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "permissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"full_name" text NOT NULL,
	"phone" text,
	"avatar_url" text,
	"role" "user_role" DEFAULT 'BUYER' NOT NULL,
	"status" "account_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "seller_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"store_name" text NOT NULL,
	"slug" text NOT NULL,
	"status" "seller_status" DEFAULT 'PENDING_VERIFICATION' NOT NULL,
	"description" text,
	"business_registration_number" text,
	"country" text DEFAULT 'Nigeria' NOT NULL,
	"state" text,
	"city" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "seller_profiles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "seller_profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_profiles" ADD CONSTRAINT "admin_profiles_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_profiles" ADD CONSTRAINT "admin_profiles_admin_role_id_admin_roles_id_fk" FOREIGN KEY ("admin_role_id") REFERENCES "public"."admin_roles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_role_permissions" ADD CONSTRAINT "admin_role_permissions_role_id_admin_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."admin_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_role_permissions" ADD CONSTRAINT "admin_role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_profiles_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buyer_profiles" ADD CONSTRAINT "buyer_profiles_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_profiles" ADD CONSTRAINT "seller_profiles_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "addresses_user_idx" ON "addresses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "addresses_location_idx" ON "addresses" USING btree ("country","state","city");--> statement-breakpoint
CREATE INDEX "admin_profiles_role_idx" ON "admin_profiles" USING btree ("admin_role_id");--> statement-breakpoint
CREATE INDEX "admin_role_permissions_permission_idx" ON "admin_role_permissions" USING btree ("permission_id");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_idx" ON "audit_logs" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_object_idx" ON "audit_logs" USING btree ("object_type","object_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_email_unique" ON "profiles" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "profiles_role_idx" ON "profiles" USING btree ("role");--> statement-breakpoint
CREATE INDEX "profiles_status_idx" ON "profiles" USING btree ("status");--> statement-breakpoint
CREATE INDEX "seller_profiles_status_idx" ON "seller_profiles" USING btree ("status");--> statement-breakpoint
CREATE INDEX "seller_profiles_location_idx" ON "seller_profiles" USING btree ("country","state","city");--> statement-breakpoint
CREATE POLICY "addresses_select_own" ON "addresses" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "addresses"."user_id");--> statement-breakpoint
CREATE POLICY "addresses_insert_own" ON "addresses" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) = "addresses"."user_id");--> statement-breakpoint
CREATE POLICY "addresses_update_own" ON "addresses" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.uid()) = "addresses"."user_id") WITH CHECK ((select auth.uid()) = "addresses"."user_id");--> statement-breakpoint
CREATE POLICY "addresses_delete_own" ON "addresses" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select auth.uid()) = "addresses"."user_id");--> statement-breakpoint
CREATE POLICY "admin_profiles_select_own" ON "admin_profiles" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "admin_profiles"."user_id");--> statement-breakpoint
CREATE POLICY "admin_role_permissions_read_authenticated" ON "admin_role_permissions" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "admin_roles_read_authenticated" ON "admin_roles" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "buyer_profiles_select_own" ON "buyer_profiles" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "buyer_profiles"."user_id");--> statement-breakpoint
CREATE POLICY "buyer_profiles_update_own" ON "buyer_profiles" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.uid()) = "buyer_profiles"."user_id") WITH CHECK ((select auth.uid()) = "buyer_profiles"."user_id");--> statement-breakpoint
CREATE POLICY "permissions_read_authenticated" ON "permissions" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "profiles_select_own" ON "profiles" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "profiles"."id");--> statement-breakpoint
CREATE POLICY "profiles_update_own" ON "profiles" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.uid()) = "profiles"."id") WITH CHECK ((select auth.uid()) = "profiles"."id");--> statement-breakpoint
CREATE POLICY "seller_profiles_select_own" ON "seller_profiles" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "seller_profiles"."user_id");--> statement-breakpoint
CREATE POLICY "seller_profiles_update_own" ON "seller_profiles" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.uid()) = "seller_profiles"."user_id") WITH CHECK ((select auth.uid()) = "seller_profiles"."user_id");
--> statement-breakpoint

-- Supabase exposes public-schema objects through PostgREST. Start from no privileges and
-- grant only the operations that each RLS-protected client path requires.
REVOKE ALL ON TABLE public.profiles FROM anon, authenticated;
REVOKE ALL ON TABLE public.buyer_profiles FROM anon, authenticated;
REVOKE ALL ON TABLE public.seller_profiles FROM anon, authenticated;
REVOKE ALL ON TABLE public.admin_profiles FROM anon, authenticated;
REVOKE ALL ON TABLE public.admin_roles FROM anon, authenticated;
REVOKE ALL ON TABLE public.permissions FROM anon, authenticated;
REVOKE ALL ON TABLE public.admin_role_permissions FROM anon, authenticated;
REVOKE ALL ON TABLE public.addresses FROM anon, authenticated;
REVOKE ALL ON TABLE public.audit_logs FROM anon, authenticated;

GRANT SELECT ON TABLE public.profiles TO authenticated;
GRANT UPDATE (full_name, phone, avatar_url) ON TABLE public.profiles TO authenticated;
GRANT SELECT ON TABLE public.buyer_profiles TO authenticated;
GRANT UPDATE (preferred_market) ON TABLE public.buyer_profiles TO authenticated;
GRANT SELECT ON TABLE public.seller_profiles TO authenticated;
GRANT UPDATE (
  store_name,
  description,
  business_registration_number,
  country,
  state,
  city
) ON TABLE public.seller_profiles TO authenticated;
GRANT SELECT ON TABLE public.admin_profiles TO authenticated;
GRANT SELECT ON TABLE public.admin_roles TO authenticated;
GRANT SELECT ON TABLE public.permissions TO authenticated;
GRANT SELECT ON TABLE public.admin_role_permissions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.addresses TO authenticated;

-- Maintain timestamps in PostgreSQL so clients cannot forge them.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER buyer_profiles_set_updated_at
  BEFORE UPDATE ON public.buyer_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER seller_profiles_set_updated_at
  BEFORE UPDATE ON public.seller_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER admin_profiles_set_updated_at
  BEFORE UPDATE ON public.admin_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER addresses_set_updated_at
  BEFORE UPDATE ON public.addresses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Create the immutable application role at signup. User metadata may request only BUYER or
-- SELLER; ADMIN is never accepted from client-controlled metadata.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  requested_role public.user_role;
  normalized_name text;
  normalized_store_name text;
  generated_slug text;
BEGIN
  IF NEW.email IS NULL THEN
    RAISE EXCEPTION 'Twenty-Two Parts requires email-based accounts';
  END IF;

  requested_role := CASE
    WHEN upper(coalesce(NEW.raw_user_meta_data ->> 'requested_role', '')) = 'SELLER'
      THEN 'SELLER'::public.user_role
    ELSE 'BUYER'::public.user_role
  END;

  normalized_name := coalesce(
    nullif(btrim(NEW.raw_user_meta_data ->> 'full_name'), ''),
    'Account holder'
  );

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (NEW.id, lower(NEW.email), normalized_name, requested_role);

  IF requested_role = 'SELLER'::public.user_role THEN
    normalized_store_name := coalesce(
      nullif(btrim(NEW.raw_user_meta_data ->> 'store_name'), ''),
      normalized_name || ' Parts'
    );
    generated_slug := coalesce(
      nullif(trim(both '-' FROM regexp_replace(lower(normalized_store_name), '[^a-z0-9]+', '-', 'g')), ''),
      'seller'
    ) || '-' || substring(replace(NEW.id::text, '-', '') FROM 1 FOR 8);

    INSERT INTO public.seller_profiles (user_id, store_name, slug)
    VALUES (NEW.id, normalized_store_name, generated_slug);
  ELSE
    INSERT INTO public.buyer_profiles (user_id)
    VALUES (NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

CREATE OR REPLACE FUNCTION public.handle_auth_user_email_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.email IS NOT NULL AND NEW.email IS DISTINCT FROM OLD.email THEN
    UPDATE public.profiles
    SET email = lower(NEW.email)
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_email_changed
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_email_changed();

REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_auth_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_auth_user_email_changed() FROM PUBLIC, anon, authenticated;
