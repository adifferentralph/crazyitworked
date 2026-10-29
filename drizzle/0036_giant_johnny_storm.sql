CREATE TYPE "public"."manual_seller_verification_status" AS ENUM('VERIFIED', 'REVOKED');--> statement-breakpoint
CREATE TYPE "public"."marketplace_report_status" AS ENUM('PENDING', 'UPHELD', 'DISMISSED', 'RESOLVED');--> statement-breakpoint
CREATE TYPE "public"."marketplace_report_target" AS ENUM('PRODUCT', 'MERCHANT');--> statement-breakpoint
CREATE TYPE "public"."trust_score_scope" AS ENUM('PRODUCT', 'SELLER');--> statement-breakpoint
CREATE TYPE "public"."trust_score_source" AS ENUM('UPHELD_REPORT', 'VERIFIED_PURCHASE_FEEDBACK', 'MODERATION_CORRECTION');--> statement-breakpoint
CREATE TABLE "founding_merchant_award_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"award_id" uuid NOT NULL,
	"action" text NOT NULL,
	"actor_id" uuid,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "founding_merchant_award_events_action_check" CHECK ("founding_merchant_award_events"."action" in ('AWARDED', 'REVOKED'))
);
--> statement-breakpoint
ALTER TABLE "founding_merchant_award_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "founding_merchant_awards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seller_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"awarded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"revoked_by" uuid,
	"revocation_reason" text,
	CONSTRAINT "founding_merchant_awards_position_check" CHECK ("founding_merchant_awards"."position" between 1 and 20),
	CONSTRAINT "founding_merchant_awards_revocation_check" CHECK (("founding_merchant_awards"."revoked_at" is null and "founding_merchant_awards"."revoked_by" is null and "founding_merchant_awards"."revocation_reason" is null)
        or ("founding_merchant_awards"."revoked_at" is not null and "founding_merchant_awards"."revoked_by" is not null and length("founding_merchant_awards"."revocation_reason") >= 5))
);
--> statement-breakpoint
ALTER TABLE "founding_merchant_awards" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "manual_seller_verification_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seller_id" uuid NOT NULL,
	"status" "manual_seller_verification_status" NOT NULL,
	"source" text DEFAULT 'MANUAL_INSPECTION' NOT NULL,
	"notes" text,
	"reason" text,
	"actor_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "manual_seller_verification_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "manual_seller_verifications" (
	"seller_id" uuid PRIMARY KEY NOT NULL,
	"status" "manual_seller_verification_status" NOT NULL,
	"source" text DEFAULT 'MANUAL_INSPECTION' NOT NULL,
	"inspection_notes" text,
	"verified_by" uuid NOT NULL,
	"verified_at" timestamp with time zone NOT NULL,
	"revoked_by" uuid,
	"revoked_at" timestamp with time zone,
	"revocation_reason" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "manual_seller_verifications_source_check" CHECK ("manual_seller_verifications"."source" = 'MANUAL_INSPECTION'),
	CONSTRAINT "manual_seller_verifications_revocation_check" CHECK (("manual_seller_verifications"."status" = 'VERIFIED' and "manual_seller_verifications"."revoked_at" is null and "manual_seller_verifications"."revoked_by" is null and "manual_seller_verifications"."revocation_reason" is null)
        or ("manual_seller_verifications"."status" = 'REVOKED' and "manual_seller_verifications"."revoked_at" is not null and "manual_seller_verifications"."revoked_by" is not null and length("manual_seller_verifications"."revocation_reason") >= 5))
);
--> statement-breakpoint
ALTER TABLE "manual_seller_verifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "marketplace_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_id" uuid NOT NULL,
	"target_type" "marketplace_report_target" NOT NULL,
	"target_key" text NOT NULL,
	"product_id" uuid,
	"seller_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"explanation" text,
	"status" "marketplace_report_status" DEFAULT 'PENDING' NOT NULL,
	"moderator_id" uuid,
	"moderation_reason" text,
	"severity" text,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "marketplace_reports_target_shape_check" CHECK (("marketplace_reports"."target_type" = 'PRODUCT' and "marketplace_reports"."product_id" is not null and "marketplace_reports"."target_key" = 'product:' || "marketplace_reports"."product_id"::text)
        or ("marketplace_reports"."target_type" = 'MERCHANT' and "marketplace_reports"."product_id" is null and "marketplace_reports"."target_key" = 'merchant:' || "marketplace_reports"."seller_id"::text)),
	CONSTRAINT "marketplace_reports_reason_length_check" CHECK (length("marketplace_reports"."reason") between 3 and 80),
	CONSTRAINT "marketplace_reports_explanation_length_check" CHECK ("marketplace_reports"."explanation" is null or length("marketplace_reports"."explanation") <= 2000)
);
--> statement-breakpoint
ALTER TABLE "marketplace_reports" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "product_trust_scores" (
	"product_id" uuid PRIMARY KEY NOT NULL,
	"score_hundredths" integer DEFAULT 350 NOT NULL,
	"event_count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_trust_scores_bounds_check" CHECK ("product_trust_scores"."score_hundredths" between 100 and 500),
	CONSTRAINT "product_trust_scores_event_count_check" CHECK ("product_trust_scores"."event_count" >= 0)
);
--> statement-breakpoint
ALTER TABLE "product_trust_scores" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "seller_trust_scores" (
	"seller_id" uuid PRIMARY KEY NOT NULL,
	"score_hundredths" integer DEFAULT 350 NOT NULL,
	"event_count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "seller_trust_scores_bounds_check" CHECK ("seller_trust_scores"."score_hundredths" between 100 and 500),
	CONSTRAINT "seller_trust_scores_event_count_check" CHECK ("seller_trust_scores"."event_count" >= 0)
);
--> statement-breakpoint
ALTER TABLE "seller_trust_scores" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "trust_score_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scope" "trust_score_scope" NOT NULL,
	"product_id" uuid,
	"seller_id" uuid NOT NULL,
	"source_type" "trust_score_source" NOT NULL,
	"source_id" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"delta_hundredths" integer NOT NULL,
	"reason" text NOT NULL,
	"created_by" uuid NOT NULL,
	"reversed_at" timestamp with time zone,
	"reversed_by" uuid,
	"reversal_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trust_score_events_scope_shape_check" CHECK (("trust_score_events"."scope" = 'PRODUCT' and "trust_score_events"."product_id" is not null)
        or ("trust_score_events"."scope" = 'SELLER' and "trust_score_events"."product_id" is null)),
	CONSTRAINT "trust_score_events_delta_check" CHECK ("trust_score_events"."delta_hundredths" between -400 and 400 and "trust_score_events"."delta_hundredths" <> 0)
);
--> statement-breakpoint
ALTER TABLE "trust_score_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "founding_merchant_award_events" ADD CONSTRAINT "founding_merchant_award_events_award_id_founding_merchant_awards_id_fk" FOREIGN KEY ("award_id") REFERENCES "public"."founding_merchant_awards"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "founding_merchant_award_events" ADD CONSTRAINT "founding_merchant_award_events_actor_id_profiles_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "founding_merchant_awards" ADD CONSTRAINT "founding_merchant_awards_seller_id_seller_profiles_user_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."seller_profiles"("user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "founding_merchant_awards" ADD CONSTRAINT "founding_merchant_awards_revoked_by_profiles_id_fk" FOREIGN KEY ("revoked_by") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_seller_verification_events" ADD CONSTRAINT "manual_seller_verification_events_seller_id_seller_profiles_user_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."seller_profiles"("user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_seller_verification_events" ADD CONSTRAINT "manual_seller_verification_events_actor_id_profiles_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_seller_verifications" ADD CONSTRAINT "manual_seller_verifications_seller_id_seller_profiles_user_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."seller_profiles"("user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_seller_verifications" ADD CONSTRAINT "manual_seller_verifications_verified_by_profiles_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_seller_verifications" ADD CONSTRAINT "manual_seller_verifications_revoked_by_profiles_id_fk" FOREIGN KEY ("revoked_by") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_reports" ADD CONSTRAINT "marketplace_reports_reporter_id_profiles_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_reports" ADD CONSTRAINT "marketplace_reports_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_reports" ADD CONSTRAINT "marketplace_reports_seller_id_seller_profiles_user_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."seller_profiles"("user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_reports" ADD CONSTRAINT "marketplace_reports_moderator_id_profiles_id_fk" FOREIGN KEY ("moderator_id") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_trust_scores" ADD CONSTRAINT "product_trust_scores_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_trust_scores" ADD CONSTRAINT "seller_trust_scores_seller_id_seller_profiles_user_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."seller_profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trust_score_events" ADD CONSTRAINT "trust_score_events_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trust_score_events" ADD CONSTRAINT "trust_score_events_seller_id_seller_profiles_user_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."seller_profiles"("user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trust_score_events" ADD CONSTRAINT "trust_score_events_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trust_score_events" ADD CONSTRAINT "trust_score_events_reversed_by_profiles_id_fk" FOREIGN KEY ("reversed_by") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "founding_merchant_award_events_award_idx" ON "founding_merchant_award_events" USING btree ("award_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "founding_merchant_awards_seller_unique" ON "founding_merchant_awards" USING btree ("seller_id");--> statement-breakpoint
CREATE UNIQUE INDEX "founding_merchant_awards_position_unique" ON "founding_merchant_awards" USING btree ("position");--> statement-breakpoint
CREATE INDEX "manual_seller_verification_events_seller_idx" ON "manual_seller_verification_events" USING btree ("seller_id","created_at");--> statement-breakpoint
CREATE INDEX "manual_seller_verifications_status_idx" ON "manual_seller_verifications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "marketplace_reports_status_created_idx" ON "marketplace_reports" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "marketplace_reports_product_idx" ON "marketplace_reports" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "marketplace_reports_seller_idx" ON "marketplace_reports" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX "marketplace_reports_reporter_created_idx" ON "marketplace_reports" USING btree ("reporter_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "marketplace_reports_reporter_pending_target_unique" ON "marketplace_reports" USING btree ("reporter_id","target_key") WHERE "marketplace_reports"."status" = 'PENDING';--> statement-breakpoint
CREATE UNIQUE INDEX "trust_score_events_idempotency_unique" ON "trust_score_events" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "trust_score_events_product_idx" ON "trust_score_events" USING btree ("product_id","created_at");--> statement-breakpoint
CREATE INDEX "trust_score_events_seller_idx" ON "trust_score_events" USING btree ("seller_id","created_at");--> statement-breakpoint
CREATE POLICY "marketplace_reports_insert_own" ON "marketplace_reports" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) = "marketplace_reports"."reporter_id");--> statement-breakpoint
CREATE POLICY "marketplace_reports_select_own" ON "marketplace_reports" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "marketplace_reports"."reporter_id");
--> statement-breakpoint
ALTER TABLE public.marketplace_reports
  ADD CONSTRAINT marketplace_reports_reason_by_target_check CHECK (
    (target_type = 'PRODUCT' AND reason IN (
      'MISLEADING_DESCRIPTION', 'SUSPECTED_COUNTERFEIT', 'INCORRECT_COMPATIBILITY',
      'MISLEADING_PRICING', 'UNAVAILABLE', 'SUSPICIOUS_LISTING', 'OTHER'
    )) OR
    (target_type = 'MERCHANT' AND reason IN (
      'SUSPECTED_FRAUD', 'MISLEADING_BUSINESS_INFORMATION', 'FAILED_FULFILMENT',
      'UNPROFESSIONAL_CONDUCT', 'COUNTERFEIT_CONCERNS', 'SUSPICIOUS_ACTIVITY', 'OTHER'
    ))
  );
--> statement-breakpoint
ALTER TABLE public.marketplace_reports
  ADD CONSTRAINT marketplace_reports_severity_check
  CHECK (severity IS NULL OR severity IN ('MINOR', 'MODERATE', 'SERIOUS'));
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.validate_marketplace_report_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.reporter_id = NEW.seller_id THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'A seller cannot report their own listing or store';
  END IF;

  IF NEW.target_type = 'PRODUCT' AND NOT EXISTS (
    SELECT 1 FROM public.products
    WHERE id = NEW.product_id AND seller_id = NEW.seller_id
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'The report product and seller do not match';
  END IF;

  IF (
    SELECT count(*) FROM public.marketplace_reports
    WHERE reporter_id = NEW.reporter_id AND created_at >= now() - interval '1 hour'
  ) >= 5 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'Marketplace report rate limit exceeded';
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.validate_marketplace_report_submission()
FROM PUBLIC, anon, authenticated, service_role;
--> statement-breakpoint
CREATE TRIGGER marketplace_reports_validate_submission
  BEFORE INSERT ON public.marketplace_reports
  FOR EACH ROW EXECUTE FUNCTION public.validate_marketplace_report_submission();
--> statement-breakpoint
INSERT INTO public.product_trust_scores (product_id)
SELECT id FROM public.products
ON CONFLICT (product_id) DO NOTHING;
--> statement-breakpoint
INSERT INTO public.seller_trust_scores (seller_id)
SELECT user_id FROM public.seller_profiles
ON CONFLICT (seller_id) DO NOTHING;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.initialize_marketplace_trust_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_TABLE_NAME = 'products' THEN
    INSERT INTO public.product_trust_scores (product_id) VALUES (NEW.id)
    ON CONFLICT (product_id) DO NOTHING;
  ELSE
    INSERT INTO public.seller_trust_scores (seller_id) VALUES (NEW.user_id)
    ON CONFLICT (seller_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.initialize_marketplace_trust_score()
FROM PUBLIC, anon, authenticated, service_role;
--> statement-breakpoint
CREATE TRIGGER products_initialize_trust_score
  AFTER INSERT ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.initialize_marketplace_trust_score();
--> statement-breakpoint
CREATE TRIGGER seller_profiles_initialize_trust_score
  AFTER INSERT ON public.seller_profiles
  FOR EACH ROW EXECUTE FUNCTION public.initialize_marketplace_trust_score();
--> statement-breakpoint
WITH eligible AS (
  SELECT
    seller_profiles.user_id,
    coalesce(seller_profiles.onboarding_completed_at, seller_profiles.created_at) AS eligible_at,
    row_number() OVER (
      ORDER BY coalesce(seller_profiles.onboarding_completed_at, seller_profiles.created_at), seller_profiles.user_id
    ) AS founding_position
  FROM public.seller_profiles
  JOIN public.profiles ON profiles.id = seller_profiles.user_id
  WHERE seller_profiles.onboarding_completed_at IS NOT NULL
    AND seller_profiles.status IN ('PENDING_VERIFICATION', 'ACTIVE')
    AND profiles.status = 'ACTIVE'
    AND lower(profiles.email) NOT LIKE '%@example.%'
    AND lower(profiles.email) NOT LIKE '%@example.com'
    AND lower(profiles.email) NOT LIKE '%@test.%'
    AND lower(profiles.email) NOT LIKE '%+test@%'
    AND lower(profiles.email) NOT LIKE '%.invalid'
    AND lower(seller_profiles.store_name) <> 'administrator'
), inserted AS (
  INSERT INTO public.founding_merchant_awards (seller_id, position, awarded_at)
  SELECT user_id, founding_position::int, eligible_at
  FROM eligible
  WHERE founding_position <= 20
  ON CONFLICT DO NOTHING
  RETURNING id
)
INSERT INTO public.founding_merchant_award_events (award_id, action, reason)
SELECT id, 'AWARDED', 'Deterministic founding merchant backfill'
FROM inserted;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.try_award_founding_merchant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  next_position integer;
  new_award_id uuid;
BEGIN
  IF NEW.onboarding_completed_at IS NULL OR NEW.status NOT IN ('PENDING_VERIFICATION', 'ACTIVE') THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = NEW.user_id
      AND status = 'ACTIVE'
      AND lower(email) NOT LIKE '%@example.%'
      AND lower(email) NOT LIKE '%@example.com'
      AND lower(email) NOT LIKE '%@test.%'
      AND lower(email) NOT LIKE '%+test@%'
      AND lower(email) NOT LIKE '%.invalid'
  ) OR lower(NEW.store_name) = 'administrator' THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('twenty-two-parts-founding-20'));

  IF EXISTS (SELECT 1 FROM public.founding_merchant_awards WHERE seller_id = NEW.user_id) THEN
    RETURN NEW;
  END IF;

  SELECT coalesce(max(position), 0) + 1 INTO next_position
  FROM public.founding_merchant_awards;
  IF next_position > 20 THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.founding_merchant_awards (seller_id, position, awarded_at)
  VALUES (NEW.user_id, next_position, coalesce(NEW.onboarding_completed_at, now()))
  ON CONFLICT DO NOTHING
  RETURNING id INTO new_award_id;

  IF new_award_id IS NOT NULL THEN
    INSERT INTO public.founding_merchant_award_events (award_id, action, reason)
    VALUES (new_award_id, 'AWARDED', 'Eligible seller completed onboarding');
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.try_award_founding_merchant()
FROM PUBLIC, anon, authenticated, service_role;
--> statement-breakpoint
CREATE TRIGGER seller_profiles_assign_founding_merchant
  AFTER INSERT OR UPDATE OF onboarding_completed_at, status ON public.seller_profiles
  FOR EACH ROW EXECUTE FUNCTION public.try_award_founding_merchant();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.prevent_immutable_trust_history_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Trust decision history is immutable';
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.prevent_immutable_trust_history_changes()
FROM PUBLIC, anon, authenticated, service_role;
--> statement-breakpoint
CREATE TRIGGER manual_seller_verification_events_immutable
  BEFORE UPDATE OR DELETE ON public.manual_seller_verification_events
  FOR EACH ROW EXECUTE FUNCTION public.prevent_immutable_trust_history_changes();
--> statement-breakpoint
CREATE TRIGGER founding_merchant_award_events_immutable
  BEFORE UPDATE OR DELETE ON public.founding_merchant_award_events
  FOR EACH ROW EXECUTE FUNCTION public.prevent_immutable_trust_history_changes();
--> statement-breakpoint
INSERT INTO public.permissions (code, description)
VALUES ('reports.manage', 'Review marketplace reports and apply auditable trust decisions')
ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description;
--> statement-breakpoint
INSERT INTO public.admin_role_permissions (role_id, permission_id)
SELECT admin_roles.id, permissions.id
FROM public.admin_roles
CROSS JOIN public.permissions
WHERE admin_roles.key IN ('SUPER_ADMIN', 'OPERATIONS_ADMIN', 'PRODUCT_MODERATOR', 'DISPUTE_OFFICER', 'CONTENT_MODERATOR')
  AND permissions.code = 'reports.manage'
ON CONFLICT DO NOTHING;
--> statement-breakpoint
GRANT SELECT, INSERT ON TABLE public.marketplace_reports TO authenticated;
