import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { authenticatedRole, authUid } from "drizzle-orm/supabase";

import { savedVehicles } from "@/db/schema/buyer-commerce";
import { productCategories, products, vehicleFitments } from "@/db/schema/catalog";
import { buyerProfiles, profiles, sellerProfiles } from "@/db/schema/identity";
import {
  partQuoteStatusEnum,
  partRequestStatusEnum,
  sellerRequestMatchStatusEnum,
} from "@/db/schema/rfq-enums";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const sellerCategories = pgTable(
  "seller_categories",
  {
    sellerId: uuid("seller_id")
      .notNull()
      .references(() => sellerProfiles.userId, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => productCategories.id, { onDelete: "restrict" }),
    isPrimary: boolean("is_primary").default(false).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("seller_categories_seller_category_unique").on(table.sellerId, table.categoryId),
    index("seller_categories_category_idx").on(table.categoryId, table.sellerId),
    pgPolicy("seller_categories_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.sellerId}`,
    }),
    pgPolicy("seller_categories_insert_own", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${authUid} = ${table.sellerId}`,
    }),
    pgPolicy("seller_categories_update_own", {
      for: "update",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.sellerId}`,
      withCheck: sql`${authUid} = ${table.sellerId}`,
    }),
    pgPolicy("seller_categories_delete_own", {
      for: "delete",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.sellerId}`,
    }),
  ],
).enableRLS();

export const partRequests = pgTable(
  "part_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    buyerId: uuid("buyer_id")
      .notNull()
      .references(() => buyerProfiles.userId, { onDelete: "restrict" }),
    savedVehicleId: uuid("saved_vehicle_id").references(() => savedVehicles.id, {
      onDelete: "set null",
    }),
    fitmentId: uuid("fitment_id").references(() => vehicleFitments.id, { onDelete: "restrict" }),
    categoryId: uuid("category_id").references(() => productCategories.id, {
      onDelete: "restrict",
    }),
    partName: text("part_name").notNull(),
    description: text("description").notNull(),
    oemPartNumber: text("oem_part_number"),
    manufacturerPartNumber: text("manufacturer_part_number"),
    quantity: integer("quantity").default(1).notNull(),
    conditionPreferences: text("condition_preferences")
      .array()
      .default(sql`'{}'::text[]`)
      .notNull(),
    budgetMinMinor: bigint("budget_min_minor", { mode: "number" }),
    budgetMaxMinor: bigint("budget_max_minor", { mode: "number" }),
    currency: text("currency").default("NGN").notNull(),
    deliveryState: text("delivery_state").notNull(),
    deliveryCity: text("delivery_city").notNull(),
    status: partRequestStatusEnum("status").default("DRAFT").notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("part_requests_buyer_status_idx").on(table.buyerId, table.status, table.updatedAt),
    index("part_requests_category_status_idx").on(table.categoryId, table.status, table.createdAt),
    index("part_requests_fitment_status_idx").on(table.fitmentId, table.status),
    check("part_requests_quantity_positive", sql`${table.quantity} between 1 and 1000`),
    check("part_requests_currency_ngn", sql`${table.currency} = 'NGN'`),
    check("part_requests_budget_min_positive", sql`${table.budgetMinMinor} is null or ${table.budgetMinMinor} > 0`),
    check("part_requests_budget_max_positive", sql`${table.budgetMaxMinor} is null or ${table.budgetMaxMinor} > 0`),
    check(
      "part_requests_budget_range",
      sql`${table.budgetMinMinor} is null or ${table.budgetMaxMinor} is null or ${table.budgetMaxMinor} >= ${table.budgetMinMinor}`,
    ),
    pgPolicy("part_requests_select_permitted", {
      for: "select",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.buyerId}
        or exists (
          select 1 from public.seller_request_matches
          where request_id = ${table.id} and seller_id = ${authUid}
        )`,
    }),
    pgPolicy("part_requests_insert_own", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${authUid} = ${table.buyerId} and ${table.status} = 'DRAFT'`,
    }),
    pgPolicy("part_requests_update_own", {
      for: "update",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.buyerId}`,
      withCheck: sql`${authUid} = ${table.buyerId} and ${table.status} in ('DRAFT', 'OPEN', 'CANCELLED')`,
    }),
  ],
).enableRLS();

export const sellerRequestMatches = pgTable(
  "seller_request_matches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => partRequests.id, { onDelete: "cascade" }),
    sellerId: uuid("seller_id")
      .notNull()
      .references(() => sellerProfiles.userId, { onDelete: "cascade" }),
    categoryMatched: boolean("category_matched").default(false).notNull(),
    locationMatched: boolean("location_matched").default(false).notNull(),
    status: sellerRequestMatchStatusEnum("status").default("MATCHED").notNull(),
    matchedAt: timestamp("matched_at", { withTimezone: true }).defaultNow().notNull(),
    viewedAt: timestamp("viewed_at", { withTimezone: true }),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("seller_request_matches_request_seller_unique").on(table.requestId, table.sellerId),
    index("seller_request_matches_seller_status_idx").on(table.sellerId, table.status, table.createdAt),
    pgPolicy("seller_request_matches_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.sellerId}`,
    }),
    pgPolicy("seller_request_matches_update_own", {
      for: "update",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.sellerId}`,
      withCheck: sql`${authUid} = ${table.sellerId} and ${table.status} in ('VIEWED', 'QUOTED', 'DECLINED')`,
    }),
  ],
).enableRLS();

export const partRequestQuotes = pgTable(
  "part_request_quotes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => partRequests.id, { onDelete: "restrict" }),
    sellerId: uuid("seller_id")
      .notNull()
      .references(() => sellerProfiles.userId, { onDelete: "restrict" }),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    quantity: integer("quantity").notNull(),
    unitPriceMinor: bigint("unit_price_minor", { mode: "number" }).notNull(),
    deliveryFeeMinor: bigint("delivery_fee_minor", { mode: "number" }).default(0).notNull(),
    currency: text("currency").default("NGN").notNull(),
    estimatedDeliveryDays: integer("estimated_delivery_days"),
    notes: text("notes"),
    status: partQuoteStatusEnum("status").default("SUBMITTED").notNull(),
    validUntil: timestamp("valid_until", { withTimezone: true }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("part_request_quotes_request_seller_unique").on(table.requestId, table.sellerId),
    index("part_request_quotes_request_status_idx").on(table.requestId, table.status, table.createdAt),
    index("part_request_quotes_seller_status_idx").on(table.sellerId, table.status, table.updatedAt),
    check("part_request_quotes_quantity_positive", sql`${table.quantity} between 1 and 1000`),
    check("part_request_quotes_unit_price_positive", sql`${table.unitPriceMinor} > 0`),
    check("part_request_quotes_delivery_fee_nonnegative", sql`${table.deliveryFeeMinor} >= 0`),
    check("part_request_quotes_currency_ngn", sql`${table.currency} = 'NGN'`),
    check("part_request_quotes_delivery_days_positive", sql`${table.estimatedDeliveryDays} is null or ${table.estimatedDeliveryDays} between 1 and 365`),
    pgPolicy("part_request_quotes_select_permitted", {
      for: "select",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.sellerId}
        or exists (
          select 1 from public.part_requests
          where id = ${table.requestId} and buyer_id = ${authUid}
        )`,
    }),
    pgPolicy("part_request_quotes_insert_matched_seller", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${authUid} = ${table.sellerId}
        and ${table.status} = 'SUBMITTED'
        and exists (
          select 1 from public.seller_request_matches
          where request_id = ${table.requestId} and seller_id = ${authUid}
        )`,
    }),
    pgPolicy("part_request_quotes_update_own", {
      for: "update",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.sellerId}`,
      withCheck: sql`${authUid} = ${table.sellerId} and ${table.status} in ('SUBMITTED', 'REVISED', 'WITHDRAWN')`,
    }),
  ],
).enableRLS();

export const partRequestImages = pgTable(
  "part_request_images",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => partRequests.id, { onDelete: "cascade" }),
    storageBucket: text("storage_bucket").default("request-media").notNull(),
    storagePath: text("storage_path").notNull(),
    originalFilename: text("original_filename").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    uploadedBy: uuid("uploaded_by")
      .notNull()
      .references(() => profiles.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("part_request_images_storage_path_unique").on(table.storagePath),
    index("part_request_images_request_created_idx").on(table.requestId, table.createdAt),
    check("part_request_images_size_positive", sql`${table.sizeBytes} > 0`),
    pgPolicy("part_request_images_select_permitted", {
      for: "select",
      to: authenticatedRole,
      using: sql`exists (
        select 1 from public.part_requests
        where id = ${table.requestId} and buyer_id = ${authUid}
      ) or exists (
        select 1 from public.seller_request_matches
        where request_id = ${table.requestId} and seller_id = ${authUid}
      )`,
    }),
    pgPolicy("part_request_images_insert_owner", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${authUid} = ${table.uploadedBy}
        and exists (
          select 1 from public.part_requests
          where id = ${table.requestId} and buyer_id = ${authUid} and status in ('DRAFT', 'OPEN')
        )`,
    }),
  ],
).enableRLS();

export const partRequestEvents = pgTable(
  "part_request_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => partRequests.id, { onDelete: "cascade" }),
    actorUserId: uuid("actor_user_id").references(() => profiles.id, { onDelete: "set null" }),
    eventType: text("event_type").notNull(),
    metadata: jsonb("metadata").default(sql`'{}'::jsonb`).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("part_request_events_request_created_idx").on(table.requestId, table.createdAt),
    pgPolicy("part_request_events_select_permitted", {
      for: "select",
      to: authenticatedRole,
      using: sql`exists (
        select 1 from public.part_requests
        where id = ${table.requestId} and buyer_id = ${authUid}
      ) or exists (
        select 1 from public.seller_request_matches
        where request_id = ${table.requestId} and seller_id = ${authUid}
      )`,
    }),
  ],
).enableRLS();