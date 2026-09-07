import { sql } from "drizzle-orm";
import {
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

import { profiles } from "@/db/schema/identity";

export const notificationKindEnum = pgEnum("notification_kind", [
  "ORDER",
  "LISTING",
  "REQUEST",
  "ACCOUNT",
  "SYSTEM",
]);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    kind: notificationKindEnum("kind").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    destination: text("destination").default("/").notNull(),
    dedupeKey: text("dedupe_key").notNull(),
    metadata: jsonb("metadata")
      .default(sql`'{}'::jsonb`)
      .notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("notifications_dedupe_key_unique").on(table.dedupeKey),
    index("notifications_user_created_idx").on(table.userId, table.createdAt),
    index("notifications_user_unread_idx").on(table.userId, table.readAt),
    check("notifications_title_length", sql`char_length(${table.title}) between 1 and 120`),
    check("notifications_body_length", sql`char_length(${table.body}) between 1 and 500`),
    check(
      "notifications_destination_internal",
      sql`${table.destination} ~ '^/[A-Za-z0-9_?&=%+./#-]*$'`,
    ),
    pgPolicy("notifications_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.userId}`,
    }),
    pgPolicy("notifications_mark_own_read", {
      for: "update",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.userId}`,
      withCheck: sql`${authUid} = ${table.userId}`,
    }),
  ],
).enableRLS();

export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull(),
    endpointHash: text("endpoint_hash").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    expirationTime: timestamp("expiration_time", { withTimezone: true }),
    deviceLabel: text("device_label").notNull(),
    userAgent: text("user_agent"),
    failureCount: integer("failure_count").default(0).notNull(),
    lastFailureAt: timestamp("last_failure_at", { withTimezone: true }),
    lastSuccessAt: timestamp("last_success_at", { withTimezone: true }),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("push_subscriptions_endpoint_hash_unique").on(table.endpointHash),
    index("push_subscriptions_user_idx").on(table.userId),
    check("push_subscriptions_endpoint_https", sql`${table.endpoint} like 'https://%'`),
    check("push_subscriptions_hash_format", sql`${table.endpointHash} ~ '^[a-f0-9]{64}$'`),
    check(
      "push_subscriptions_key_lengths",
      sql`char_length(${table.p256dh}) >= 20 and char_length(${table.auth}) >= 8`,
    ),
    check(
      "push_subscriptions_device_label_length",
      sql`char_length(${table.deviceLabel}) between 1 and 80`,
    ),
    check("push_subscriptions_failure_count_nonnegative", sql`${table.failureCount} >= 0`),
    pgPolicy("push_subscriptions_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.userId}`,
    }),
    pgPolicy("push_subscriptions_delete_own", {
      for: "delete",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.userId}`,
    }),
  ],
).enableRLS();
