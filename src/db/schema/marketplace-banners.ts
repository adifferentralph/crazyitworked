import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { anonRole, authenticatedRole, authUid } from "drizzle-orm/supabase";

import { products } from "@/db/schema/catalog";
import { profiles } from "@/db/schema/identity";

export const marketplaceBannerPlacementEnum = pgEnum("marketplace_banner_placement", [
  "HOME_HERO",
  "HOME_MID",
  "CATEGORY",
]);

export const marketplaceBannerStatusEnum = pgEnum("marketplace_banner_status", [
  "DRAFT",
  "ACTIVE",
  "PAUSED",
  "ARCHIVED",
]);

const adminCanManage = sql`exists (
  select 1 from public.profiles
  where id = ${authUid} and role = 'ADMIN' and status = 'ACTIVE'
)`;

const publiclyVisible = (table: {
  status: unknown;
  startAt: unknown;
  endAt: unknown;
}) => sql`${table.status} = 'ACTIVE'
  and (${table.startAt} is null or ${table.startAt} <= now())
  and (${table.endAt} is null or ${table.endAt} > now())`;

export const marketplaceBanners = pgTable(
  "marketplace_banners",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    subtitle: text("subtitle"),
    imageUrl: text("image_url").notNull(),
    imagePath: text("image_path").notNull(),
    mobileImagePath: text("mobile_image_path"),
    mobileImageUrl: text("mobile_image_url"),
    ctaLabel: text("cta_label"),
    ctaUrl: text("cta_url"),
    placement: marketplaceBannerPlacementEnum("placement").notNull(),
    startAt: timestamp("start_at", { withTimezone: true }),
    endAt: timestamp("end_at", { withTimezone: true }),
    status: marketplaceBannerStatusEnum("status").default("DRAFT").notNull(),
    displayOrder: integer("display_order").default(0).notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => profiles.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("marketplace_banners_placement_schedule_idx").on(
      table.placement,
      table.status,
      table.displayOrder,
      table.startAt,
      table.endAt,
    ),
    check(
      "marketplace_banners_schedule_check",
      sql`${table.endAt} is null or ${table.startAt} is null or ${table.endAt} > ${table.startAt}`,
    ),
    check(
      "marketplace_banners_cta_pair_check",
      sql`(${table.ctaLabel} is null) = (${table.ctaUrl} is null)`,
    ),
    pgPolicy("marketplace_banners_read_public", {
      for: "select",
      to: anonRole,
      using: publiclyVisible(table),
    }),
    pgPolicy("marketplace_banners_read_authenticated", {
      for: "select",
      to: authenticatedRole,
      using: sql`${publiclyVisible(table)} or ${adminCanManage}`,
    }),
    pgPolicy("marketplace_banners_insert_admin", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${adminCanManage} and ${table.createdBy} = ${authUid}`,
    }),
    pgPolicy("marketplace_banners_update_admin", {
      for: "update",
      to: authenticatedRole,
      using: adminCanManage,
      withCheck: adminCanManage,
    }),
    pgPolicy("marketplace_banners_delete_admin", {
      for: "delete",
      to: authenticatedRole,
      using: adminCanManage,
    }),
  ],
).enableRLS();

export const productSponsorships = pgTable(
  "product_sponsorships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    startsAt: timestamp("starts_at", { withTimezone: true }).defaultNow().notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    isActive: boolean("is_active").default(true).notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => profiles.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("product_sponsorships_schedule_idx").on(
      table.productId,
      table.isActive,
      table.startsAt,
      table.endsAt,
    ),
    check(
      "product_sponsorships_schedule_check",
      sql`${table.endsAt} is null or ${table.endsAt} > ${table.startsAt}`,
    ),
    pgPolicy("product_sponsorships_read_public", {
      for: "select",
      to: anonRole,
      using: sql`${table.isActive} and ${table.startsAt} <= now()
        and (${table.endsAt} is null or ${table.endsAt} > now())`,
    }),
    pgPolicy("product_sponsorships_read_authenticated", {
      for: "select",
      to: authenticatedRole,
      using: sql`${table.isActive} and ${table.startsAt} <= now()
        and (${table.endsAt} is null or ${table.endsAt} > now()) or ${adminCanManage}`,
    }),
    pgPolicy("product_sponsorships_insert_admin", {
      for: "insert",
      to: authenticatedRole,
      withCheck: adminCanManage,
    }),
    pgPolicy("product_sponsorships_update_admin", {
      for: "update",
      to: authenticatedRole,
      using: adminCanManage,
      withCheck: adminCanManage,
    }),
    pgPolicy("product_sponsorships_delete_admin", {
      for: "delete",
      to: authenticatedRole,
      using: adminCanManage,
    }),
  ],
).enableRLS();
