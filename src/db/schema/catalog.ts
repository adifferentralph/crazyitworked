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
  pgView,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { authenticatedRole, authUid } from "drizzle-orm/supabase";

import { profiles, sellerProfiles } from "@/db/schema/identity";
import {
  inventoryTransactionTypeEnum,
  mediaHistoryActionEnum,
  productConditionEnum,
  productImageSourceEnum,
  productImageTypeEnum,
  productStatusEnum,
  sellerVerificationStatusEnum,
} from "@/db/schema/marketplace-enums";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const sellerVerifications = pgTable(
  "seller_verifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sellerId: uuid("seller_id")
      .notNull()
      .references(() => sellerProfiles.userId, { onDelete: "cascade" }),
    status: sellerVerificationStatusEnum("status").default("DRAFT").notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewedBy: uuid("reviewed_by").references(() => profiles.id, { onDelete: "set null" }),
    rejectionReason: text("rejection_reason"),
    metadata: jsonb("metadata")
      .default(sql`'{}'::jsonb`)
      .notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("seller_verifications_seller_unique").on(table.sellerId),
    index("seller_verifications_status_idx").on(table.status),
    pgPolicy("seller_verifications_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.sellerId}`,
    }),
    pgPolicy("seller_verifications_insert_own", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${authUid} = ${table.sellerId}`,
    }),
    pgPolicy("seller_verifications_update_own", {
      for: "update",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.sellerId}`,
      withCheck: sql`${authUid} = ${table.sellerId}`,
    }),
  ],
).enableRLS();

export const productCategories = pgTable(
  "product_categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    parentId: uuid("parent_id").references((): AnyPgColumn => productCategories.id, {
      onDelete: "restrict",
    }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    position: integer("position").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("product_categories_slug_unique").on(table.slug),
    uniqueIndex("product_categories_parent_name_unique").on(
      table.parentId,
      sql`lower(${table.name})`,
    ),
    index("product_categories_parent_idx").on(table.parentId, table.position),
    pgPolicy("product_categories_read_authenticated", {
      for: "select",
      to: authenticatedRole,
      using: sql`${table.isActive} = true`,
    }),
  ],
).enableRLS();

export const vehicleMakes = pgTable(
  "vehicle_makes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("vehicle_makes_name_unique").on(sql`lower(${table.name})`),
    uniqueIndex("vehicle_makes_slug_unique").on(table.slug),
    pgPolicy("vehicle_makes_read_authenticated", {
      for: "select",
      to: authenticatedRole,
      using: sql`${table.isActive} = true`,
    }),
  ],
).enableRLS();

export const vehicleModels = pgTable(
  "vehicle_models",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    makeId: uuid("make_id")
      .notNull()
      .references(() => vehicleMakes.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("vehicle_models_make_name_unique").on(table.makeId, sql`lower(${table.name})`),
    uniqueIndex("vehicle_models_make_slug_unique").on(table.makeId, table.slug),
    index("vehicle_models_make_idx").on(table.makeId),
    pgPolicy("vehicle_models_read_authenticated", {
      for: "select",
      to: authenticatedRole,
      using: sql`${table.isActive} = true`,
    }),
  ],
).enableRLS();

export const vehicleGenerations = pgTable(
  "vehicle_generations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    modelId: uuid("model_id")
      .notNull()
      .references(() => vehicleModels.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    startYear: integer("start_year").notNull(),
    endYear: integer("end_year"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("vehicle_generations_model_name_unique").on(
      table.modelId,
      sql`lower(${table.name})`,
    ),
    index("vehicle_generations_model_idx").on(table.modelId),
    check("vehicle_generations_year_range_check", sql`${table.startYear} between 1950 and 2100`),
    check(
      "vehicle_generations_end_year_check",
      sql`${table.endYear} is null or ${table.endYear} >= ${table.startYear}`,
    ),
    pgPolicy("vehicle_generations_read_authenticated", {
      for: "select",
      to: authenticatedRole,
      using: sql`true`,
    }),
  ],
).enableRLS();

export const vehicleYears = pgTable(
  "vehicle_years",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    modelId: uuid("model_id")
      .notNull()
      .references(() => vehicleModels.id, { onDelete: "restrict" }),
    generationId: uuid("generation_id").references(() => vehicleGenerations.id, {
      onDelete: "restrict",
    }),
    year: integer("year").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("vehicle_years_model_year_unique").on(table.modelId, table.year),
    index("vehicle_years_generation_idx").on(table.generationId),
    check("vehicle_years_value_check", sql`${table.year} between 1950 and 2100`),
    pgPolicy("vehicle_years_read_authenticated", {
      for: "select",
      to: authenticatedRole,
      using: sql`true`,
    }),
  ],
).enableRLS();

export const vehicleTrims = pgTable(
  "vehicle_trims",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    modelId: uuid("model_id")
      .notNull()
      .references(() => vehicleModels.id, { onDelete: "restrict" }),
    generationId: uuid("generation_id").references(() => vehicleGenerations.id, {
      onDelete: "restrict",
    }),
    name: text("name").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("vehicle_trims_model_generation_name_unique").on(
      table.modelId,
      table.generationId,
      sql`lower(${table.name})`,
    ),
    index("vehicle_trims_model_idx").on(table.modelId),
    pgPolicy("vehicle_trims_read_authenticated", {
      for: "select",
      to: authenticatedRole,
      using: sql`true`,
    }),
  ],
).enableRLS();

export const engines = pgTable(
  "engines",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: text("code"),
    name: text("name").notNull(),
    fuelType: text("fuel_type"),
    displacementCc: integer("displacement_cc"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("engines_name_code_unique").on(sql`lower(${table.name})`, table.code),
    pgPolicy("engines_read_authenticated", {
      for: "select",
      to: authenticatedRole,
      using: sql`true`,
    }),
  ],
).enableRLS();

export const transmissions = pgTable(
  "transmissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("transmissions_code_unique").on(table.code),
    pgPolicy("transmissions_read_authenticated", {
      for: "select",
      to: authenticatedRole,
      using: sql`true`,
    }),
  ],
).enableRLS();

export const drivetrains = pgTable(
  "drivetrains",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("drivetrains_code_unique").on(table.code),
    pgPolicy("drivetrains_read_authenticated", {
      for: "select",
      to: authenticatedRole,
      using: sql`true`,
    }),
  ],
).enableRLS();

export const vehicleFitments = pgTable(
  "vehicle_fitments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    makeId: uuid("make_id")
      .notNull()
      .references(() => vehicleMakes.id, { onDelete: "restrict" }),
    modelId: uuid("model_id")
      .notNull()
      .references(() => vehicleModels.id, { onDelete: "restrict" }),
    generationId: uuid("generation_id").references(() => vehicleGenerations.id, {
      onDelete: "restrict",
    }),
    yearId: uuid("year_id")
      .notNull()
      .references(() => vehicleYears.id, { onDelete: "restrict" }),
    trimId: uuid("trim_id").references(() => vehicleTrims.id, { onDelete: "restrict" }),
    engineId: uuid("engine_id").references(() => engines.id, { onDelete: "restrict" }),
    transmissionId: uuid("transmission_id").references(() => transmissions.id, {
      onDelete: "restrict",
    }),
    drivetrainId: uuid("drivetrain_id").references(() => drivetrains.id, {
      onDelete: "restrict",
    }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("vehicle_fitments_configuration_unique").on(
      table.makeId,
      table.modelId,
      table.yearId,
      table.trimId,
      table.engineId,
      table.transmissionId,
      table.drivetrainId,
    ),
    index("vehicle_fitments_lookup_idx").on(table.makeId, table.modelId, table.yearId),
    pgPolicy("vehicle_fitments_read_authenticated", {
      for: "select",
      to: authenticatedRole,
      using: sql`true`,
    }),
  ],
).enableRLS();

export const products = pgTable(
  "products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sellerId: uuid("seller_id")
      .notNull()
      .references(() => sellerProfiles.userId, { onDelete: "restrict" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => productCategories.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description").notNull(),
    condition: productConditionEnum("condition").notNull(),
    brand: text("brand").notNull(),
    oemPartNumber: text("oem_part_number"),
    manufacturerPartNumber: text("manufacturer_part_number"),
    sku: text("sku").notNull(),
    priceMinor: bigint("price_minor", { mode: "number" }).notNull(),
    currency: text("currency").default("NGN").notNull(),
    quantity: integer("quantity").default(0).notNull(),
    reservedQuantity: integer("reserved_quantity").default(0).notNull(),
    country: text("country").default("Nigeria").notNull(),
    state: text("state").notNull(),
    city: text("city").notNull(),
    pickupAvailable: boolean("pickup_available").default(false).notNull(),
    deliveryAvailable: boolean("delivery_available").default(true).notNull(),
    status: productStatusEnum("status").default("DRAFT").notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    version: integer("version").default(1).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("products_slug_unique").on(table.slug),
    uniqueIndex("products_seller_sku_unique").on(table.sellerId, sql`lower(${table.sku})`),
    index("products_seller_status_idx").on(table.sellerId, table.status),
    index("products_category_status_idx").on(table.categoryId, table.status),
    index("products_name_idx").on(sql`lower(${table.name})`),
    index("products_oem_idx").on(sql`lower(${table.oemPartNumber})`),
    index("products_manufacturer_part_idx").on(sql`lower(${table.manufacturerPartNumber})`),
    index("products_created_idx").on(table.createdAt),
    check("products_price_minor_positive", sql`${table.priceMinor} > 0`),
    check("products_currency_ngn", sql`${table.currency} = 'NGN'`),
    check("products_quantity_nonnegative", sql`${table.quantity} >= 0`),
    check("products_reserved_nonnegative", sql`${table.reservedQuantity} >= 0`),
    check("products_reserved_within_quantity", sql`${table.reservedQuantity} <= ${table.quantity}`),
    check(
      "products_fulfilment_available",
      sql`${table.pickupAvailable} = true or ${table.deliveryAvailable} = true`,
    ),
    pgPolicy("products_select_seller_or_approved", {
      for: "select",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.sellerId} or ${table.status} = 'APPROVED'`,
    }),
    pgPolicy("products_insert_own", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${authUid} = ${table.sellerId}
        and ${table.status} = 'DRAFT'
        and ${table.submittedAt} is null
        and ${table.publishedAt} is null
        and ${table.reservedQuantity} = 0
        and exists (
          select 1 from public.seller_profiles
          where user_id = ${authUid} and onboarding_completed_at is not null
        )`,
    }),
    pgPolicy("products_update_own", {
      for: "update",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.sellerId}`,
      withCheck: sql`${authUid} = ${table.sellerId}`,
    }),
  ],
).enableRLS();

export const marketplaceSellers = pgView("marketplace_sellers", {
  sellerId: uuid("seller_id").notNull(),
  storeName: text("store_name").notNull(),
  slug: text("slug").notNull(),
  sellerStatus: text("seller_status").notNull(),
  verificationStatus: text("verification_status").notNull(),
  country: text("country").notNull(),
  state: text("state"),
  city: text("city"),
}).with({ securityBarrier: true }).as(sql`
  select distinct
    seller_profiles.user_id as seller_id,
    seller_profiles.store_name,
    seller_profiles.slug,
    seller_profiles.status::text as seller_status,
    coalesce(seller_verifications.status::text, 'DRAFT') as verification_status,
    seller_profiles.country,
    seller_profiles.state,
    seller_profiles.city
  from ${sellerProfiles} as seller_profiles
  join ${products} as products on products.seller_id = seller_profiles.user_id
  left join ${sellerVerifications} as seller_verifications
    on seller_verifications.seller_id = seller_profiles.user_id
  where products.status = 'APPROVED'
`);
export const productCrossReferences = pgTable(
  "product_cross_references",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    referenceNumber: text("reference_number").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("product_cross_references_product_number_unique").on(
      table.productId,
      sql`lower(${table.referenceNumber})`,
    ),
    index("product_cross_references_number_idx").on(sql`lower(${table.referenceNumber})`),
    pgPolicy("product_cross_references_select_product", {
      for: "select",
      to: authenticatedRole,
      using: sql`exists (select 1 from public.products where id = ${table.productId})`,
    }),
    pgPolicy("product_cross_references_write_own", {
      for: "all",
      to: authenticatedRole,
      using: sql`exists (select 1 from public.products where id = ${table.productId} and seller_id = ${authUid})`,
      withCheck: sql`exists (select 1 from public.products where id = ${table.productId} and seller_id = ${authUid})`,
    }),
  ],
).enableRLS();

export const productFitments = pgTable(
  "product_fitments",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    fitmentId: uuid("fitment_id")
      .notNull()
      .references(() => vehicleFitments.id, { onDelete: "restrict" }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("product_fitments_product_fitment_unique").on(table.productId, table.fitmentId),
    index("product_fitments_fitment_idx").on(table.fitmentId),
    pgPolicy("product_fitments_select_product", {
      for: "select",
      to: authenticatedRole,
      using: sql`exists (select 1 from public.products where id = ${table.productId})`,
    }),
    pgPolicy("product_fitments_write_own", {
      for: "all",
      to: authenticatedRole,
      using: sql`exists (select 1 from public.products where id = ${table.productId} and seller_id = ${authUid})`,
      withCheck: sql`exists (select 1 from public.products where id = ${table.productId} and seller_id = ${authUid})`,
    }),
  ],
).enableRLS();

export const productImages = pgTable(
  "product_images",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    storageBucket: text("storage_bucket").default("product-media").notNull(),
    storagePath: text("storage_path").notNull(),
    type: productImageTypeEnum("type").notNull(),
    position: integer("position").default(0).notNull(),
    isPrimary: boolean("is_primary").default(false).notNull(),
    isActualItem: boolean("is_actual_item").default(false).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    uploadedBy: uuid("uploaded_by")
      .notNull()
      .references(() => profiles.id, { onDelete: "restrict" }),
    source: productImageSourceEnum("source").default("SELLER_ORIGINAL").notNull(),
    originalFilename: text("original_filename").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    metadata: jsonb("metadata")
      .default(sql`'{}'::jsonb`)
      .notNull(),
    deactivatedAt: timestamp("deactivated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("product_images_storage_path_unique").on(table.storagePath),
    uniqueIndex("product_images_active_primary_unique")
      .on(table.productId)
      .where(sql`${table.isPrimary} = true and ${table.isActive} = true`),
    index("product_images_product_position_idx").on(table.productId, table.position),
    check("product_images_position_nonnegative", sql`${table.position} >= 0`),
    check("product_images_size_positive", sql`${table.sizeBytes} > 0`),
    pgPolicy("product_images_select_product", {
      for: "select",
      to: authenticatedRole,
      using: sql`exists (select 1 from public.products where id = ${table.productId})`,
    }),
    pgPolicy("product_images_insert_own", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${authUid} = ${table.uploadedBy}
        and ${table.source} = 'SELLER_ORIGINAL'
        and exists (select 1 from public.products where id = ${table.productId} and seller_id = ${authUid})`,
    }),
    pgPolicy("product_images_update_own", {
      for: "update",
      to: authenticatedRole,
      using: sql`exists (select 1 from public.products where id = ${table.productId} and seller_id = ${authUid})`,
      withCheck: sql`exists (select 1 from public.products where id = ${table.productId} and seller_id = ${authUid})`,
    }),
  ],
).enableRLS();

export const productMediaHistory = pgTable(
  "product_media_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    productImageId: uuid("product_image_id").references(() => productImages.id, {
      onDelete: "set null",
    }),
    action: mediaHistoryActionEnum("action").notNull(),
    actorUserId: uuid("actor_user_id").references(() => profiles.id, { onDelete: "set null" }),
    source: productImageSourceEnum("source").notNull(),
    storagePath: text("storage_path").notNull(),
    metadata: jsonb("metadata")
      .default(sql`'{}'::jsonb`)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("product_media_history_product_created_idx").on(table.productId, table.createdAt),
    pgPolicy("product_media_history_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`exists (select 1 from public.products where id = ${table.productId} and seller_id = ${authUid})`,
    }),
  ],
).enableRLS();

export const inventoryTransactions = pgTable(
  "inventory_transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    type: inventoryTransactionTypeEnum("type").notNull(),
    quantityBefore: integer("quantity_before").notNull(),
    quantityDelta: integer("quantity_delta").notNull(),
    quantityAfter: integer("quantity_after").notNull(),
    reservedBefore: integer("reserved_before").default(0).notNull(),
    reservedDelta: integer("reserved_delta").default(0).notNull(),
    reservedAfter: integer("reserved_after").default(0).notNull(),
    reason: text("reason"),
    actorUserId: uuid("actor_user_id").references(() => profiles.id, { onDelete: "set null" }),
    metadata: jsonb("metadata")
      .default(sql`'{}'::jsonb`)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("inventory_transactions_product_created_idx").on(table.productId, table.createdAt),
    pgPolicy("inventory_transactions_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`exists (select 1 from public.products where id = ${table.productId} and seller_id = ${authUid})`,
    }),
  ],
).enableRLS();

export const productModificationHistory = pgTable(
  "product_modification_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    actorUserId: uuid("actor_user_id").references(() => profiles.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    previousValue: jsonb("previous_value"),
    newValue: jsonb("new_value"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("product_modification_history_product_created_idx").on(
      table.productId,
      table.createdAt,
    ),
    pgPolicy("product_modification_history_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`exists (select 1 from public.products where id = ${table.productId} and seller_id = ${authUid})`,
    }),
  ],
).enableRLS();
export const marketplaceProductSearch = pgView("marketplace_product_search", {
  productId: uuid("product_id").notNull(),
  searchText: text("search_text").notNull(),
}).with({ securityBarrier: true }).as(sql`
  select
    products.id as product_id,
    lower(concat_ws(' ',
      products.name,
      products.brand,
      products.oem_part_number,
      products.manufacturer_part_number,
      product_categories.name,
      coalesce(string_agg(distinct product_cross_references.reference_number, ' '), ''),
      coalesce(string_agg(distinct concat_ws(' ',
        vehicle_makes.name,
        vehicle_models.name,
        vehicle_years.year::text,
        vehicle_trims.name,
        engines.name,
        transmissions.name,
        drivetrains.name
      ), ' '), '')
    )) as search_text
  from ${products} as products
  join ${productCategories} as product_categories
    on product_categories.id = products.category_id
  left join ${productCrossReferences} as product_cross_references
    on product_cross_references.product_id = products.id
  left join ${productFitments} as product_fitments
    on product_fitments.product_id = products.id
  left join ${vehicleFitments} as vehicle_fitments
    on vehicle_fitments.id = product_fitments.fitment_id
  left join ${vehicleMakes} as vehicle_makes on vehicle_makes.id = vehicle_fitments.make_id
  left join ${vehicleModels} as vehicle_models on vehicle_models.id = vehicle_fitments.model_id
  left join ${vehicleYears} as vehicle_years on vehicle_years.id = vehicle_fitments.year_id
  left join ${vehicleTrims} as vehicle_trims on vehicle_trims.id = vehicle_fitments.trim_id
  left join ${engines} as engines on engines.id = vehicle_fitments.engine_id
  left join ${transmissions} as transmissions on transmissions.id = vehicle_fitments.transmission_id
  left join ${drivetrains} as drivetrains on drivetrains.id = vehicle_fitments.drivetrain_id
  where products.status = 'APPROVED'
  group by products.id, product_categories.name
`);