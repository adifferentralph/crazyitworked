import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { authenticatedRole, authUid } from "drizzle-orm/supabase";

import { products } from "@/db/schema/catalog";
import { buyerProfiles, sellerProfiles } from "@/db/schema/identity";

export const orderStatusEnum = pgEnum("order_status", [
  "PENDING_PAYMENT",
  "PAID",
  "PROCESSING",
  "READY_FOR_PICKUP",
  "COMPLETED",
  "CANCELLED",
  "REFUNDED",
]);

export const commercePaymentStatusEnum = pgEnum("commerce_payment_status", [
  "PENDING",
  "PROCESSING",
  "PAID",
  "FAILED",
  "REFUNDED",
]);

export const fulfillmentMethodEnum = pgEnum("fulfillment_method", ["PICKUP", "DELIVERY"]);

export const sellerLedgerBucketEnum = pgEnum("seller_ledger_bucket", ["HELD", "AVAILABLE"]);
export const sellerLedgerDirectionEnum = pgEnum("seller_ledger_direction", ["CREDIT", "DEBIT"]);
export const sellerLedgerEntryTypeEnum = pgEnum("seller_ledger_entry_type", [
  "SALE_HELD",
  "SALE_RELEASED",
  "REFUND",
  "PAYOUT",
  "ADJUSTMENT",
]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

const adminCanRead = sql`exists (
  select 1 from public.profiles
  where id = ${authUid} and role = 'ADMIN' and status = 'ACTIVE'
)`;

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderNumber: text("order_number").notNull(),
    buyerId: uuid("buyer_id")
      .notNull()
      .references(() => buyerProfiles.userId, { onDelete: "restrict" }),
    status: orderStatusEnum("status").default("PENDING_PAYMENT").notNull(),
    paymentStatus: commercePaymentStatusEnum("payment_status").default("PENDING").notNull(),
    fulfillmentMethod: fulfillmentMethodEnum("fulfillment_method").notNull(),
    currency: text("currency").default("NGN").notNull(),
    productSubtotalMinor: bigint("product_subtotal_minor", { mode: "number" }).notNull(),
    actualDeliveryCostMinor: bigint("actual_delivery_cost_minor", { mode: "number" })
      .default(0)
      .notNull(),
    platformServiceComponentMinor: bigint("platform_service_component_minor", {
      mode: "number",
    })
      .default(0)
      .notNull(),
    deliveryTotalMinor: bigint("delivery_total_minor", { mode: "number" }).default(0).notNull(),
    totalMinor: bigint("total_minor", { mode: "number" }).notNull(),
    customerName: text("customer_name").notNull(),
    customerEmail: text("customer_email").notNull(),
    customerPhone: text("customer_phone"),
    cartFingerprint: text("cart_fingerprint").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("orders_order_number_unique").on(table.orderNumber),
    index("orders_buyer_created_idx").on(table.buyerId, table.createdAt),
    index("orders_buyer_pending_fingerprint_idx").on(
      table.buyerId,
      table.cartFingerprint,
      table.status,
      table.expiresAt,
    ),
    index("orders_status_created_idx").on(table.status, table.createdAt),
    check("orders_currency_ngn", sql`${table.currency} = 'NGN'`),
    check("orders_product_subtotal_positive", sql`${table.productSubtotalMinor} > 0`),
    check(
      "orders_delivery_components_nonnegative",
      sql`${table.actualDeliveryCostMinor} >= 0
        and ${table.platformServiceComponentMinor} >= 0
        and ${table.deliveryTotalMinor} >= 0`,
    ),
    check(
      "orders_delivery_total_exact",
      sql`${table.deliveryTotalMinor} = ${table.actualDeliveryCostMinor} + ${table.platformServiceComponentMinor}`,
    ),
    check(
      "orders_buyer_total_exact",
      sql`${table.totalMinor} = ${table.productSubtotalMinor} + ${table.deliveryTotalMinor}`,
    ),
    check(
      "orders_pickup_has_no_delivery_charge",
      sql`${table.fulfillmentMethod} <> 'PICKUP' or ${table.deliveryTotalMinor} = 0`,
    ),
    pgPolicy("orders_select_buyer_or_admin", {
      for: "select",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.buyerId} or ${adminCanRead}`,
    }),
  ],
).enableRLS();

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    sellerId: uuid("seller_id")
      .notNull()
      .references(() => sellerProfiles.userId, { onDelete: "restrict" }),
    productName: text("product_name").notNull(),
    productSlug: text("product_slug").notNull(),
    sku: text("sku").notNull(),
    unitPriceMinor: bigint("unit_price_minor", { mode: "number" }).notNull(),
    quantity: integer("quantity").notNull(),
    productTotalMinor: bigint("product_total_minor", { mode: "number" }).notNull(),
    sellerEntitlementMinor: bigint("seller_entitlement_minor", { mode: "number" }).notNull(),
    pickupCountry: text("pickup_country").notNull(),
    pickupState: text("pickup_state").notNull(),
    pickupCity: text("pickup_city").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("order_items_order_product_unique").on(table.orderId, table.productId),
    index("order_items_seller_created_idx").on(table.sellerId, table.createdAt),
    index("order_items_product_idx").on(table.productId),
    check("order_items_quantity_positive", sql`${table.quantity} > 0`),
    check("order_items_unit_price_positive", sql`${table.unitPriceMinor} > 0`),
    check(
      "order_items_product_total_exact",
      sql`${table.productTotalMinor} = ${table.unitPriceMinor} * ${table.quantity}`,
    ),
    check(
      "order_items_seller_gets_full_product_price",
      sql`${table.sellerEntitlementMinor} = ${table.productTotalMinor}`,
    ),
    pgPolicy("order_items_select_participant_or_admin", {
      for: "select",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.sellerId}
        or exists (
          select 1 from public.orders
          where id = ${table.orderId} and buyer_id = ${authUid}
        )
        or ${adminCanRead}`,
    }),
  ],
).enableRLS();

export const commercePayments = pgTable(
  "commerce_payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),
    provider: text("provider").default("KORA").notNull(),
    providerReference: text("provider_reference").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    status: commercePaymentStatusEnum("status").default("PENDING").notNull(),
    amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
    currency: text("currency").default("NGN").notNull(),
    checkoutUrl: text("checkout_url"),
    providerPayload: jsonb("provider_payload").default(sql`'{}'::jsonb`).notNull(),
    failureCode: text("failure_code"),
    failureMessage: text("failure_message"),
    initializedAt: timestamp("initialized_at", { withTimezone: true }),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("commerce_payments_provider_reference_unique").on(table.providerReference),
    uniqueIndex("commerce_payments_idempotency_key_unique").on(table.idempotencyKey),
    index("commerce_payments_order_created_idx").on(table.orderId, table.createdAt),
    check("commerce_payments_provider_kora", sql`${table.provider} = 'KORA'`),
    check("commerce_payments_amount_positive", sql`${table.amountMinor} > 0`),
    check("commerce_payments_currency_ngn", sql`${table.currency} = 'NGN'`),
    pgPolicy("commerce_payments_select_buyer_or_admin", {
      for: "select",
      to: authenticatedRole,
      using: sql`exists (
          select 1 from public.orders
          where id = ${table.orderId} and buyer_id = ${authUid}
        ) or ${adminCanRead}`,
    }),
  ],
).enableRLS();

export const commerceWebhookEvents = pgTable(
  "commerce_webhook_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    provider: text("provider").default("KORA").notNull(),
    payloadHash: text("payload_hash").notNull(),
    providerReference: text("provider_reference"),
    eventType: text("event_type"),
    processingStatus: text("processing_status").default("RECEIVED").notNull(),
    payload: jsonb("payload").notNull(),
    errorMessage: text("error_message"),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("commerce_webhook_events_payload_hash_unique").on(table.payloadHash),
    index("commerce_webhook_events_reference_idx").on(table.providerReference),
    check("commerce_webhook_events_provider_kora", sql`${table.provider} = 'KORA'`),
    check(
      "commerce_webhook_events_processing_status",
      sql`${table.processingStatus} in ('RECEIVED', 'PROCESSED', 'IGNORED', 'FAILED')`,
    ),
    pgPolicy("commerce_webhook_events_admin_read", {
      for: "select",
      to: authenticatedRole,
      using: adminCanRead,
    }),
  ],
).enableRLS();

export const sellerLedgerEntries = pgTable(
  "seller_ledger_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sellerId: uuid("seller_id")
      .notNull()
      .references(() => sellerProfiles.userId, { onDelete: "restrict" }),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),
    orderItemId: uuid("order_item_id")
      .notNull()
      .references(() => orderItems.id, { onDelete: "restrict" }),
    entryType: sellerLedgerEntryTypeEnum("entry_type").notNull(),
    bucket: sellerLedgerBucketEnum("bucket").notNull(),
    direction: sellerLedgerDirectionEnum("direction").notNull(),
    amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
    currency: text("currency").default("NGN").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    metadata: jsonb("metadata").default(sql`'{}'::jsonb`).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("seller_ledger_entries_idempotency_key_unique").on(table.idempotencyKey),
    index("seller_ledger_entries_seller_created_idx").on(table.sellerId, table.createdAt),
    index("seller_ledger_entries_order_idx").on(table.orderId),
    check("seller_ledger_entries_amount_positive", sql`${table.amountMinor} > 0`),
    check("seller_ledger_entries_currency_ngn", sql`${table.currency} = 'NGN'`),
    pgPolicy("seller_ledger_entries_select_owner_or_admin", {
      for: "select",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.sellerId} or ${adminCanRead}`,
    }),
  ],
).enableRLS();
