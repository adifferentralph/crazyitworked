import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { authenticatedRole, authUid } from "drizzle-orm/supabase";

import { products, vehicleFitments } from "@/db/schema/catalog";
import { buyerProfiles } from "@/db/schema/identity";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const savedVehicles = pgTable(
  "saved_vehicles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    buyerId: uuid("buyer_id")
      .notNull()
      .references(() => buyerProfiles.userId, { onDelete: "cascade" }),
    fitmentId: uuid("fitment_id")
      .notNull()
      .references(() => vehicleFitments.id, { onDelete: "restrict" }),
    label: text("label"),
    registrationNumber: text("registration_number"),
    isDefault: boolean("is_default").default(false).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("saved_vehicles_buyer_fitment_unique").on(table.buyerId, table.fitmentId),
    uniqueIndex("saved_vehicles_one_default_per_buyer")
      .on(table.buyerId)
      .where(sql`${table.isDefault} = true`),
    index("saved_vehicles_buyer_updated_idx").on(table.buyerId, table.updatedAt),
    pgPolicy("saved_vehicles_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.buyerId}`,
    }),
    pgPolicy("saved_vehicles_insert_own", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${authUid} = ${table.buyerId}
        and exists (select 1 from public.buyer_profiles where user_id = ${authUid})`,
    }),
    pgPolicy("saved_vehicles_update_own", {
      for: "update",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.buyerId}`,
      withCheck: sql`${authUid} = ${table.buyerId}`,
    }),
    pgPolicy("saved_vehicles_delete_own", {
      for: "delete",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.buyerId}`,
    }),
  ],
).enableRLS();

export const savedParts = pgTable(
  "saved_parts",
  {
    buyerId: uuid("buyer_id")
      .notNull()
      .references(() => buyerProfiles.userId, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("saved_parts_buyer_product_unique").on(table.buyerId, table.productId),
    index("saved_parts_buyer_created_idx").on(table.buyerId, table.createdAt),
    pgPolicy("saved_parts_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.buyerId}`,
    }),
    pgPolicy("saved_parts_insert_own", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${authUid} = ${table.buyerId}
        and exists (select 1 from public.products where id = ${table.productId} and status = 'APPROVED')`,
    }),
    pgPolicy("saved_parts_delete_own", {
      for: "delete",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.buyerId}`,
    }),
  ],
).enableRLS();

export const cartItems = pgTable(
  "cart_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    buyerId: uuid("buyer_id")
      .notNull()
      .references(() => buyerProfiles.userId, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    quantity: integer("quantity").default(1).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("cart_items_buyer_product_unique").on(table.buyerId, table.productId),
    index("cart_items_buyer_updated_idx").on(table.buyerId, table.updatedAt),
    check("cart_items_quantity_positive", sql`${table.quantity} between 1 and 1000`),
    pgPolicy("cart_items_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.buyerId}`,
    }),
    pgPolicy("cart_items_insert_own", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${authUid} = ${table.buyerId}
        and exists (
          select 1 from public.products
          where id = ${table.productId}
            and status = 'APPROVED'
            and quantity - reserved_quantity >= ${table.quantity}
        )`,
    }),
    pgPolicy("cart_items_update_own", {
      for: "update",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.buyerId}`,
      withCheck: sql`${authUid} = ${table.buyerId}
        and exists (
          select 1 from public.products
          where id = ${table.productId}
            and status = 'APPROVED'
            and quantity - reserved_quantity >= ${table.quantity}
        )`,
    }),
    pgPolicy("cart_items_delete_own", {
      for: "delete",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.buyerId}`,
    }),
  ],
).enableRLS();