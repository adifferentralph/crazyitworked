import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const timestamps = {
  createdAt: v.number(),
  updatedAt: v.number(),
  deletedAt: v.optional(v.number()),
};

const money = v.object({
  amount: v.number(),
  currency: v.string(),
});

const address = v.object({
  line1: v.string(),
  line2: v.optional(v.string()),
  city: v.string(),
  state: v.string(),
  country: v.string(),
  postalCode: v.optional(v.string()),
});

const attachment = v.object({
  url: v.string(),
  key: v.string(),
  filename: v.string(),
  contentType: v.string(),
  size: v.number(),
});

export default defineSchema({
  users: defineTable({
    ...timestamps,
    clerkUserId: v.string(),
    email: v.string(),
    name: v.string(),
    imageUrl: v.optional(v.string()),
    roles: v.array(
      v.union(
        v.literal("buyer"),
        v.literal("vendor"),
        v.literal("support_agent"),
        v.literal("moderator"),
        v.literal("admin"),
        v.literal("super_admin"),
      ),
    ),
    status: v.union(v.literal("active"), v.literal("suspended"), v.literal("deleted")),
    lastSeenAt: v.optional(v.number()),
  })
    .index("by_clerk_user_id", ["clerkUserId"])
    .index("by_email", ["email"])
    .index("by_status", ["status"]),

  profiles: defineTable({
    ...timestamps,
    userId: v.id("users"),
    phone: v.optional(v.string()),
    country: v.string(),
    state: v.optional(v.string()),
    city: v.optional(v.string()),
    defaultVehicleId: v.optional(v.id("savedVehicles")),
    billingAddress: v.optional(address),
    shippingAddress: v.optional(address),
  })
    .index("by_user", ["userId"])
    .index("by_location", ["country", "state", "city"]),

  savedVehicles: defineTable({
    ...timestamps,
    userId: v.id("users"),
    year: v.number(),
    make: v.string(),
    model: v.string(),
    variant: v.optional(v.string()),
    label: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_vehicle", ["year", "make", "model"]),

  vendors: defineTable({
    ...timestamps,
    ownerUserId: v.id("users"),
    slug: v.string(),
    displayName: v.string(),
    legalName: v.string(),
    description: v.string(),
    logoUrl: v.optional(v.string()),
    bannerUrl: v.optional(v.string()),
    supportEmail: v.string(),
    supportPhone: v.string(),
    country: v.string(),
    state: v.string(),
    city: v.string(),
    address,
    ratingAverage: v.number(),
    ratingCount: v.number(),
    fulfillmentModes: v.array(
      v.union(v.literal("pickup"), v.literal("delivery"), v.literal("interstate_shipping")),
    ),
    status: v.union(
      v.literal("draft"),
      v.literal("pending_verification"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("suspended"),
    ),
  })
    .index("by_owner", ["ownerUserId"])
    .index("by_slug", ["slug"])
    .index("by_status", ["status"])
    .index("by_location", ["country", "state", "city"]),

  vendorVerification: defineTable({
    ...timestamps,
    vendorId: v.id("vendors"),
    submittedByUserId: v.id("users"),
    reviewedByUserId: v.optional(v.id("users")),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    businessRegistrationNumber: v.optional(v.string()),
    taxIdentificationNumber: v.optional(v.string()),
    documents: v.array(attachment),
    rejectionReason: v.optional(v.string()),
    reviewedAt: v.optional(v.number()),
  })
    .index("by_vendor", ["vendorId"])
    .index("by_status", ["status"]),

  categories: defineTable({
    ...timestamps,
    parentCategoryId: v.optional(v.id("categories")),
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    sortOrder: v.number(),
    isActive: v.boolean(),
  })
    .index("by_slug", ["slug"])
    .index("by_parent", ["parentCategoryId"])
    .index("by_active_sort", ["isActive", "sortOrder"]),

  vehicleMakes: defineTable({
    ...timestamps,
    name: v.string(),
    slug: v.string(),
    countryOfOrigin: v.optional(v.string()),
  })
    .index("by_slug", ["slug"])
    .index("by_name", ["name"]),

  vehicleModels: defineTable({
    ...timestamps,
    makeId: v.id("vehicleMakes"),
    name: v.string(),
    slug: v.string(),
  })
    .index("by_make", ["makeId"])
    .index("by_make_slug", ["makeId", "slug"]),

  vehicleYears: defineTable({
    ...timestamps,
    makeId: v.id("vehicleMakes"),
    modelId: v.id("vehicleModels"),
    year: v.number(),
  })
    .index("by_year", ["year"])
    .index("by_model_year", ["modelId", "year"])
    .index("by_make_year", ["makeId", "year"]),

  vehicleVariants: defineTable({
    ...timestamps,
    makeId: v.id("vehicleMakes"),
    modelId: v.id("vehicleModels"),
    yearId: v.id("vehicleYears"),
    name: v.string(),
    engine: v.optional(v.string()),
    drivetrain: v.optional(v.string()),
  })
    .index("by_year", ["yearId"])
    .index("by_model", ["modelId"]),

  products: defineTable({
    ...timestamps,
    vendorId: v.id("vendors"),
    categoryId: v.id("categories"),
    title: v.string(),
    slug: v.string(),
    description: v.string(),
    sku: v.string(),
    manufacturer: v.optional(v.string()),
    brand: v.optional(v.string()),
    condition: v.union(v.literal("new"), v.literal("used"), v.literal("refurbished")),
    price: money,
    wholesalePrice: v.optional(money),
    minimumWholesaleQuantity: v.optional(v.number()),
    inventoryQuantity: v.number(),
    availability: v.union(
      v.literal("in_stock"),
      v.literal("low_stock"),
      v.literal("out_of_stock"),
      v.literal("preorder"),
    ),
    oemNumbers: v.array(v.string()),
    aftermarketReferences: v.array(v.string()),
    isNegotiable: v.boolean(),
    isBulkPricingEnabled: v.boolean(),
    status: v.union(
      v.literal("draft"),
      v.literal("pending_review"),
      v.literal("active"),
      v.literal("rejected"),
      v.literal("archived"),
    ),
    searchSyncedAt: v.optional(v.number()),
  })
    .index("by_vendor", ["vendorId"])
    .index("by_slug", ["slug"])
    .index("by_sku", ["sku"])
    .index("by_category_status", ["categoryId", "status"])
    .index("by_status_updated", ["status", "updatedAt"]),

  productImages: defineTable({
    ...timestamps,
    productId: v.id("products"),
    url: v.string(),
    key: v.string(),
    alt: v.string(),
    sortOrder: v.number(),
    isPrimary: v.boolean(),
  })
    .index("by_product_sort", ["productId", "sortOrder"])
    .index("by_product_primary", ["productId", "isPrimary"]),

  productCompatibility: defineTable({
    ...timestamps,
    productId: v.id("products"),
    makeId: v.id("vehicleMakes"),
    modelId: v.id("vehicleModels"),
    yearId: v.id("vehicleYears"),
    variantId: v.optional(v.id("vehicleVariants")),
    compatibilityType: v.union(v.literal("compatible"), v.literal("incompatible")),
    notes: v.optional(v.string()),
  })
    .index("by_product", ["productId"])
    .index("by_vehicle", ["yearId", "makeId", "modelId", "variantId"])
    .index("by_product_vehicle", ["productId", "yearId", "modelId"]),

  cartItems: defineTable({
    ...timestamps,
    userId: v.id("users"),
    productId: v.id("products"),
    vendorId: v.id("vendors"),
    quantity: v.number(),
    selectedFulfillmentMode: v.union(
      v.literal("pickup"),
      v.literal("delivery"),
      v.literal("interstate_shipping"),
    ),
  })
    .index("by_user", ["userId"])
    .index("by_user_product", ["userId", "productId"]),

  orders: defineTable({
    ...timestamps,
    buyerUserId: v.id("users"),
    vendorId: v.id("vendors"),
    orderNumber: v.string(),
    status: v.union(
      v.literal("pending_payment"),
      v.literal("paid"),
      v.literal("processing"),
      v.literal("ready_for_pickup"),
      v.literal("shipped"),
      v.literal("delivered"),
      v.literal("cancelled"),
      v.literal("disputed"),
      v.literal("refunded"),
    ),
    subtotal: money,
    deliveryFee: money,
    marketplaceFee: money,
    total: money,
    fulfillmentMode: v.union(
      v.literal("pickup"),
      v.literal("delivery"),
      v.literal("interstate_shipping"),
    ),
    shippingAddress: v.optional(address),
    pickupAddress: v.optional(address),
    escrowStatus: v.union(
      v.literal("not_required"),
      v.literal("held"),
      v.literal("released"),
      v.literal("refunded"),
    ),
  })
    .index("by_buyer", ["buyerUserId"])
    .index("by_vendor", ["vendorId"])
    .index("by_order_number", ["orderNumber"])
    .index("by_status", ["status"]),

  orderItems: defineTable({
    ...timestamps,
    orderId: v.id("orders"),
    productId: v.id("products"),
    vendorId: v.id("vendors"),
    title: v.string(),
    sku: v.string(),
    quantity: v.number(),
    unitPrice: money,
    total: money,
  })
    .index("by_order", ["orderId"])
    .index("by_product", ["productId"])
    .index("by_vendor", ["vendorId"]),

  payments: defineTable({
    ...timestamps,
    orderId: v.id("orders"),
    provider: v.union(v.literal("stripe"), v.literal("paystack"), v.literal("flutterwave")),
    providerReference: v.string(),
    amount: money,
    status: v.union(
      v.literal("requires_action"),
      v.literal("pending"),
      v.literal("succeeded"),
      v.literal("failed"),
      v.literal("refunded"),
    ),
    rawEventIds: v.array(v.string()),
    paidAt: v.optional(v.number()),
  })
    .index("by_order", ["orderId"])
    .index("by_provider_reference", ["provider", "providerReference"])
    .index("by_status", ["status"]),

  conversations: defineTable({
    ...timestamps,
    buyerUserId: v.id("users"),
    vendorId: v.id("vendors"),
    productId: v.optional(v.id("products")),
    rfqId: v.optional(v.id("rfqs")),
    subject: v.string(),
    productSnapshot: v.optional(
      v.object({
        imageUrl: v.optional(v.string()),
        sku: v.string(),
        title: v.string(),
        price: money,
        vendorId: v.id("vendors"),
      }),
    ),
    lastMessageAt: v.optional(v.number()),
    status: v.union(v.literal("open"), v.literal("closed"), v.literal("blocked")),
  })
    .index("by_buyer", ["buyerUserId"])
    .index("by_vendor", ["vendorId"])
    .index("by_product", ["productId"])
    .index("by_rfq", ["rfqId"])
    .index("by_last_message", ["lastMessageAt"]),

  messages: defineTable({
    ...timestamps,
    conversationId: v.id("conversations"),
    senderUserId: v.id("users"),
    body: v.string(),
    messageType: v.union(
      v.literal("text"),
      v.literal("image"),
      v.literal("attachment"),
      v.literal("system"),
    ),
    attachments: v.array(attachment),
    negotiation: v.optional(
      v.object({
        offeredUnitPrice: money,
        quantity: v.number(),
        status: v.union(v.literal("proposed"), v.literal("accepted"), v.literal("rejected")),
      }),
    ),
  })
    .index("by_conversation", ["conversationId", "createdAt"])
    .index("by_sender", ["senderUserId"]),

  messageReceipts: defineTable({
    ...timestamps,
    messageId: v.id("messages"),
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    readAt: v.optional(v.number()),
  })
    .index("by_message_user", ["messageId", "userId"])
    .index("by_conversation_user", ["conversationId", "userId"]),

  typingIndicators: defineTable({
    ...timestamps,
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    expiresAt: v.number(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_user_conversation", ["userId", "conversationId"]),

  notifications: defineTable({
    ...timestamps,
    userId: v.id("users"),
    title: v.string(),
    body: v.string(),
    type: v.union(
      v.literal("order"),
      v.literal("message"),
      v.literal("rfq"),
      v.literal("ad"),
      v.literal("system"),
    ),
    href: v.optional(v.string()),
    readAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_read", ["userId", "readAt"]),

  reviews: defineTable({
    ...timestamps,
    orderId: v.id("orders"),
    productId: v.id("products"),
    vendorId: v.id("vendors"),
    buyerUserId: v.id("users"),
    rating: v.number(),
    title: v.string(),
    body: v.string(),
    status: v.union(v.literal("pending"), v.literal("published"), v.literal("rejected")),
  })
    .index("by_product", ["productId"])
    .index("by_vendor", ["vendorId"])
    .index("by_buyer", ["buyerUserId"])
    .index("by_status", ["status"]),

  rfqs: defineTable({
    ...timestamps,
    buyerUserId: v.id("users"),
    title: v.string(),
    description: v.string(),
    quantity: v.number(),
    destinationCity: v.string(),
    destinationCountry: v.string(),
    targetCurrency: v.string(),
    neededBy: v.optional(v.number()),
    status: v.union(
      v.literal("open"),
      v.literal("quoted"),
      v.literal("negotiating"),
      v.literal("converted_to_order"),
      v.literal("closed"),
    ),
    attachments: v.array(attachment),
  })
    .index("by_buyer", ["buyerUserId"])
    .index("by_status", ["status"])
    .index("by_destination", ["destinationCountry", "destinationCity"]),

  quotations: defineTable({
    ...timestamps,
    rfqId: v.id("rfqs"),
    vendorId: v.id("vendors"),
    submittedByUserId: v.id("users"),
    unitPrice: money,
    quantityAvailable: v.number(),
    leadTimeDays: v.number(),
    notes: v.optional(v.string()),
    status: v.union(
      v.literal("submitted"),
      v.literal("accepted"),
      v.literal("rejected"),
      v.literal("expired"),
    ),
  })
    .index("by_rfq", ["rfqId"])
    .index("by_vendor", ["vendorId"])
    .index("by_status", ["status"]),

  adCampaigns: defineTable({
    ...timestamps,
    vendorId: v.id("vendors"),
    name: v.string(),
    objective: v.union(v.literal("traffic"), v.literal("sales"), v.literal("rfq_leads")),
    dailyBudget: money,
    totalBudget: money,
    startsAt: v.number(),
    endsAt: v.optional(v.number()),
    status: v.union(
      v.literal("draft"),
      v.literal("pending_review"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("active"),
      v.literal("paused"),
      v.literal("ended"),
    ),
    reviewedByUserId: v.optional(v.id("users")),
    rejectionReason: v.optional(v.string()),
  })
    .index("by_vendor", ["vendorId"])
    .index("by_status", ["status"])
    .index("by_schedule", ["startsAt", "endsAt"]),

  vendorAds: defineTable({
    ...timestamps,
    campaignId: v.id("adCampaigns"),
    vendorId: v.id("vendors"),
    productId: v.id("products"),
    placement: v.union(
      v.literal("homepage"),
      v.literal("search"),
      v.literal("category"),
      v.literal("product"),
    ),
    bidAmount: money,
    status: v.union(v.literal("active"), v.literal("paused"), v.literal("ended")),
  })
    .index("by_campaign", ["campaignId"])
    .index("by_product", ["productId"])
    .index("by_placement_status", ["placement", "status"]),

  adEvents: defineTable({
    ...timestamps,
    adId: v.id("vendorAds"),
    campaignId: v.id("adCampaigns"),
    vendorId: v.id("vendors"),
    productId: v.id("products"),
    eventType: v.union(v.literal("impression"), v.literal("click"), v.literal("conversion")),
    userId: v.optional(v.id("users")),
    sessionId: v.string(),
    revenue: v.optional(money),
  })
    .index("by_ad_type", ["adId", "eventType"])
    .index("by_campaign_type", ["campaignId", "eventType"])
    .index("by_vendor", ["vendorId"]),

  wishlists: defineTable({
    ...timestamps,
    userId: v.id("users"),
    productId: v.id("products"),
  })
    .index("by_user", ["userId"])
    .index("by_user_product", ["userId", "productId"]),

  vendorSubscriptions: defineTable({
    ...timestamps,
    vendorId: v.id("vendors"),
    provider: v.union(v.literal("stripe"), v.literal("paystack"), v.literal("flutterwave")),
    providerSubscriptionId: v.string(),
    plan: v.union(v.literal("starter"), v.literal("pro"), v.literal("enterprise")),
    status: v.union(
      v.literal("trialing"),
      v.literal("active"),
      v.literal("past_due"),
      v.literal("cancelled"),
    ),
    currentPeriodStart: v.number(),
    currentPeriodEnd: v.number(),
  })
    .index("by_vendor", ["vendorId"])
    .index("by_provider_subscription", ["provider", "providerSubscriptionId"])
    .index("by_status", ["status"]),

  auditLogs: defineTable({
    ...timestamps,
    actorUserId: v.optional(v.id("users")),
    action: v.string(),
    entityType: v.string(),
    entityId: v.string(),
    before: v.optional(v.any()),
    after: v.optional(v.any()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  })
    .index("by_actor", ["actorUserId"])
    .index("by_entity", ["entityType", "entityId"])
    .index("by_action", ["action"]),

  rateLimits: defineTable({
    ...timestamps,
    key: v.string(),
    windowStart: v.number(),
    count: v.number(),
    expiresAt: v.number(),
  }).index("by_key", ["key"]),
});
