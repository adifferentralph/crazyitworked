import { sql } from "drizzle-orm";
import {
  boolean,
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

import { buyerProfiles, profiles, sellerProfiles } from "@/db/schema/identity";
import {
  demandEventTypeEnum,
  fitmentEventTypeEnum,
  fitmentEvidenceTypeEnum,
  fitmentOutcomeStatusEnum,
  fitmentTransactionSourceEnum,
} from "@/db/schema/marketplace-enums";
import {
  productCategories,
  products,
  vehicleFitments,
} from "@/db/schema/catalog";
import { partRequests } from "@/db/schema/rfq";

export const fitmentClaimHistory = pgTable(
  "fitment_claim_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    fitmentId: uuid("fitment_id").references(() => vehicleFitments.id, { onDelete: "set null" }),
    sellerId: uuid("seller_id")
      .notNull()
      .references(() => sellerProfiles.userId, { onDelete: "restrict" }),
    action: text("action").notNull(),
    previousEvidence: fitmentEvidenceTypeEnum("previous_evidence"),
    newEvidence: fitmentEvidenceTypeEnum("new_evidence"),
    previousActive: boolean("previous_active"),
    newActive: boolean("new_active"),
    vehicleSnapshot: jsonb("vehicle_snapshot").default(sql`'{}'::jsonb`).notNull(),
    changedByUserId: uuid("changed_by_user_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    reason: text("reason"),
    metadata: jsonb("metadata").default(sql`'{}'::jsonb`).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("fitment_claim_history_product_created_idx").on(table.productId, table.createdAt),
    index("fitment_claim_history_seller_created_idx").on(table.sellerId, table.createdAt),
    pgPolicy("fitment_claim_history_seller_read", {
      for: "select",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.sellerId}`,
    }),
  ],
).enableRLS();

export const fitmentTransactionSnapshots = pgTable(
  "fitment_transaction_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    source: fitmentTransactionSourceEnum("source").notNull(),
    sourceReferenceId: uuid("source_reference_id").notNull(),
    buyerId: uuid("buyer_id")
      .notNull()
      .references(() => buyerProfiles.userId, { onDelete: "restrict" }),
    sellerId: uuid("seller_id")
      .notNull()
      .references(() => sellerProfiles.userId, { onDelete: "restrict" }),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    fitmentId: uuid("fitment_id").references(() => vehicleFitments.id, { onDelete: "set null" }),
    categoryId: uuid("category_id").references(() => productCategories.id, { onDelete: "set null" }),
    productSnapshot: jsonb("product_snapshot").default(sql`'{}'::jsonb`).notNull(),
    vehicleSnapshot: jsonb("vehicle_snapshot").default(sql`'{}'::jsonb`).notNull(),
    eligibleAt: timestamp("eligible_at", { withTimezone: true }),
    fulfilledAt: timestamp("fulfilled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("fitment_transaction_source_reference_unique").on(table.source, table.sourceReferenceId),
    index("fitment_transaction_buyer_eligible_idx").on(table.buyerId, table.eligibleAt),
    index("fitment_transaction_seller_created_idx").on(table.sellerId, table.createdAt),
    index("fitment_transaction_product_idx").on(table.productId),
    pgPolicy("fitment_transaction_buyer_read", {
      for: "select",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.buyerId}`,
    }),
    pgPolicy("fitment_transaction_seller_read", {
      for: "select",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.sellerId}`,
    }),
  ],
).enableRLS();

export const fitmentOutcomes = pgTable(
  "fitment_outcomes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    snapshotId: uuid("snapshot_id")
      .notNull()
      .references(() => fitmentTransactionSnapshots.id, { onDelete: "restrict" }),
    buyerId: uuid("buyer_id")
      .notNull()
      .references(() => buyerProfiles.userId, { onDelete: "restrict" }),
    outcome: fitmentOutcomeStatusEnum("outcome").notNull(),
    note: text("note"),
    metadata: jsonb("metadata").default(sql`'{}'::jsonb`).notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("fitment_outcomes_snapshot_unique").on(table.snapshotId),
    index("fitment_outcomes_buyer_created_idx").on(table.buyerId, table.createdAt),
    index("fitment_outcomes_outcome_created_idx").on(table.outcome, table.createdAt),
    pgPolicy("fitment_outcomes_buyer_read", {
      for: "select",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.buyerId}`,
    }),
  ],
).enableRLS();

export const fitmentEvents = pgTable(
  "fitment_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventType: fitmentEventTypeEnum("event_type").notNull(),
    snapshotId: uuid("snapshot_id").references(() => fitmentTransactionSnapshots.id, {
      onDelete: "set null",
    }),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    fitmentId: uuid("fitment_id").references(() => vehicleFitments.id, { onDelete: "set null" }),
    sellerId: uuid("seller_id").references(() => sellerProfiles.userId, { onDelete: "set null" }),
    buyerId: uuid("buyer_id").references(() => buyerProfiles.userId, { onDelete: "set null" }),
    categoryId: uuid("category_id").references(() => productCategories.id, { onDelete: "set null" }),
    createdByUserId: uuid("created_by_user_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    vehicleSnapshot: jsonb("vehicle_snapshot").default(sql`'{}'::jsonb`).notNull(),
    productSnapshot: jsonb("product_snapshot").default(sql`'{}'::jsonb`).notNull(),
    metadata: jsonb("metadata").default(sql`'{}'::jsonb`).notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("fitment_events_seller_occurred_idx").on(table.sellerId, table.occurredAt),
    index("fitment_events_product_occurred_idx").on(table.productId, table.occurredAt),
    index("fitment_events_fitment_occurred_idx").on(table.fitmentId, table.occurredAt),
    index("fitment_events_event_occurred_idx").on(table.eventType, table.occurredAt),
  ],
).enableRLS();

export const demandEvents = pgTable(
  "demand_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventType: demandEventTypeEnum("event_type").notNull(),
    eventToken: uuid("event_token").notNull(),
    anonymousSessionHash: text("anonymous_session_hash").notNull(),
    buyerId: uuid("buyer_id").references(() => buyerProfiles.userId, { onDelete: "set null" }),
    buyerAccountType: text("buyer_account_type").notNull(),
    requestId: uuid("request_id").references(() => partRequests.id, { onDelete: "set null" }),
    categoryId: uuid("category_id").references(() => productCategories.id, { onDelete: "set null" }),
    fitmentId: uuid("fitment_id").references(() => vehicleFitments.id, { onDelete: "set null" }),
    query: text("query"),
    location: text("location"),
    vehicleMake: text("vehicle_make"),
    vehicleModel: text("vehicle_model"),
    vehicleYear: integer("vehicle_year"),
    resultCount: integer("result_count"),
    metadata: jsonb("metadata").default(sql`'{}'::jsonb`).notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("demand_events_event_token_unique").on(table.eventToken),
    index("demand_events_type_occurred_idx").on(table.eventType, table.occurredAt),
    index("demand_events_vehicle_idx").on(table.vehicleMake, table.vehicleModel, table.vehicleYear),
    index("demand_events_category_location_idx").on(table.categoryId, table.location),
  ],
).enableRLS();