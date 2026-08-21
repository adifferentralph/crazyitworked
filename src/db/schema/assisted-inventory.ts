import { sql } from "drizzle-orm";
import {
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

import { products } from "@/db/schema/catalog";
import { profiles, sellerProfiles } from "@/db/schema/identity";
import {
  inventoryImportRowStatusEnum,
  inventoryImportStatusEnum,
} from "@/db/schema/marketplace-enums";

export const inventoryImports = pgTable(
  "inventory_imports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sellerId: uuid("seller_id")
      .notNull()
      .references(() => sellerProfiles.userId, { onDelete: "restrict" }),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "restrict" }),
    fileName: text("file_name").notNull(),
    fileSha256: text("file_sha256").notNull(),
    status: inventoryImportStatusEnum("status").default("VALIDATING").notNull(),
    totalRows: integer("total_rows").default(0).notNull(),
    validRows: integer("valid_rows").default(0).notNull(),
    invalidRows: integer("invalid_rows").default(0).notNull(),
    duplicateRows: integer("duplicate_rows").default(0).notNull(),
    importedRows: integer("imported_rows").default(0).notNull(),
    metadata: jsonb("metadata").default(sql`'{}'::jsonb`).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("inventory_imports_seller_hash_unique").on(table.sellerId, table.fileSha256),
    index("inventory_imports_seller_created_idx").on(table.sellerId, table.createdAt),
    index("inventory_imports_status_created_idx").on(table.status, table.createdAt),
    pgPolicy("inventory_imports_select_authorized", {
      for: "select",
      to: authenticatedRole,
      using: sql`public.has_permission('assist_seller_inventory')`,
    }),
    pgPolicy("inventory_imports_insert_authorized", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${table.createdByUserId} = ${authUid} and public.has_permission('assist_seller_inventory')`,
    }),
    pgPolicy("inventory_imports_update_creator", {
      for: "update",
      to: authenticatedRole,
      using: sql`${table.createdByUserId} = ${authUid} and public.has_permission('assist_seller_inventory')`,
      withCheck: sql`${table.createdByUserId} = ${authUid} and public.has_permission('assist_seller_inventory')`,
    }),
  ],
).enableRLS();

export const inventoryImportRows = pgTable(
  "inventory_import_rows",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    importId: uuid("import_id")
      .notNull()
      .references(() => inventoryImports.id, { onDelete: "cascade" }),
    rowNumber: integer("row_number").notNull(),
    status: inventoryImportRowStatusEnum("status").notNull(),
    rawData: jsonb("raw_data").default(sql`'{}'::jsonb`).notNull(),
    normalizedData: jsonb("normalized_data").default(sql`'{}'::jsonb`).notNull(),
    validationErrors: text("validation_errors").array().default(sql`'{}'::text[]`).notNull(),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    importedAt: timestamp("imported_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("inventory_import_rows_import_row_unique").on(table.importId, table.rowNumber),
    index("inventory_import_rows_status_idx").on(table.importId, table.status),
    pgPolicy("inventory_import_rows_select_authorized", {
      for: "select",
      to: authenticatedRole,
      using: sql`public.has_permission('assist_seller_inventory')`,
    }),
    pgPolicy("inventory_import_rows_insert_creator", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`public.has_permission('assist_seller_inventory') and exists (
        select 1 from public.inventory_imports
        where id = ${table.importId} and created_by_user_id = ${authUid}
      )`,
    }),
    pgPolicy("inventory_import_rows_update_creator", {
      for: "update",
      to: authenticatedRole,
      using: sql`public.has_permission('assist_seller_inventory') and exists (
        select 1 from public.inventory_imports
        where id = ${table.importId} and created_by_user_id = ${authUid}
      )`,
      withCheck: sql`public.has_permission('assist_seller_inventory') and exists (
        select 1 from public.inventory_imports
        where id = ${table.importId} and created_by_user_id = ${authUid}
      )`,
    }),
  ],
).enableRLS();