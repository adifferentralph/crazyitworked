import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
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
import { profiles, sellerProfiles } from "@/db/schema/identity";

export const marketplaceReportTargetEnum = pgEnum("marketplace_report_target", [
  "PRODUCT",
  "MERCHANT",
]);
export const marketplaceReportStatusEnum = pgEnum("marketplace_report_status", [
  "PENDING",
  "UPHELD",
  "DISMISSED",
  "RESOLVED",
]);
export const trustScoreScopeEnum = pgEnum("trust_score_scope", ["PRODUCT", "SELLER"]);
export const trustScoreSourceEnum = pgEnum("trust_score_source", [
  "UPHELD_REPORT",
  "VERIFIED_PURCHASE_FEEDBACK",
  "MODERATION_CORRECTION",
]);
export const manualSellerVerificationStatusEnum = pgEnum(
  "manual_seller_verification_status",
  ["VERIFIED", "REVOKED"],
);

export const marketplaceReports = pgTable(
  "marketplace_reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reporterId: uuid("reporter_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "restrict" }),
    targetType: marketplaceReportTargetEnum("target_type").notNull(),
    targetKey: text("target_key").notNull(),
    productId: uuid("product_id").references(() => products.id, { onDelete: "restrict" }),
    sellerId: uuid("seller_id")
      .notNull()
      .references(() => sellerProfiles.userId, { onDelete: "restrict" }),
    reason: text("reason").notNull(),
    explanation: text("explanation"),
    status: marketplaceReportStatusEnum("status").default("PENDING").notNull(),
    moderatorId: uuid("moderator_id").references(() => profiles.id, { onDelete: "restrict" }),
    moderationReason: text("moderation_reason"),
    severity: text("severity"),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("marketplace_reports_status_created_idx").on(table.status, table.createdAt),
    index("marketplace_reports_product_idx").on(table.productId),
    index("marketplace_reports_seller_idx").on(table.sellerId),
    index("marketplace_reports_reporter_created_idx").on(table.reporterId, table.createdAt),
    uniqueIndex("marketplace_reports_reporter_pending_target_unique")
      .on(table.reporterId, table.targetKey)
      .where(sql`${table.status} = 'PENDING'`),
    check(
      "marketplace_reports_target_shape_check",
      sql`(${table.targetType} = 'PRODUCT' and ${table.productId} is not null and ${table.targetKey} = 'product:' || ${table.productId}::text)
        or (${table.targetType} = 'MERCHANT' and ${table.productId} is null and ${table.targetKey} = 'merchant:' || ${table.sellerId}::text)`,
    ),
    check("marketplace_reports_reason_length_check", sql`length(${table.reason}) between 3 and 80`),
    check(
      "marketplace_reports_explanation_length_check",
      sql`${table.explanation} is null or length(${table.explanation}) <= 2000`,
    ),
    pgPolicy("marketplace_reports_insert_own", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${authUid} = ${table.reporterId}`,
    }),
    pgPolicy("marketplace_reports_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.reporterId}`,
    }),
  ],
).enableRLS();

export const productTrustScores = pgTable(
  "product_trust_scores",
  {
    productId: uuid("product_id")
      .primaryKey()
      .references(() => products.id, { onDelete: "cascade" }),
    scoreHundredths: integer("score_hundredths").default(350).notNull(),
    eventCount: integer("event_count").default(0).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check("product_trust_scores_bounds_check", sql`${table.scoreHundredths} between 100 and 500`),
    check("product_trust_scores_event_count_check", sql`${table.eventCount} >= 0`),
  ],
).enableRLS();

export const sellerTrustScores = pgTable(
  "seller_trust_scores",
  {
    sellerId: uuid("seller_id")
      .primaryKey()
      .references(() => sellerProfiles.userId, { onDelete: "cascade" }),
    scoreHundredths: integer("score_hundredths").default(350).notNull(),
    eventCount: integer("event_count").default(0).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check("seller_trust_scores_bounds_check", sql`${table.scoreHundredths} between 100 and 500`),
    check("seller_trust_scores_event_count_check", sql`${table.eventCount} >= 0`),
  ],
).enableRLS();

export const trustScoreEvents = pgTable(
  "trust_score_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    scope: trustScoreScopeEnum("scope").notNull(),
    productId: uuid("product_id").references(() => products.id, { onDelete: "restrict" }),
    sellerId: uuid("seller_id")
      .notNull()
      .references(() => sellerProfiles.userId, { onDelete: "restrict" }),
    sourceType: trustScoreSourceEnum("source_type").notNull(),
    sourceId: text("source_id").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    deltaHundredths: integer("delta_hundredths").notNull(),
    reason: text("reason").notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => profiles.id, { onDelete: "restrict" }),
    reversedAt: timestamp("reversed_at", { withTimezone: true }),
    reversedBy: uuid("reversed_by").references(() => profiles.id, { onDelete: "restrict" }),
    reversalReason: text("reversal_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("trust_score_events_idempotency_unique").on(table.idempotencyKey),
    index("trust_score_events_product_idx").on(table.productId, table.createdAt),
    index("trust_score_events_seller_idx").on(table.sellerId, table.createdAt),
    check(
      "trust_score_events_scope_shape_check",
      sql`(${table.scope} = 'PRODUCT' and ${table.productId} is not null)
        or (${table.scope} = 'SELLER' and ${table.productId} is null)`,
    ),
    check("trust_score_events_delta_check", sql`${table.deltaHundredths} between -400 and 400 and ${table.deltaHundredths} <> 0`),
  ],
).enableRLS();

export const manualSellerVerifications = pgTable(
  "manual_seller_verifications",
  {
    sellerId: uuid("seller_id")
      .primaryKey()
      .references(() => sellerProfiles.userId, { onDelete: "restrict" }),
    status: manualSellerVerificationStatusEnum("status").notNull(),
    source: text("source").default("MANUAL_INSPECTION").notNull(),
    inspectionNotes: text("inspection_notes"),
    verifiedBy: uuid("verified_by")
      .notNull()
      .references(() => profiles.id, { onDelete: "restrict" }),
    verifiedAt: timestamp("verified_at", { withTimezone: true }).notNull(),
    revokedBy: uuid("revoked_by").references(() => profiles.id, { onDelete: "restrict" }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revocationReason: text("revocation_reason"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("manual_seller_verifications_status_idx").on(table.status),
    check("manual_seller_verifications_source_check", sql`${table.source} = 'MANUAL_INSPECTION'`),
    check(
      "manual_seller_verifications_revocation_check",
      sql`(${table.status} = 'VERIFIED' and ${table.revokedAt} is null and ${table.revokedBy} is null and ${table.revocationReason} is null)
        or (${table.status} = 'REVOKED' and ${table.revokedAt} is not null and ${table.revokedBy} is not null and length(${table.revocationReason}) >= 5)`,
    ),
  ],
).enableRLS();

export const manualSellerVerificationEvents = pgTable(
  "manual_seller_verification_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sellerId: uuid("seller_id")
      .notNull()
      .references(() => sellerProfiles.userId, { onDelete: "restrict" }),
    status: manualSellerVerificationStatusEnum("status").notNull(),
    source: text("source").default("MANUAL_INSPECTION").notNull(),
    notes: text("notes"),
    reason: text("reason"),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("manual_seller_verification_events_seller_idx").on(table.sellerId, table.createdAt)],
).enableRLS();

export const foundingMerchantAwards = pgTable(
  "founding_merchant_awards",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sellerId: uuid("seller_id")
      .notNull()
      .references(() => sellerProfiles.userId, { onDelete: "restrict" }),
    position: integer("position").notNull(),
    awardedAt: timestamp("awarded_at", { withTimezone: true }).defaultNow().notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revokedBy: uuid("revoked_by").references(() => profiles.id, { onDelete: "restrict" }),
    revocationReason: text("revocation_reason"),
  },
  (table) => [
    uniqueIndex("founding_merchant_awards_seller_unique").on(table.sellerId),
    uniqueIndex("founding_merchant_awards_position_unique").on(table.position),
    check("founding_merchant_awards_position_check", sql`${table.position} between 1 and 20`),
    check(
      "founding_merchant_awards_revocation_check",
      sql`(${table.revokedAt} is null and ${table.revokedBy} is null and ${table.revocationReason} is null)
        or (${table.revokedAt} is not null and ${table.revokedBy} is not null and length(${table.revocationReason}) >= 5)`,
    ),
  ],
).enableRLS();

export const foundingMerchantAwardEvents = pgTable(
  "founding_merchant_award_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    awardId: uuid("award_id")
      .notNull()
      .references(() => foundingMerchantAwards.id, { onDelete: "restrict" }),
    action: text("action").notNull(),
    actorId: uuid("actor_id").references(() => profiles.id, { onDelete: "restrict" }),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("founding_merchant_award_events_award_idx").on(table.awardId, table.createdAt),
    check("founding_merchant_award_events_action_check", sql`${table.action} in ('AWARDED', 'REVOKED')`),
  ],
).enableRLS();
