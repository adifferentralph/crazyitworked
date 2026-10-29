import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  doublePrecision,
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
import { buyerProfiles, sellerProfiles } from "@/db/schema/identity";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

const adminCanRead = sql`exists (
  select 1 from public.profiles
  where id = ${authUid} and role = 'ADMIN' and status = 'ACTIVE'
)`;

export const sellerPickupLocations = pgTable(
  "seller_pickup_locations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sellerId: uuid("seller_id")
      .notNull()
      .references(() => sellerProfiles.userId, { onDelete: "cascade" }),
    label: text("label").notNull(),
    state: text("state").default("Anambra").notNull(),
    lga: text("lga").notNull(),
    town: text("town").notNull(),
    streetAddress: text("street_address").notNull(),
    landmark: text("landmark"),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    contactName: text("contact_name").notNull(),
    contactPhone: text("contact_phone").notNull(),
    isDefault: boolean("is_default").default(false).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("seller_pickup_locations_seller_idx").on(table.sellerId, table.isActive),
    uniqueIndex("seller_pickup_locations_default_unique")
      .on(table.sellerId)
      .where(sql`${table.isDefault} = true and ${table.isActive} = true`),
    check("seller_pickup_locations_anambra_only", sql`lower(${table.state}) = 'anambra'`),
    check(
      "seller_pickup_locations_coordinates_pair",
      sql`(${table.latitude} is null and ${table.longitude} is null) or (
        ${table.latitude} between -90 and 90 and ${table.longitude} between -180 and 180
      )`,
    ),
    pgPolicy("seller_pickup_locations_select_owner_or_admin", {
      for: "select",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.sellerId} or ${adminCanRead}`,
    }),
    pgPolicy("seller_pickup_locations_insert_owner", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${authUid} = ${table.sellerId}`,
    }),
    pgPolicy("seller_pickup_locations_update_owner", {
      for: "update",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.sellerId}`,
      withCheck: sql`${authUid} = ${table.sellerId}`,
    }),
  ],
).enableRLS();
export const productShippingProfiles = pgTable(
  "product_shipping_profiles",
  {
    productId: uuid("product_id")
      .primaryKey()
      .references(() => products.id, { onDelete: "cascade" }),
    pickupLocationId: uuid("pickup_location_id").references(() => sellerPickupLocations.id, {
      onDelete: "restrict",
    }),
    weightGrams: integer("weight_grams"),
    packagingWeightGrams: integer("packaging_weight_grams").default(0).notNull(),
    lengthMm: integer("length_mm"),
    widthMm: integer("width_mm"),
    heightMm: integer("height_mm"),
    isFragile: boolean("is_fragile").default(false).notNull(),
    isBulky: boolean("is_bulky").default(false).notNull(),
    deliveryEligible: boolean("delivery_eligible").default(false).notNull(),
    requiresLocationUpdate: boolean("requires_location_update").default(true).notNull(),
    ...timestamps,
  },
  (table) => [
    index("product_shipping_profiles_pickup_idx").on(table.pickupLocationId),
    check(
      "product_shipping_profiles_weight_positive",
      sql`${table.weightGrams} is null or ${table.weightGrams} > 0`,
    ),
    check(
      "product_shipping_profiles_packaging_nonnegative",
      sql`${table.packagingWeightGrams} >= 0`,
    ),
    check(
      "product_shipping_profiles_dimensions_positive",
      sql`(${table.lengthMm} is null or ${table.lengthMm} > 0)
        and (${table.widthMm} is null or ${table.widthMm} > 0)
        and (${table.heightMm} is null or ${table.heightMm} > 0)`,
    ),
    check(
      "product_shipping_profiles_delivery_complete",
      sql`${table.deliveryEligible} = false or (
        ${table.pickupLocationId} is not null
        and ${table.weightGrams} is not null
        and ${table.requiresLocationUpdate} = false
      )`,
    ),
    pgPolicy("product_shipping_profiles_select_owner_or_admin", {
      for: "select",
      to: authenticatedRole,
      using: sql`exists (
        select 1 from public.products
        where id = ${table.productId} and seller_id = ${authUid}
      ) or ${adminCanRead}`,
    }),
    pgPolicy("product_shipping_profiles_write_owner", {
      for: "all",
      to: authenticatedRole,
      using: sql`exists (
        select 1 from public.products
        where id = ${table.productId} and seller_id = ${authUid}
      )`,
      withCheck: sql`exists (
        select 1 from public.products
        where id = ${table.productId} and seller_id = ${authUid}
      )`,
    }),
  ],
).enableRLS();
export const deliveryPricingConfigs = pgTable(
  "delivery_pricing_configs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    version: integer("version").notNull(),
    name: text("name").notNull(),
    state: text("state").default("Anambra").notNull(),
    currency: text("currency").default("NGN").notNull(),
    baseChargeMinor: bigint("base_charge_minor", { mode: "number" }).notNull(),
    minimumChargeMinor: bigint("minimum_charge_minor", { mode: "number" }).notNull(),
    costPerKmMinor: bigint("cost_per_km_minor", { mode: "number" }).notNull(),
    handlingChargeMinor: bigint("handling_charge_minor", { mode: "number" }).default(0).notNull(),
    fragileSurchargeMinor: bigint("fragile_surcharge_minor", { mode: "number" }).default(0).notNull(),
    bulkySurchargeMinor: bigint("bulky_surcharge_minor", { mode: "number" }).default(0).notNull(),
    marketplaceMarkupMinor: bigint("marketplace_markup_minor", { mode: "number" }).default(0).notNull(),
    maximumAutomaticFeeMinor: bigint("maximum_automatic_fee_minor", { mode: "number" }).notNull(),
    roundingStepMinor: integer("rounding_step_minor").default(100).notNull(),
    manualQuoteAboveGrams: integer("manual_quote_above_grams"),
    manualQuoteAboveVolumeMm3: bigint("manual_quote_above_volume_mm3", { mode: "number" }),
    handlingMinDays: integer("handling_min_days").default(0).notNull(),
    handlingMaxDays: integer("handling_max_days").default(1).notNull(),
    transitMinDays: integer("transit_min_days").default(1).notNull(),
    transitMaxDays: integer("transit_max_days").default(7).notNull(),
    returnPolicyActive: boolean("return_policy_active").default(false).notNull(),
    returnWindowDays: integer("return_window_days"),
    returnMethod: text("return_method"),
    returnFees: text("return_fees"),
    serviceActive: boolean("service_active").default(false).notNull(),
    productionApproved: boolean("production_approved").default(false).notNull(),
    createdBy: uuid("created_by"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("delivery_pricing_configs_version_unique").on(table.version),
    index("delivery_pricing_configs_active_idx").on(table.serviceActive, table.productionApproved),
    check("delivery_pricing_configs_anambra_only", sql`lower(${table.state}) = 'anambra'`),
    check("delivery_pricing_configs_ngn_only", sql`${table.currency} = 'NGN'`),
    check(
      "delivery_pricing_configs_money_nonnegative",
      sql`${table.baseChargeMinor} >= 0
        and ${table.minimumChargeMinor} >= 0
        and ${table.costPerKmMinor} >= 0
        and ${table.handlingChargeMinor} >= 0
        and ${table.fragileSurchargeMinor} >= 0
        and ${table.bulkySurchargeMinor} >= 0
        and ${table.marketplaceMarkupMinor} >= 0
        and ${table.maximumAutomaticFeeMinor} > 0`,
    ),
    check("delivery_pricing_configs_rounding_positive", sql`${table.roundingStepMinor} > 0`),
    check(
      "delivery_pricing_configs_days_valid",
      sql`${table.handlingMinDays} >= 0
        and ${table.handlingMaxDays} >= ${table.handlingMinDays}
        and ${table.transitMinDays} >= 0
        and ${table.transitMaxDays} >= ${table.transitMinDays}`,
    ),
    check(
      "delivery_pricing_configs_return_policy_valid",
      sql`(
        ${table.returnPolicyActive} = false
        and ${table.returnWindowDays} is null
        and ${table.returnMethod} is null
        and ${table.returnFees} is null
      ) or (
        ${table.returnPolicyActive} = true
        and ${table.returnWindowDays} between 1 and 365
        and ${table.returnMethod} in ('RETURN_BY_MAIL', 'RETURN_IN_STORE')
        and ${table.returnFees} in ('FREE_RETURN', 'RETURN_SHIPPING_FEES')
      )`,
    ),
    pgPolicy("delivery_pricing_configs_admin_read", {
      for: "select",
      to: authenticatedRole,
      using: adminCanRead,
    }),
  ],
).enableRLS();

export const deliveryWeightBrackets = pgTable(
  "delivery_weight_brackets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    configId: uuid("config_id")
      .notNull()
      .references(() => deliveryPricingConfigs.id, { onDelete: "cascade" }),
    minGrams: integer("min_grams").notNull(),
    maxGrams: integer("max_grams"),
    surchargeMinor: bigint("surcharge_minor", { mode: "number" }).default(0).notNull(),
    position: integer("position").default(0).notNull(),
  },
  (table) => [
    uniqueIndex("delivery_weight_brackets_config_min_unique").on(table.configId, table.minGrams),
    check(
      "delivery_weight_brackets_range_valid",
      sql`${table.minGrams} >= 0 and (${table.maxGrams} is null or ${table.maxGrams} > ${table.minGrams})`,
    ),
    check("delivery_weight_brackets_surcharge_nonnegative", sql`${table.surchargeMinor} >= 0`),
    pgPolicy("delivery_weight_brackets_admin_read", {
      for: "select",
      to: authenticatedRole,
      using: adminCanRead,
    }),
  ],
).enableRLS();

export const deliveryVehicleCategories = pgTable(
  "delivery_vehicle_categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    configId: uuid("config_id")
      .notNull()
      .references(() => deliveryPricingConfigs.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    maxWeightGrams: integer("max_weight_grams").notNull(),
    maxLengthMm: integer("max_length_mm"),
    maxWidthMm: integer("max_width_mm"),
    maxHeightMm: integer("max_height_mm"),
    surchargeMinor: bigint("surcharge_minor", { mode: "number" }).default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    position: integer("position").default(0).notNull(),
  },
  (table) => [
    uniqueIndex("delivery_vehicle_categories_config_code_unique").on(table.configId, table.code),
    check("delivery_vehicle_categories_weight_positive", sql`${table.maxWeightGrams} > 0`),
    check("delivery_vehicle_categories_surcharge_nonnegative", sql`${table.surchargeMinor} >= 0`),
    pgPolicy("delivery_vehicle_categories_admin_read", {
      for: "select",
      to: authenticatedRole,
      using: adminCanRead,
    }),
  ],
).enableRLS();

export const deliveryFallbackRates = pgTable(
  "delivery_fallback_rates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    configId: uuid("config_id")
      .notNull()
      .references(() => deliveryPricingConfigs.id, { onDelete: "cascade" }),
    originTown: text("origin_town").notNull(),
    destinationTown: text("destination_town").notNull(),
    distanceKm: doublePrecision("distance_km"),
    feeMinor: bigint("fee_minor", { mode: "number" }).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("delivery_fallback_rates_route_unique").on(
      table.configId,
      sql`lower(${table.originTown})`,
      sql`lower(${table.destinationTown})`,
    ),
    check("delivery_fallback_rates_fee_positive", sql`${table.feeMinor} > 0`),
    check(
      "delivery_fallback_rates_distance_positive",
      sql`${table.distanceKm} is null or ${table.distanceKm} > 0`,
    ),
    pgPolicy("delivery_fallback_rates_admin_read", {
      for: "select",
      to: authenticatedRole,
      using: adminCanRead,
    }),
  ],
).enableRLS();

export const deliveryQuotes = pgTable(
  "delivery_quotes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    buyerId: uuid("buyer_id")
      .notNull()
      .references(() => buyerProfiles.userId, { onDelete: "restrict" }),
    pricingConfigId: uuid("pricing_config_id")
      .notNull()
      .references(() => deliveryPricingConfigs.id, { onDelete: "restrict" }),
    cartFingerprint: text("cart_fingerprint").notNull(),
    addressSnapshot: jsonb("address_snapshot").notNull(),
    productSubtotalMinor: bigint("product_subtotal_minor", { mode: "number" }).notNull(),
    deliveryTotalMinor: bigint("delivery_total_minor", { mode: "number" }).notNull(),
    totalMinor: bigint("total_minor", { mode: "number" }).notNull(),
    vatMinor: bigint("vat_minor", { mode: "number" }).default(0).notNull(),
    currency: text("currency").default("NGN").notNull(),
    status: text("status").default("VALID").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("delivery_quotes_buyer_created_idx").on(table.buyerId, table.createdAt),
    index("delivery_quotes_fingerprint_expiry_idx").on(table.cartFingerprint, table.expiresAt),
    check("delivery_quotes_status_valid", sql`${table.status} in ('VALID', 'EXPIRED', 'CONSUMED', 'MANUAL_REQUIRED', 'INVALID')`),
    check("delivery_quotes_ngn_only", sql`${table.currency} = 'NGN'`),
    check("delivery_quotes_vat_disabled", sql`${table.vatMinor} = 0`),
    check(
      "delivery_quotes_total_exact",
      sql`${table.totalMinor} = ${table.productSubtotalMinor} + ${table.deliveryTotalMinor} + ${table.vatMinor}`,
    ),
    pgPolicy("delivery_quotes_select_owner_or_admin", {
      for: "select",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.buyerId} or ${adminCanRead}`,
    }),
  ],
).enableRLS();

export const deliveryQuoteShipments = pgTable(
  "delivery_quote_shipments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    quoteId: uuid("quote_id")
      .notNull()
      .references(() => deliveryQuotes.id, { onDelete: "cascade" }),
    sellerId: uuid("seller_id")
      .notNull()
      .references(() => sellerProfiles.userId, { onDelete: "restrict" }),
    pickupLocationId: uuid("pickup_location_id")
      .notNull()
      .references(() => sellerPickupLocations.id, { onDelete: "restrict" }),
    pickupSnapshot: jsonb("pickup_snapshot").notNull(),
    productIds: jsonb("product_ids").notNull(),
    totalWeightGrams: integer("total_weight_grams").notNull(),
    volumeMm3: bigint("volume_mm3", { mode: "number" }),
    distanceMeters: integer("distance_meters"),
    distanceSource: text("distance_source").notNull(),
    vehicleCategoryCode: text("vehicle_category_code").notNull(),
    actualCostMinor: bigint("actual_cost_minor", { mode: "number" }).notNull(),
    platformComponentMinor: bigint("platform_component_minor", { mode: "number" }).default(0).notNull(),
    customerChargeMinor: bigint("customer_charge_minor", { mode: "number" }).notNull(),
    pricingBreakdown: jsonb("pricing_breakdown").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("delivery_quote_shipments_quote_idx").on(table.quoteId),
    index("delivery_quote_shipments_seller_idx").on(table.sellerId),
    check("delivery_quote_shipments_weight_positive", sql`${table.totalWeightGrams} > 0`),
    check(
      "delivery_quote_shipments_charge_exact",
      sql`${table.customerChargeMinor} = ${table.actualCostMinor} + ${table.platformComponentMinor}`,
    ),
    pgPolicy("delivery_quote_shipments_participant_or_admin", {
      for: "select",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.sellerId} or ${adminCanRead}`,
    }),
  ],
).enableRLS();
