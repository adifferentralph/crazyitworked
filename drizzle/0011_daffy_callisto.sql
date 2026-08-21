CREATE TYPE "public"."demand_event_type" AS ENUM('ZERO_RESULT_SEARCH', 'ABANDONED_FILTERED_SEARCH', 'RFQ_CREATED', 'RFQ_ZERO_QUOTES', 'RFQ_NO_ACCEPTABLE_QUOTE');--> statement-breakpoint
CREATE TYPE "public"."fitment_event_type" AS ENUM('SELLER_CLAIM_RECORDED', 'OEM_MATCHED', 'PLATFORM_VERIFIED', 'PURCHASE_COMPLETED', 'BUYER_CONFIRMED', 'FIT_PROBLEM_REPORTED', 'WRONG_PART_REPORTED', 'DISPUTE_OPENED', 'INCOMPATIBILITY_RETURN', 'ADMIN_CORRECTION', 'OEM_CORRECTION', 'LISTING_CORRECTION', 'REPEAT_PURCHASE_CONFIRMED');--> statement-breakpoint
CREATE TYPE "public"."fitment_evidence_type" AS ENUM('SELLER_CLAIMED', 'OEM_MATCHED', 'PLATFORM_VERIFIED', 'PURCHASE_VERIFIED', 'BUYER_CONFIRMED', 'DISPUTED', 'KNOWN_INCORRECT');--> statement-breakpoint
CREATE TYPE "public"."fitment_outcome_status" AS ENUM('FIT_CONFIRMED', 'FIT_PROBLEM_REPORTED', 'WRONG_PART', 'UNCONFIRMED', 'NOT_APPLICABLE');--> statement-breakpoint
CREATE TYPE "public"."fitment_transaction_source" AS ENUM('CATALOG_ORDER', 'RFQ_ACCEPTED_QUOTE');--> statement-breakpoint
CREATE TABLE "demand_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" "demand_event_type" NOT NULL,
	"event_token" uuid NOT NULL,
	"anonymous_session_hash" text NOT NULL,
	"buyer_id" uuid,
	"buyer_account_type" text NOT NULL,
	"request_id" uuid,
	"category_id" uuid,
	"fitment_id" uuid,
	"query" text,
	"location" text,
	"vehicle_make" text,
	"vehicle_model" text,
	"vehicle_year" integer,
	"result_count" integer,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "demand_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "fitment_claim_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid,
	"fitment_id" uuid,
	"seller_id" uuid NOT NULL,
	"action" text NOT NULL,
	"previous_evidence" "fitment_evidence_type",
	"new_evidence" "fitment_evidence_type",
	"previous_active" boolean,
	"new_active" boolean,
	"vehicle_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"changed_by_user_id" uuid,
	"reason" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fitment_claim_history" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "fitment_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" "fitment_event_type" NOT NULL,
	"snapshot_id" uuid,
	"product_id" uuid,
	"fitment_id" uuid,
	"seller_id" uuid,
	"buyer_id" uuid,
	"category_id" uuid,
	"created_by_user_id" uuid,
	"vehicle_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"product_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fitment_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "fitment_outcomes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"snapshot_id" uuid NOT NULL,
	"buyer_id" uuid NOT NULL,
	"outcome" "fitment_outcome_status" NOT NULL,
	"note" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fitment_outcomes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "fitment_transaction_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" "fitment_transaction_source" NOT NULL,
	"source_reference_id" uuid NOT NULL,
	"buyer_id" uuid NOT NULL,
	"seller_id" uuid NOT NULL,
	"product_id" uuid,
	"fitment_id" uuid,
	"category_id" uuid,
	"product_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"vehicle_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"eligible_at" timestamp with time zone,
	"fulfilled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fitment_transaction_snapshots" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "product_fitments" ADD COLUMN "evidence_type" "fitment_evidence_type" DEFAULT 'SELLER_CLAIMED' NOT NULL;--> statement-breakpoint
ALTER TABLE "product_fitments" ADD COLUMN "claimed_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "product_fitments" ADD COLUMN "evidence_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "product_fitments" ADD COLUMN "verified_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "product_fitments" ADD COLUMN "verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "product_fitments" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "product_fitments" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
UPDATE public.product_fitments pf
SET claimed_by_user_id = p.seller_id
FROM public.products p
WHERE p.id = pf.product_id;--> statement-breakpoint
ALTER TABLE public.product_fitments ALTER COLUMN claimed_by_user_id SET NOT NULL;--> statement-breakpointALTER TABLE "demand_events" ADD CONSTRAINT "demand_events_buyer_id_buyer_profiles_user_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."buyer_profiles"("user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demand_events" ADD CONSTRAINT "demand_events_request_id_part_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."part_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demand_events" ADD CONSTRAINT "demand_events_category_id_product_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demand_events" ADD CONSTRAINT "demand_events_fitment_id_vehicle_fitments_id_fk" FOREIGN KEY ("fitment_id") REFERENCES "public"."vehicle_fitments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fitment_claim_history" ADD CONSTRAINT "fitment_claim_history_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fitment_claim_history" ADD CONSTRAINT "fitment_claim_history_fitment_id_vehicle_fitments_id_fk" FOREIGN KEY ("fitment_id") REFERENCES "public"."vehicle_fitments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fitment_claim_history" ADD CONSTRAINT "fitment_claim_history_seller_id_seller_profiles_user_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."seller_profiles"("user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fitment_claim_history" ADD CONSTRAINT "fitment_claim_history_changed_by_user_id_profiles_id_fk" FOREIGN KEY ("changed_by_user_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fitment_events" ADD CONSTRAINT "fitment_events_snapshot_id_fitment_transaction_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."fitment_transaction_snapshots"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fitment_events" ADD CONSTRAINT "fitment_events_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fitment_events" ADD CONSTRAINT "fitment_events_fitment_id_vehicle_fitments_id_fk" FOREIGN KEY ("fitment_id") REFERENCES "public"."vehicle_fitments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fitment_events" ADD CONSTRAINT "fitment_events_seller_id_seller_profiles_user_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."seller_profiles"("user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fitment_events" ADD CONSTRAINT "fitment_events_buyer_id_buyer_profiles_user_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."buyer_profiles"("user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fitment_events" ADD CONSTRAINT "fitment_events_category_id_product_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fitment_events" ADD CONSTRAINT "fitment_events_created_by_user_id_profiles_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fitment_outcomes" ADD CONSTRAINT "fitment_outcomes_snapshot_id_fitment_transaction_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."fitment_transaction_snapshots"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fitment_outcomes" ADD CONSTRAINT "fitment_outcomes_buyer_id_buyer_profiles_user_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."buyer_profiles"("user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fitment_transaction_snapshots" ADD CONSTRAINT "fitment_transaction_snapshots_buyer_id_buyer_profiles_user_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."buyer_profiles"("user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fitment_transaction_snapshots" ADD CONSTRAINT "fitment_transaction_snapshots_seller_id_seller_profiles_user_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."seller_profiles"("user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fitment_transaction_snapshots" ADD CONSTRAINT "fitment_transaction_snapshots_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fitment_transaction_snapshots" ADD CONSTRAINT "fitment_transaction_snapshots_fitment_id_vehicle_fitments_id_fk" FOREIGN KEY ("fitment_id") REFERENCES "public"."vehicle_fitments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fitment_transaction_snapshots" ADD CONSTRAINT "fitment_transaction_snapshots_category_id_product_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "demand_events_event_token_unique" ON "demand_events" USING btree ("event_token");--> statement-breakpoint
CREATE INDEX "demand_events_type_occurred_idx" ON "demand_events" USING btree ("event_type","occurred_at");--> statement-breakpoint
CREATE INDEX "demand_events_vehicle_idx" ON "demand_events" USING btree ("vehicle_make","vehicle_model","vehicle_year");--> statement-breakpoint
CREATE INDEX "demand_events_category_location_idx" ON "demand_events" USING btree ("category_id","location");--> statement-breakpoint
CREATE INDEX "fitment_claim_history_product_created_idx" ON "fitment_claim_history" USING btree ("product_id","created_at");--> statement-breakpoint
CREATE INDEX "fitment_claim_history_seller_created_idx" ON "fitment_claim_history" USING btree ("seller_id","created_at");--> statement-breakpoint
CREATE INDEX "fitment_events_seller_occurred_idx" ON "fitment_events" USING btree ("seller_id","occurred_at");--> statement-breakpoint
CREATE INDEX "fitment_events_product_occurred_idx" ON "fitment_events" USING btree ("product_id","occurred_at");--> statement-breakpoint
CREATE INDEX "fitment_events_fitment_occurred_idx" ON "fitment_events" USING btree ("fitment_id","occurred_at");--> statement-breakpoint
CREATE INDEX "fitment_events_event_occurred_idx" ON "fitment_events" USING btree ("event_type","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "fitment_outcomes_snapshot_unique" ON "fitment_outcomes" USING btree ("snapshot_id");--> statement-breakpoint
CREATE INDEX "fitment_outcomes_buyer_created_idx" ON "fitment_outcomes" USING btree ("buyer_id","created_at");--> statement-breakpoint
CREATE INDEX "fitment_outcomes_outcome_created_idx" ON "fitment_outcomes" USING btree ("outcome","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "fitment_transaction_source_reference_unique" ON "fitment_transaction_snapshots" USING btree ("source","source_reference_id");--> statement-breakpoint
CREATE INDEX "fitment_transaction_buyer_eligible_idx" ON "fitment_transaction_snapshots" USING btree ("buyer_id","eligible_at");--> statement-breakpoint
CREATE INDEX "fitment_transaction_seller_created_idx" ON "fitment_transaction_snapshots" USING btree ("seller_id","created_at");--> statement-breakpoint
CREATE INDEX "fitment_transaction_product_idx" ON "fitment_transaction_snapshots" USING btree ("product_id");--> statement-breakpoint
ALTER TABLE "product_fitments" ADD CONSTRAINT "product_fitments_claimed_by_user_id_profiles_id_fk" FOREIGN KEY ("claimed_by_user_id") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_fitments" ADD CONSTRAINT "product_fitments_verified_by_user_id_profiles_id_fk" FOREIGN KEY ("verified_by_user_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_fitments_evidence_idx" ON "product_fitments" USING btree ("evidence_type","is_active");--> statement-breakpoint
CREATE POLICY "fitment_claim_history_seller_read" ON "fitment_claim_history" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "fitment_claim_history"."seller_id");--> statement-breakpoint
CREATE POLICY "fitment_outcomes_buyer_read" ON "fitment_outcomes" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "fitment_outcomes"."buyer_id");--> statement-breakpoint
CREATE POLICY "fitment_transaction_buyer_read" ON "fitment_transaction_snapshots" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "fitment_transaction_snapshots"."buyer_id");--> statement-breakpoint
CREATE POLICY "fitment_transaction_seller_read" ON "fitment_transaction_snapshots" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "fitment_transaction_snapshots"."seller_id");--> statement-breakpoint
ALTER POLICY "product_fitments_select_product" ON "product_fitments" TO authenticated USING (exists (
        select 1 from public.products
        where id = "product_fitments"."product_id"
          and (seller_id = (select auth.uid()) or ("product_fitments"."is_active" and "product_fitments"."evidence_type" not in ('DISPUTED', 'KNOWN_INCORRECT')))
      ));
--> statement-breakpoint
ALTER TABLE public.demand_events
  ADD CONSTRAINT demand_events_result_count_nonnegative CHECK (result_count IS NULL OR result_count >= 0),
  ADD CONSTRAINT demand_events_query_length CHECK (query IS NULL OR char_length(query) <= 160),
  ADD CONSTRAINT demand_events_location_length CHECK (location IS NULL OR char_length(location) <= 120);
--> statement-breakpoint
ALTER TABLE public.fitment_outcomes
  ADD CONSTRAINT fitment_outcomes_note_length CHECK (note IS NULL OR char_length(note) <= 1000);
--> statement-breakpoint
ALTER TABLE public.fitment_claim_history
  ADD CONSTRAINT fitment_claim_history_action_check CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'BASELINE'));
--> statement-breakpoint
INSERT INTO public.permissions (code, description)
VALUES
  ('fitment.manage', 'Review compatibility evidence and make auditable fitment corrections'),
  ('demand.read', 'View privacy-safe aggregated demand-with-no-supply intelligence')
ON CONFLICT (code) DO UPDATE SET description = excluded.description;
--> statement-breakpoint
INSERT INTO public.admin_role_permissions (role_id, permission_id)
SELECT role.id, permission.id
FROM public.admin_roles role
CROSS JOIN public.permissions permission
WHERE role.key IN ('SUPER_ADMIN', 'OPERATIONS_ADMIN', 'PRODUCT_MODERATOR')
  AND permission.code = 'fitment.manage'
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO public.admin_role_permissions (role_id, permission_id)
SELECT role.id, permission.id
FROM public.admin_roles role
CROSS JOIN public.permissions permission
WHERE role.key IN ('SUPER_ADMIN', 'OPERATIONS_ADMIN', 'PRODUCT_MODERATOR', 'SELLER_MANAGER')
  AND permission.code = 'demand.read'
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO public.fitment_claim_history (
  product_id, fitment_id, seller_id, action, new_evidence, new_active,
  vehicle_snapshot, reason, metadata
)
SELECT
  pf.product_id,
  pf.fitment_id,
  p.seller_id,
  'BASELINE',
  pf.evidence_type,
  pf.is_active,
  jsonb_strip_nulls(jsonb_build_object(
    'fitmentId', vf.id,
    'make', vm.name,
    'model', vmo.name,
    'year', vy.year,
    'trim', vt.name,
    'engine', e.name
  )),
  'Existing fitment preserved during evidence migration',
  jsonb_build_object('migration', '0011_daffy_callisto')
FROM public.product_fitments pf
JOIN public.products p ON p.id = pf.product_id
JOIN public.vehicle_fitments vf ON vf.id = pf.fitment_id
JOIN public.vehicle_makes vm ON vm.id = vf.make_id
JOIN public.vehicle_models vmo ON vmo.id = vf.model_id
JOIN public.vehicle_years vy ON vy.id = vf.year_id
LEFT JOIN public.vehicle_trims vt ON vt.id = vf.trim_id
LEFT JOIN public.engines e ON e.id = vf.engine_id;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.enforce_product_fitment_evidence()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id uuid := (SELECT auth.uid());
  owner_id uuid;
BEGIN
  SELECT seller_id INTO owner_id FROM public.products WHERE id = NEW.product_id;
  IF owner_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '23503', MESSAGE = 'Product was not found';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF actor_id IS NOT NULL
      AND actor_id <> owner_id
      AND NOT public.has_permission('assist_seller_inventory')
      AND NOT public.has_permission('fitment.manage') THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Fitment ownership or staff permission is required';
    END IF;
    NEW.claimed_by_user_id := owner_id;
    NEW.evidence_type := 'SELLER_CLAIMED';
    NEW.evidence_metadata := coalesce(NEW.evidence_metadata, '{}'::jsonb);
    NEW.verified_by_user_id := NULL;
    NEW.verified_at := NULL;
    NEW.is_active := true;
    NEW.updated_at := now();
  ELSIF TG_OP = 'UPDATE' THEN
    IF actor_id = owner_id THEN
      IF NEW.evidence_type IS DISTINCT FROM OLD.evidence_type
        OR NEW.claimed_by_user_id IS DISTINCT FROM OLD.claimed_by_user_id
        OR NEW.verified_by_user_id IS DISTINCT FROM OLD.verified_by_user_id
        OR NEW.verified_at IS DISTINCT FROM OLD.verified_at
        OR NEW.evidence_metadata IS DISTINCT FROM OLD.evidence_metadata THEN
        RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Sellers cannot upgrade or rewrite fitment evidence';
      END IF;
    ELSIF actor_id IS NOT NULL AND NOT public.has_permission('fitment.manage') THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Fitment management permission is required';
    END IF;
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER product_fitments_a_enforce_evidence
BEFORE INSERT OR UPDATE ON public.product_fitments
FOR EACH ROW EXECUTE FUNCTION public.enforce_product_fitment_evidence();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.audit_product_fitment_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  source_row record;
  seller_id_value uuid;
  vehicle_value jsonb := '{}'::jsonb;
  change_reason text := nullif(current_setting('app.fitment_change_reason', true), '');
BEGIN
  IF TG_OP = 'DELETE' THEN source_row := OLD; ELSE source_row := NEW; END IF;
  SELECT seller_id INTO seller_id_value FROM public.products WHERE id = source_row.product_id;
  SELECT jsonb_strip_nulls(jsonb_build_object(
    'fitmentId', vf.id, 'make', vm.name, 'model', vmo.name, 'year', vy.year,
    'trim', vt.name, 'engine', e.name, 'transmission', tr.name, 'drivetrain', d.name
  )) INTO vehicle_value
  FROM public.vehicle_fitments vf
  JOIN public.vehicle_makes vm ON vm.id = vf.make_id
  JOIN public.vehicle_models vmo ON vmo.id = vf.model_id
  JOIN public.vehicle_years vy ON vy.id = vf.year_id
  LEFT JOIN public.vehicle_trims vt ON vt.id = vf.trim_id
  LEFT JOIN public.engines e ON e.id = vf.engine_id
  LEFT JOIN public.transmissions tr ON tr.id = vf.transmission_id
  LEFT JOIN public.drivetrains d ON d.id = vf.drivetrain_id
  WHERE vf.id = source_row.fitment_id;

  INSERT INTO public.fitment_claim_history (
    product_id, fitment_id, seller_id, action, previous_evidence, new_evidence,
    previous_active, new_active, vehicle_snapshot, changed_by_user_id, reason, metadata
  ) VALUES (
    source_row.product_id,
    source_row.fitment_id,
    seller_id_value,
    TG_OP,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN OLD.evidence_type END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN NEW.evidence_type END,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN OLD.is_active END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN NEW.is_active END,
    coalesce(vehicle_value, '{}'::jsonb),
    (SELECT auth.uid()),
    coalesce(change_reason, CASE WHEN TG_OP = 'INSERT' THEN 'Seller compatibility claim recorded' END),
    jsonb_build_object('notesChanged', CASE WHEN TG_OP = 'UPDATE' THEN NEW.notes IS DISTINCT FROM OLD.notes ELSE false END)
  );
  RETURN source_row;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER product_fitments_z_audit_change
AFTER INSERT OR UPDATE OR DELETE ON public.product_fitments
FOR EACH ROW EXECUTE FUNCTION public.audit_product_fitment_change();
--> statement-breakpoint
CREATE TRIGGER product_fitments_set_updated_at
BEFORE UPDATE ON public.product_fitments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.correct_product_fitment(
  p_product_id uuid,
  p_fitment_id uuid,
  p_evidence public.fitment_evidence_type,
  p_is_active boolean,
  p_reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.has_permission('fitment.manage') THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Fitment management permission is required';
  END IF;
  IF char_length(btrim(coalesce(p_reason, ''))) < 10 OR char_length(p_reason) > 1000 THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'A clear correction reason between 10 and 1000 characters is required';
  END IF;
  IF p_evidence NOT IN ('SELLER_CLAIMED', 'OEM_MATCHED', 'PLATFORM_VERIFIED', 'DISPUTED', 'KNOWN_INCORRECT') THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Purchase and buyer evidence can only come from transaction outcomes';
  END IF;
  IF p_evidence IN ('DISPUTED', 'KNOWN_INCORRECT') AND p_is_active THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Disputed or known-incorrect compatibility cannot remain marketplace-active';
  END IF;

  PERFORM set_config('app.fitment_change_reason', btrim(p_reason), true);
  UPDATE public.product_fitments
  SET evidence_type = p_evidence,
      is_active = p_is_active,
      verified_by_user_id = CASE WHEN p_evidence IN ('OEM_MATCHED', 'PLATFORM_VERIFIED') THEN (SELECT auth.uid()) ELSE NULL END,
      verified_at = CASE WHEN p_evidence IN ('OEM_MATCHED', 'PLATFORM_VERIFIED') THEN now() ELSE NULL END,
      evidence_metadata = evidence_metadata || jsonb_build_object('lastCorrectionReason', btrim(p_reason))
  WHERE product_id = p_product_id AND fitment_id = p_fitment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Product fitment was not found';
  END IF;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.submit_fitment_outcome(
  p_snapshot_id uuid,
  p_outcome public.fitment_outcome_status,
  p_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target public.fitment_transaction_snapshots%ROWTYPE;
  event_value public.fitment_event_type;
BEGIN
  SELECT * INTO target FROM public.fitment_transaction_snapshots WHERE id = p_snapshot_id;
  IF NOT FOUND OR target.buyer_id <> (SELECT auth.uid()) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'This fitment check does not belong to the buyer';
  END IF;
  IF target.eligible_at IS NULL OR target.eligible_at > now() OR target.fulfilled_at IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Fitment feedback is available only after fulfilment';
  END IF;
  IF p_outcome NOT IN ('FIT_CONFIRMED', 'FIT_PROBLEM_REPORTED', 'WRONG_PART', 'UNCONFIRMED') THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'This outcome cannot be submitted by a buyer';
  END IF;
  IF char_length(coalesce(p_note, '')) > 1000 THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Fitment feedback must be 1000 characters or fewer';
  END IF;

  INSERT INTO public.fitment_outcomes (snapshot_id, buyer_id, outcome, note)
  VALUES (target.id, target.buyer_id, p_outcome, nullif(btrim(p_note), ''));

  event_value := CASE p_outcome
    WHEN 'FIT_CONFIRMED' THEN 'BUYER_CONFIRMED'::public.fitment_event_type
    WHEN 'FIT_PROBLEM_REPORTED' THEN 'FIT_PROBLEM_REPORTED'::public.fitment_event_type
    WHEN 'WRONG_PART' THEN 'WRONG_PART_REPORTED'::public.fitment_event_type
    ELSE NULL
  END;

  IF event_value IS NOT NULL THEN
    INSERT INTO public.fitment_events (
      event_type, snapshot_id, product_id, fitment_id, seller_id, buyer_id,
      category_id, created_by_user_id, vehicle_snapshot, product_snapshot,
      metadata, occurred_at
    ) VALUES (
      event_value, target.id, target.product_id, target.fitment_id, target.seller_id,
      target.buyer_id, target.category_id, target.buyer_id, target.vehicle_snapshot,
      target.product_snapshot, jsonb_build_object('outcome', p_outcome), now()
    );
  END IF;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.fitment_seller_performance(p_seller_id uuid DEFAULT NULL)
RETURNS TABLE (
  eligible_count bigint,
  confirmed_count bigint,
  fit_problem_count bigint,
  wrong_part_count bigint,
  dispute_count bigint,
  return_count bigint,
  accuracy_percent numeric,
  evidence_status text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_seller uuid := coalesce(p_seller_id, (SELECT auth.uid()));
BEGIN
  IF target_seller <> (SELECT auth.uid())
    AND NOT public.has_permission('fitment.manage')
    AND NOT public.has_permission('demand.read') THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Seller fitment metrics are not available';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.seller_profiles WHERE user_id = target_seller) THEN
    RAISE EXCEPTION USING ERRCODE = '23503', MESSAGE = 'Seller was not found';
  END IF;

  RETURN QUERY
  WITH outcome_counts AS (
    SELECT
      count(*) FILTER (WHERE fo.outcome IN ('FIT_CONFIRMED', 'FIT_PROBLEM_REPORTED', 'WRONG_PART')) AS eligible,
      count(*) FILTER (WHERE fo.outcome = 'FIT_CONFIRMED') AS confirmed,
      count(*) FILTER (WHERE fo.outcome = 'FIT_PROBLEM_REPORTED') AS fit_problem,
      count(*) FILTER (WHERE fo.outcome = 'WRONG_PART') AS wrong_part
    FROM public.fitment_transaction_snapshots fts
    JOIN public.fitment_outcomes fo ON fo.snapshot_id = fts.id
    WHERE fts.seller_id = target_seller
  ), event_counts AS (
    SELECT
      count(*) FILTER (WHERE fe.event_type = 'DISPUTE_OPENED') AS disputes,
      count(*) FILTER (WHERE fe.event_type = 'INCOMPATIBILITY_RETURN') AS returns
    FROM public.fitment_events fe
    WHERE fe.seller_id = target_seller
  )
  SELECT
    oc.eligible,
    oc.confirmed,
    oc.fit_problem,
    oc.wrong_part,
    ec.disputes,
    ec.returns,
    CASE WHEN oc.eligible >= 5 THEN round((oc.confirmed::numeric / nullif(oc.eligible, 0)) * 100, 1) END,
    CASE WHEN oc.eligible = 0 THEN 'NO_DATA' WHEN oc.eligible < 5 THEN 'INSUFFICIENT_SAMPLE' ELSE 'MEASURED' END
  FROM outcome_counts oc CROSS JOIN event_counts ec;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.fitment_claims_for_review()
RETURNS TABLE (
  product_id uuid,
  product_name text,
  seller_id uuid,
  store_name text,
  fitment_id uuid,
  vehicle_label text,
  evidence_type public.fitment_evidence_type,
  is_active boolean,
  problem_event_count bigint,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.has_permission('fitment.manage') THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Fitment management permission is required';
  END IF;
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.seller_id,
    sp.store_name,
    pf.fitment_id,
    concat_ws(' · ', vy.year::text, vm.name, vmo.name, vt.name, e.name),
    pf.evidence_type,
    pf.is_active,
    count(fe.id) FILTER (WHERE fe.event_type IN ('FIT_PROBLEM_REPORTED', 'WRONG_PART_REPORTED', 'DISPUTE_OPENED', 'INCOMPATIBILITY_RETURN')),
    pf.updated_at
  FROM public.product_fitments pf
  JOIN public.products p ON p.id = pf.product_id
  JOIN public.seller_profiles sp ON sp.user_id = p.seller_id
  JOIN public.vehicle_fitments vf ON vf.id = pf.fitment_id
  JOIN public.vehicle_makes vm ON vm.id = vf.make_id
  JOIN public.vehicle_models vmo ON vmo.id = vf.model_id
  JOIN public.vehicle_years vy ON vy.id = vf.year_id
  LEFT JOIN public.vehicle_trims vt ON vt.id = vf.trim_id
  LEFT JOIN public.engines e ON e.id = vf.engine_id
  LEFT JOIN public.fitment_events fe ON fe.product_id = p.id AND fe.fitment_id = pf.fitment_id
  GROUP BY p.id, sp.store_name, pf.fitment_id, vy.year, vm.name, vmo.name, vt.name, e.name,
    pf.evidence_type, pf.is_active, pf.updated_at
  ORDER BY (pf.evidence_type IN ('DISPUTED', 'KNOWN_INCORRECT')) DESC,
    count(fe.id) FILTER (WHERE fe.event_type IN ('FIT_PROBLEM_REPORTED', 'WRONG_PART_REPORTED', 'DISPUTE_OPENED', 'INCOMPATIBILITY_RETURN')) DESC,
    pf.updated_at DESC
  LIMIT 250;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.record_demand_event(
  p_event_type public.demand_event_type,
  p_event_token uuid,
  p_session_id uuid,
  p_query text DEFAULT NULL,
  p_category_id uuid DEFAULT NULL,
  p_fitment_id uuid DEFAULT NULL,
  p_location text DEFAULT NULL,
  p_result_count integer DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id uuid := (SELECT auth.uid());
  buyer_type_value text := 'GUEST';
  make_value text;
  model_value text;
  year_value integer;
BEGIN
  IF p_event_type NOT IN ('ZERO_RESULT_SEARCH', 'ABANDONED_FILTERED_SEARCH') THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'This demand event cannot be client-recorded';
  END IF;
  IF p_event_token IS NULL OR p_session_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Demand event identifiers are required';
  END IF;
  IF (p_event_type = 'ZERO_RESULT_SEARCH' AND coalesce(p_result_count, -1) <> 0)
    OR (p_event_type = 'ABANDONED_FILTERED_SEARCH' AND coalesce(p_result_count, 0) < 1) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Demand event result count is invalid';
  END IF;
  IF p_category_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.product_categories WHERE id = p_category_id AND is_active
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23503', MESSAGE = 'Demand category was not found';
  END IF;

  IF actor_id IS NOT NULL THEN
    SELECT account_type::text INTO buyer_type_value
    FROM public.buyer_profiles WHERE user_id = actor_id;
    buyer_type_value := coalesce(buyer_type_value, 'AUTHENTICATED_NON_BUYER');
  END IF;

  IF p_fitment_id IS NOT NULL THEN
    SELECT vm.name, vmo.name, vy.year
    INTO make_value, model_value, year_value
    FROM public.vehicle_fitments vf
    JOIN public.vehicle_makes vm ON vm.id = vf.make_id
    JOIN public.vehicle_models vmo ON vmo.id = vf.model_id
    JOIN public.vehicle_years vy ON vy.id = vf.year_id
    WHERE vf.id = p_fitment_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE = '23503', MESSAGE = 'Demand vehicle was not found';
    END IF;
  END IF;

  INSERT INTO public.demand_events (
    event_type, event_token, anonymous_session_hash, buyer_id, buyer_account_type,
    category_id, fitment_id, query, location, vehicle_make, vehicle_model,
    vehicle_year, result_count, metadata
  ) VALUES (
    p_event_type,
    p_event_token,
    md5(p_session_id::text),
    CASE WHEN EXISTS (SELECT 1 FROM public.buyer_profiles WHERE user_id = actor_id) THEN actor_id END,
    buyer_type_value,
    p_category_id,
    p_fitment_id,
    nullif(left(btrim(coalesce(p_query, '')), 160), ''),
    nullif(left(btrim(coalesce(p_location, '')), 120), ''),
    make_value,
    model_value,
    year_value,
    p_result_count,
    jsonb_build_object('privacy', 'aggregate_only')
  )
  ON CONFLICT (event_token) DO NOTHING;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.capture_part_request_demand()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  demand_type public.demand_event_type;
  quote_count integer;
  accepted_count integer;
  make_value text;
  model_value text;
  year_value integer;
  buyer_type_value text;
BEGIN
  IF NEW.status = 'OPEN' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    demand_type := 'RFQ_CREATED';
  ELSIF NEW.status IN ('CLOSED', 'EXPIRED') AND OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT count(*), count(*) FILTER (WHERE status = 'ACCEPTED')
    INTO quote_count, accepted_count
    FROM public.part_request_quotes WHERE request_id = NEW.id;
    IF quote_count = 0 THEN demand_type := 'RFQ_ZERO_QUOTES';
    ELSIF accepted_count = 0 THEN demand_type := 'RFQ_NO_ACCEPTABLE_QUOTE';
    ELSE RETURN NEW;
    END IF;
  ELSE
    RETURN NEW;
  END IF;

  SELECT bp.account_type::text INTO buyer_type_value
  FROM public.buyer_profiles bp WHERE bp.user_id = NEW.buyer_id;
  IF NEW.fitment_id IS NOT NULL THEN
    SELECT vm.name, vmo.name, vy.year INTO make_value, model_value, year_value
    FROM public.vehicle_fitments vf
    JOIN public.vehicle_makes vm ON vm.id = vf.make_id
    JOIN public.vehicle_models vmo ON vmo.id = vf.model_id
    JOIN public.vehicle_years vy ON vy.id = vf.year_id
    WHERE vf.id = NEW.fitment_id;
  END IF;

  INSERT INTO public.demand_events (
    event_type, event_token, anonymous_session_hash, buyer_id, buyer_account_type,
    request_id, category_id, fitment_id, query, location, vehicle_make,
    vehicle_model, vehicle_year, result_count, metadata
  ) VALUES (
    demand_type,
    gen_random_uuid(),
    md5('rfq:' || NEW.id::text),
    NEW.buyer_id,
    coalesce(buyer_type_value, 'INDIVIDUAL'),
    NEW.id,
    NEW.category_id,
    NEW.fitment_id,
    left(NEW.part_name, 160),
    left(concat_ws(', ', NEW.delivery_city, NEW.delivery_state), 120),
    make_value,
    model_value,
    year_value,
    CASE WHEN demand_type = 'RFQ_ZERO_QUOTES' THEN 0 ELSE NULL END,
    jsonb_build_object('source', 'rfq_status_transition')
  );
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER part_requests_capture_demand
AFTER INSERT OR UPDATE OF status ON public.part_requests
FOR EACH ROW EXECUTE FUNCTION public.capture_part_request_demand();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.capture_accepted_quote_fitment_snapshot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  request_row public.part_requests%ROWTYPE;
  product_value jsonb;
  vehicle_value jsonb := '{}'::jsonb;
  category_value uuid;
BEGIN
  IF NEW.status <> 'ACCEPTED' OR OLD.status = 'ACCEPTED' THEN RETURN NEW; END IF;
  SELECT * INTO request_row FROM public.part_requests WHERE id = NEW.request_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  IF NEW.product_id IS NOT NULL THEN
    SELECT jsonb_strip_nulls(jsonb_build_object(
      'productId', p.id, 'name', p.name, 'brand', p.brand, 'condition', p.condition,
      'oemPartNumber', p.oem_part_number, 'manufacturerPartNumber', p.manufacturer_part_number,
      'sku', p.sku, 'unitPriceMinor', NEW.unit_price_minor, 'currency', NEW.currency,
      'quantity', NEW.quantity, 'quoteId', NEW.id
    )), p.category_id
    INTO product_value, category_value
    FROM public.products p WHERE p.id = NEW.product_id;
  END IF;
  product_value := coalesce(product_value, jsonb_strip_nulls(jsonb_build_object(
    'name', request_row.part_name, 'oemPartNumber', request_row.oem_part_number,
    'manufacturerPartNumber', request_row.manufacturer_part_number,
    'unitPriceMinor', NEW.unit_price_minor, 'currency', NEW.currency,
    'quantity', NEW.quantity, 'quoteId', NEW.id
  )));
  category_value := coalesce(category_value, request_row.category_id);

  IF request_row.fitment_id IS NOT NULL THEN
    SELECT jsonb_strip_nulls(jsonb_build_object(
      'fitmentId', vf.id, 'make', vm.name, 'model', vmo.name, 'year', vy.year,
      'trim', vt.name, 'engine', e.name, 'transmission', tr.name, 'drivetrain', d.name
    )) INTO vehicle_value
    FROM public.vehicle_fitments vf
    JOIN public.vehicle_makes vm ON vm.id = vf.make_id
    JOIN public.vehicle_models vmo ON vmo.id = vf.model_id
    JOIN public.vehicle_years vy ON vy.id = vf.year_id
    LEFT JOIN public.vehicle_trims vt ON vt.id = vf.trim_id
    LEFT JOIN public.engines e ON e.id = vf.engine_id
    LEFT JOIN public.transmissions tr ON tr.id = vf.transmission_id
    LEFT JOIN public.drivetrains d ON d.id = vf.drivetrain_id
    WHERE vf.id = request_row.fitment_id;
  END IF;

  INSERT INTO public.fitment_transaction_snapshots (
    source, source_reference_id, buyer_id, seller_id, product_id, fitment_id,
    category_id, product_snapshot, vehicle_snapshot
  ) VALUES (
    'RFQ_ACCEPTED_QUOTE', NEW.id, request_row.buyer_id, NEW.seller_id,
    NEW.product_id, request_row.fitment_id, category_value, product_value,
    coalesce(vehicle_value, '{}'::jsonb)
  ) ON CONFLICT (source, source_reference_id) DO NOTHING;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER part_request_quotes_capture_fitment_snapshot
AFTER UPDATE OF status ON public.part_request_quotes
FOR EACH ROW EXECUTE FUNCTION public.capture_accepted_quote_fitment_snapshot();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.demand_no_supply_summary()
RETURNS TABLE (
  event_type public.demand_event_type,
  demand_topic text,
  category_name text,
  vehicle_make text,
  vehicle_model text,
  vehicle_year integer,
  location text,
  buyer_account_type text,
  event_count bigint,
  last_seen_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.has_permission('demand.read') THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Demand intelligence permission is required';
  END IF;
  RETURN QUERY
  WITH grouped AS (
    SELECT
      de.event_type,
      de.query,
      pc.name AS category_name,
      de.vehicle_make,
      de.vehicle_model,
      de.vehicle_year,
      de.location,
      de.buyer_account_type,
      count(*) AS event_count,
      max(de.occurred_at) AS last_seen_at
    FROM public.demand_events de
    LEFT JOIN public.product_categories pc ON pc.id = de.category_id
    WHERE de.occurred_at >= now() - interval '90 days'
      AND de.event_type IN ('ZERO_RESULT_SEARCH', 'ABANDONED_FILTERED_SEARCH', 'RFQ_ZERO_QUOTES', 'RFQ_NO_ACCEPTABLE_QUOTE')
    GROUP BY de.event_type, de.query, pc.name, de.vehicle_make, de.vehicle_model,
      de.vehicle_year, de.location, de.buyer_account_type
  )
  SELECT
    grouped.event_type,
    CASE WHEN grouped.event_count >= 3 THEN grouped.query ELSE '[low-volume query hidden]' END,
    grouped.category_name,
    grouped.vehicle_make,
    grouped.vehicle_model,
    grouped.vehicle_year,
    grouped.location,
    grouped.buyer_account_type,
    grouped.event_count,
    grouped.last_seen_at
  FROM grouped
  ORDER BY grouped.event_count DESC, grouped.last_seen_at DESC
  LIMIT 250;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON TABLE public.fitment_claim_history, public.fitment_transaction_snapshots,
  public.fitment_outcomes, public.fitment_events, public.demand_events FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
GRANT SELECT ON TABLE public.fitment_claim_history, public.fitment_transaction_snapshots,
  public.fitment_outcomes TO authenticated;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.enforce_product_fitment_evidence() FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.audit_product_fitment_change() FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.capture_part_request_demand() FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.capture_accepted_quote_fitment_snapshot() FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.correct_product_fitment(uuid, uuid, public.fitment_evidence_type, boolean, text) FROM PUBLIC, anon;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.submit_fitment_outcome(uuid, public.fitment_outcome_status, text) FROM PUBLIC, anon;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.fitment_seller_performance(uuid) FROM PUBLIC, anon;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.fitment_claims_for_review() FROM PUBLIC, anon;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.record_demand_event(public.demand_event_type, uuid, uuid, text, uuid, uuid, text, integer) FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.demand_no_supply_summary() FROM PUBLIC, anon;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.correct_product_fitment(uuid, uuid, public.fitment_evidence_type, boolean, text) TO authenticated;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.submit_fitment_outcome(uuid, public.fitment_outcome_status, text) TO authenticated;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.fitment_seller_performance(uuid) TO authenticated;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.fitment_claims_for_review() TO authenticated;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.record_demand_event(public.demand_event_type, uuid, uuid, text, uuid, uuid, text, integer) TO anon, authenticated;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.demand_no_supply_summary() TO authenticated;