ALTER TABLE "products" ADD COLUMN "delivery_fee_minor" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "delivery_fee_minor" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_recipient_name" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_phone" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_address_line_1" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_address_line_2" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_city" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_state" text;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_delivery_fee_nonnegative" CHECK ("products"."delivery_fee_minor" >= 0);--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_delivery_fee_nonnegative" CHECK ("order_items"."delivery_fee_minor" >= 0);--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_delivery_has_destination" CHECK ("orders"."fulfillment_method" <> 'DELIVERY' or (
        nullif(trim("orders"."delivery_recipient_name"), '') is not null
        and nullif(trim("orders"."delivery_phone"), '') is not null
        and nullif(trim("orders"."delivery_address_line_1"), '') is not null
        and nullif(trim("orders"."delivery_city"), '') is not null
        and nullif(trim("orders"."delivery_state"), '') is not null
      ));--> statement-breakpoint
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
    OR NEW.delivery_recipient_name IS DISTINCT FROM OLD.delivery_recipient_name
    OR NEW.delivery_phone IS DISTINCT FROM OLD.delivery_phone
    OR NEW.delivery_address_line_1 IS DISTINCT FROM OLD.delivery_address_line_1
    OR NEW.delivery_address_line_2 IS DISTINCT FROM OLD.delivery_address_line_2
    OR NEW.delivery_city IS DISTINCT FROM OLD.delivery_city
    OR NEW.delivery_state IS DISTINCT FROM OLD.delivery_state
    OR NEW.cart_fingerprint IS DISTINCT FROM OLD.cart_fingerprint
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Order identity and financial snapshots are immutable';
  END IF;

  RETURN NEW;
END;
$$;
