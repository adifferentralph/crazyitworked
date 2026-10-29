import { sql } from "drizzle-orm";
import { check, index, integer, pgPolicy, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { anonRole, authenticatedRole, authUid } from "drizzle-orm/supabase";

import { products } from "@/db/schema/catalog";
import { buyerProfiles } from "@/db/schema/identity";
import { orderItems } from "@/db/schema/commerce";

export const productReviews = pgTable(
  "product_reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    buyerId: uuid("buyer_id")
      .notNull()
      .references(() => buyerProfiles.userId, { onDelete: "restrict" }),
    orderItemId: uuid("order_item_id")
      .notNull()
      .references(() => orderItems.id, { onDelete: "restrict" }),
    rating: integer("rating").notNull(),
    reviewerName: text("reviewer_name").notNull(),
    title: text("title"),
    body: text("body"),
    status: text("status").default("PUBLISHED").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("product_reviews_order_item_unique").on(table.orderItemId),
    index("product_reviews_product_status_idx").on(table.productId, table.status),
    check("product_reviews_rating_range", sql`${table.rating} between 1 and 5`),
    check("product_reviews_reviewer_name_present", sql`length(trim(${table.reviewerName})) between 2 and 80`),
    check("product_reviews_status_valid", sql`${table.status} in ('PUBLISHED', 'HIDDEN')`),
    pgPolicy("product_reviews_public_read", {
      for: "select",
      to: anonRole,
      using: sql`${table.status} = 'PUBLISHED'`,
    }),
    pgPolicy("product_reviews_authenticated_read", {
      for: "select",
      to: authenticatedRole,
      using: sql`${table.status} = 'PUBLISHED' or ${authUid} = ${table.buyerId}`,
    }),
    pgPolicy("product_reviews_insert_verified_buyer", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${authUid} = ${table.buyerId}
        and ${table.status} = 'PUBLISHED'
        and exists (
          select 1
          from public.order_items
          join public.orders on orders.id = order_items.order_id
          where order_items.id = ${table.orderItemId}
            and order_items.product_id = ${table.productId}
            and orders.buyer_id = ${authUid}
            and orders.status = 'COMPLETED'
        )`,
    }),
  ],
).enableRLS();
