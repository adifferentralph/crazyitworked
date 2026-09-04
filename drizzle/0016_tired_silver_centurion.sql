CREATE TYPE "public"."commerce_payment_status" AS ENUM('PENDING', 'PROCESSING', 'PAID', 'FAILED', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."fulfillment_method" AS ENUM('PICKUP', 'DELIVERY');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('PENDING_PAYMENT', 'PAID', 'PROCESSING', 'READY_FOR_PICKUP', 'COMPLETED', 'CANCELLED', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."seller_ledger_bucket" AS ENUM('HELD', 'AVAILABLE');--> statement-breakpoint
CREATE TYPE "public"."seller_ledger_direction" AS ENUM('CREDIT', 'DEBIT');--> statement-breakpoint
CREATE TYPE "public"."seller_ledger_entry_type" AS ENUM('SALE_HELD', 'SALE_RELEASED', 'REFUND', 'PAYOUT', 'ADJUSTMENT');--> statement-breakpoint
CREATE TABLE "commerce_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"provider" text DEFAULT 'KORA' NOT NULL,
	"provider_reference" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"status" "commerce_payment_status" DEFAULT 'PENDING' NOT NULL,
	"amount_minor" bigint NOT NULL,
	"currency" text DEFAULT 'NGN' NOT NULL,
	"checkout_url" text,
	"provider_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"failure_code" text,
	"failure_message" text,
	"initialized_at" timestamp with time zone,
	"verified_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "commerce_payments_provider_kora" CHECK ("commerce_payments"."provider" = 'KORA'),
	CONSTRAINT "commerce_payments_amount_positive" CHECK ("commerce_payments"."amount_minor" > 0),
	CONSTRAINT "commerce_payments_currency_ngn" CHECK ("commerce_payments"."currency" = 'NGN')
);
--> statement-breakpoint
ALTER TABLE "commerce_payments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "commerce_webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text DEFAULT 'KORA' NOT NULL,
	"payload_hash" text NOT NULL,
	"provider_reference" text,
	"event_type" text,
	"processing_status" text DEFAULT 'RECEIVED' NOT NULL,
	"payload" jsonb NOT NULL,
	"error_message" text,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "commerce_webhook_events_provider_kora" CHECK ("commerce_webhook_events"."provider" = 'KORA'),
	CONSTRAINT "commerce_webhook_events_processing_status" CHECK ("commerce_webhook_events"."processing_status" in ('RECEIVED', 'PROCESSED', 'IGNORED', 'FAILED'))
);
--> statement-breakpoint
ALTER TABLE "commerce_webhook_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"seller_id" uuid NOT NULL,
	"product_name" text NOT NULL,
	"product_slug" text NOT NULL,
	"sku" text NOT NULL,
	"unit_price_minor" bigint NOT NULL,
	"quantity" integer NOT NULL,
	"product_total_minor" bigint NOT NULL,
	"seller_entitlement_minor" bigint NOT NULL,
	"pickup_country" text NOT NULL,
	"pickup_state" text NOT NULL,
	"pickup_city" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_items_quantity_positive" CHECK ("order_items"."quantity" > 0),
	CONSTRAINT "order_items_unit_price_positive" CHECK ("order_items"."unit_price_minor" > 0),
	CONSTRAINT "order_items_product_total_exact" CHECK ("order_items"."product_total_minor" = "order_items"."unit_price_minor" * "order_items"."quantity"),
	CONSTRAINT "order_items_seller_gets_full_product_price" CHECK ("order_items"."seller_entitlement_minor" = "order_items"."product_total_minor")
);
--> statement-breakpoint
ALTER TABLE "order_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_number" text NOT NULL,
	"buyer_id" uuid NOT NULL,
	"status" "order_status" DEFAULT 'PENDING_PAYMENT' NOT NULL,
	"payment_status" "commerce_payment_status" DEFAULT 'PENDING' NOT NULL,
	"fulfillment_method" "fulfillment_method" NOT NULL,
	"currency" text DEFAULT 'NGN' NOT NULL,
	"product_subtotal_minor" bigint NOT NULL,
	"actual_delivery_cost_minor" bigint DEFAULT 0 NOT NULL,
	"platform_service_component_minor" bigint DEFAULT 0 NOT NULL,
	"delivery_total_minor" bigint DEFAULT 0 NOT NULL,
	"total_minor" bigint NOT NULL,
	"customer_name" text NOT NULL,
	"customer_email" text NOT NULL,
	"customer_phone" text,
	"cart_fingerprint" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"paid_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_currency_ngn" CHECK ("orders"."currency" = 'NGN'),
	CONSTRAINT "orders_product_subtotal_positive" CHECK ("orders"."product_subtotal_minor" > 0),
	CONSTRAINT "orders_delivery_components_nonnegative" CHECK ("orders"."actual_delivery_cost_minor" >= 0
        and "orders"."platform_service_component_minor" >= 0
        and "orders"."delivery_total_minor" >= 0),
	CONSTRAINT "orders_delivery_total_exact" CHECK ("orders"."delivery_total_minor" = "orders"."actual_delivery_cost_minor" + "orders"."platform_service_component_minor"),
	CONSTRAINT "orders_buyer_total_exact" CHECK ("orders"."total_minor" = "orders"."product_subtotal_minor" + "orders"."delivery_total_minor"),
	CONSTRAINT "orders_pickup_has_no_delivery_charge" CHECK ("orders"."fulfillment_method" <> 'PICKUP' or "orders"."delivery_total_minor" = 0)
);
--> statement-breakpoint
ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "seller_ledger_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seller_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"order_item_id" uuid NOT NULL,
	"entry_type" "seller_ledger_entry_type" NOT NULL,
	"bucket" "seller_ledger_bucket" NOT NULL,
	"direction" "seller_ledger_direction" NOT NULL,
	"amount_minor" bigint NOT NULL,
	"currency" text DEFAULT 'NGN' NOT NULL,
	"idempotency_key" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "seller_ledger_entries_amount_positive" CHECK ("seller_ledger_entries"."amount_minor" > 0),
	CONSTRAINT "seller_ledger_entries_currency_ngn" CHECK ("seller_ledger_entries"."currency" = 'NGN')
);
--> statement-breakpoint
ALTER TABLE "seller_ledger_entries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "commerce_payments" ADD CONSTRAINT "commerce_payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_seller_id_seller_profiles_user_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."seller_profiles"("user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_buyer_id_buyer_profiles_user_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."buyer_profiles"("user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_ledger_entries" ADD CONSTRAINT "seller_ledger_entries_seller_id_seller_profiles_user_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."seller_profiles"("user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_ledger_entries" ADD CONSTRAINT "seller_ledger_entries_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_ledger_entries" ADD CONSTRAINT "seller_ledger_entries_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "commerce_payments_provider_reference_unique" ON "commerce_payments" USING btree ("provider_reference");--> statement-breakpoint
CREATE UNIQUE INDEX "commerce_payments_idempotency_key_unique" ON "commerce_payments" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "commerce_payments_order_created_idx" ON "commerce_payments" USING btree ("order_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "commerce_webhook_events_payload_hash_unique" ON "commerce_webhook_events" USING btree ("payload_hash");--> statement-breakpoint
CREATE INDEX "commerce_webhook_events_reference_idx" ON "commerce_webhook_events" USING btree ("provider_reference");--> statement-breakpoint
CREATE UNIQUE INDEX "order_items_order_product_unique" ON "order_items" USING btree ("order_id","product_id");--> statement-breakpoint
CREATE INDEX "order_items_seller_created_idx" ON "order_items" USING btree ("seller_id","created_at");--> statement-breakpoint
CREATE INDEX "order_items_product_idx" ON "order_items" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_order_number_unique" ON "orders" USING btree ("order_number");--> statement-breakpoint
CREATE INDEX "orders_buyer_created_idx" ON "orders" USING btree ("buyer_id","created_at");--> statement-breakpoint
CREATE INDEX "orders_buyer_pending_fingerprint_idx" ON "orders" USING btree ("buyer_id","cart_fingerprint","status","expires_at");--> statement-breakpoint
CREATE INDEX "orders_status_created_idx" ON "orders" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "seller_ledger_entries_idempotency_key_unique" ON "seller_ledger_entries" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "seller_ledger_entries_seller_created_idx" ON "seller_ledger_entries" USING btree ("seller_id","created_at");--> statement-breakpoint
CREATE INDEX "seller_ledger_entries_order_idx" ON "seller_ledger_entries" USING btree ("order_id");--> statement-breakpoint
CREATE POLICY "commerce_payments_select_buyer_or_admin" ON "commerce_payments" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (
          select 1 from public.orders
          where id = "commerce_payments"."order_id" and buyer_id = (select auth.uid())
        ) or exists (
  select 1 from public.profiles
  where id = (select auth.uid()) and role = 'ADMIN' and status = 'ACTIVE'
));--> statement-breakpoint
CREATE POLICY "commerce_webhook_events_admin_read" ON "commerce_webhook_events" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (
  select 1 from public.profiles
  where id = (select auth.uid()) and role = 'ADMIN' and status = 'ACTIVE'
));--> statement-breakpoint
CREATE POLICY "order_items_select_participant_or_admin" ON "order_items" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "order_items"."seller_id"
        or exists (
          select 1 from public.orders
          where id = "order_items"."order_id" and buyer_id = (select auth.uid())
        )
        or exists (
  select 1 from public.profiles
  where id = (select auth.uid()) and role = 'ADMIN' and status = 'ACTIVE'
));--> statement-breakpoint
CREATE POLICY "orders_select_buyer_or_admin" ON "orders" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "orders"."buyer_id" or exists (
  select 1 from public.profiles
  where id = (select auth.uid()) and role = 'ADMIN' and status = 'ACTIVE'
));--> statement-breakpoint
CREATE POLICY "seller_ledger_entries_select_owner_or_admin" ON "seller_ledger_entries" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "seller_ledger_entries"."seller_id" or exists (
  select 1 from public.profiles
  where id = (select auth.uid()) and role = 'ADMIN' and status = 'ACTIVE'
));
--> statement-breakpoint
REVOKE ALL ON TABLE public.orders, public.order_items, public.commerce_payments,
  public.commerce_webhook_events, public.seller_ledger_entries
  FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
GRANT SELECT ON TABLE public.orders, public.order_items, public.commerce_payments,
  public.commerce_webhook_events, public.seller_ledger_entries
  TO authenticated;
--> statement-breakpoint
CREATE TRIGGER orders_set_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
--> statement-breakpoint
CREATE TRIGGER commerce_payments_set_updated_at
  BEFORE UPDATE ON public.commerce_payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.enforce_order_financial_immutability()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.order_number IS DISTINCT FROM OLD.order_number
    OR NEW.buyer_id IS DISTINCT FROM OLD.buyer_id
    OR NEW.fulfillment_method IS DISTINCT FROM OLD.fulfillment_method
    OR NEW.currency IS DISTINCT FROM OLD.currency
    OR NEW.product_subtotal_minor IS DISTINCT FROM OLD.product_subtotal_minor
    OR NEW.actual_delivery_cost_minor IS DISTINCT FROM OLD.actual_delivery_cost_minor
    OR NEW.platform_service_component_minor IS DISTINCT FROM OLD.platform_service_component_minor
    OR NEW.delivery_total_minor IS DISTINCT FROM OLD.delivery_total_minor
    OR NEW.total_minor IS DISTINCT FROM OLD.total_minor
    OR NEW.customer_name IS DISTINCT FROM OLD.customer_name
    OR NEW.customer_email IS DISTINCT FROM OLD.customer_email
    OR NEW.customer_phone IS DISTINCT FROM OLD.customer_phone
    OR NEW.cart_fingerprint IS DISTINCT FROM OLD.cart_fingerprint
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Order identity and financial snapshots are immutable';
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER orders_protect_financial_snapshot
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.enforce_order_financial_immutability();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.enforce_payment_identity_immutability()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.order_id IS DISTINCT FROM OLD.order_id
    OR NEW.provider IS DISTINCT FROM OLD.provider
    OR NEW.provider_reference IS DISTINCT FROM OLD.provider_reference
    OR NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key
    OR NEW.amount_minor IS DISTINCT FROM OLD.amount_minor
    OR NEW.currency IS DISTINCT FROM OLD.currency
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Payment identity and amount are immutable';
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER commerce_payments_protect_identity
  BEFORE UPDATE ON public.commerce_payments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_payment_identity_immutability();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.reject_immutable_commerce_record_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '42501',
    MESSAGE = 'Commerce audit and entitlement records are append-only';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER order_items_are_immutable
  BEFORE UPDATE OR DELETE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.reject_immutable_commerce_record_change();
--> statement-breakpoint
CREATE TRIGGER seller_ledger_entries_are_immutable
  BEFORE UPDATE OR DELETE ON public.seller_ledger_entries
  FOR EACH ROW EXECUTE FUNCTION public.reject_immutable_commerce_record_change();
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.enforce_order_financial_immutability()
  FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.enforce_payment_identity_immutability()
  FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.reject_immutable_commerce_record_change()
  FROM PUBLIC, anon, authenticated;
