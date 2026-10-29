import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { and, desc, eq, gt } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import {
  cartItems,
  deliveryFallbackRates,
  deliveryPricingConfigs,
  deliveryQuoteShipments,
  deliveryQuotes,
  deliveryVehicleCategories,
  deliveryWeightBrackets,
  productShippingProfiles,
  products,
  sellerPickupLocations,
} from "@/db/schema";
import { isAnambraLga } from "@/lib/delivery/anambra";
import { getConfiguredDistanceProvider } from "@/lib/delivery/distance-provider";
import {
  calculateShipmentCharge,
  chooseVehicleCategory,
  type ShipmentDimensions,
} from "@/lib/delivery/pricing-engine";

const QUOTE_LIFETIME_MS = 20 * 60 * 1000;

export type DeliveryAddressInput = {
  landmark: string | null;
  latitude: number | null;
  lga: string;
  longitude: number | null;
  phone: string;
  recipientName: string;
  state: "Anambra";
  streetAddress: string;
  town: string;
};

export type DeliveryQuoteErrorCode =
  | "ADDRESS_UNSUPPORTED"
  | "CART_EMPTY"
  | "DELIVERY_CONFIGURATION_INACTIVE"
  | "DELIVERY_DETAILS_MISSING"
  | "DELIVERY_FEE_UNAVAILABLE"
  | "DELIVERY_ITEM_INELIGIBLE"
  | "DELIVERY_QUOTE_EXPIRED"
  | "DELIVERY_QUOTE_INVALID"
  | "MANUAL_QUOTE_REQUIRED";

export class DeliveryQuoteError extends Error {
  constructor(
    public readonly code: DeliveryQuoteErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "DeliveryQuoteError";
  }
}
function addressFingerprint(address: DeliveryAddressInput) {
  return {
    landmark: address.landmark,
    latitude: address.latitude,
    lga: address.lga.trim().toLowerCase(),
    longitude: address.longitude,
    phone: address.phone.replace(/\s+/g, ""),
    recipientName: address.recipientName.trim(),
    state: "Anambra",
    streetAddress: address.streetAddress.trim(),
    town: address.town.trim().toLowerCase(),
  };
}

export function calculateDeliveryQuoteFingerprint(input: {
  address: DeliveryAddressInput;
  buyerId: string;
  configVersion: number;
  items: Array<{
    priceMinor: number;
    productId: string;
    quantity: number;
    version: number;
  }>;
}) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        address: addressFingerprint(input.address),
        buyerId: input.buyerId,
        configVersion: input.configVersion,
        items: [...input.items]
          .sort((left, right) => left.productId.localeCompare(right.productId))
          .map((item) => [item.productId, item.quantity, item.priceMinor, item.version]),
      }),
    )
    .digest("hex");
}

export function readDeliveryAddressSnapshot(value: unknown): DeliveryAddressInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const requiredText = [
    record.lga,
    record.phone,
    record.recipientName,
    record.state,
    record.streetAddress,
    record.town,
  ];
  if (!requiredText.every((field) => typeof field === "string")) return null;
  const latitude = record.latitude;
  const longitude = record.longitude;
  if (latitude !== null && typeof latitude !== "number") return null;
  if (longitude !== null && typeof longitude !== "number") return null;
  if (record.state !== "Anambra") return null;
  return {
    landmark: typeof record.landmark === "string" ? record.landmark : null,
    latitude,
    lga: record.lga as string,
    longitude,
    phone: record.phone as string,
    recipientName: record.recipientName as string,
    state: "Anambra",
    streetAddress: record.streetAddress as string,
    town: record.town as string,
  };
}

export function validateDeliveryAddress(address: DeliveryAddressInput) {
  if (address.state !== "Anambra" || !isAnambraLga(address.lga)) {
    throw new DeliveryQuoteError(
      "ADDRESS_UNSUPPORTED",
      "Delivery is currently available only within Anambra State. Choose a valid Anambra LGA.",
    );
  }
  if (
    address.recipientName.trim().length < 2 ||
    address.streetAddress.trim().length < 5 ||
    address.town.trim().length < 2 ||
    !/^\+?[0-9][0-9\s-]{7,18}$/.test(address.phone)
  ) {
    throw new DeliveryQuoteError(
      "DELIVERY_DETAILS_MISSING",
      "Enter the recipient, phone number, town, LGA, and street address.",
    );
  }
  const hasLatitude = address.latitude !== null;
  const hasLongitude = address.longitude !== null;
  if (hasLatitude !== hasLongitude) {
    throw new DeliveryQuoteError(
      "DELIVERY_DETAILS_MISSING",
      "Add both map coordinates or leave both empty.",
    );
  }
}

type ShipmentItem = {
  heightMm: number | null;
  isBulky: boolean;
  isFragile: boolean;
  lengthMm: number | null;
  packagingWeightGrams: number;
  productId: string;
  quantity: number;
  weightGrams: number;
  widthMm: number | null;
};

function shipmentDimensions(items: ShipmentItem[]): ShipmentDimensions {
  const maximum = (values: Array<number | null>) => {
    const available = values.filter((value): value is number => value !== null);
    return available.length ? Math.max(...available) : null;
  };
  return {
    heightMm: maximum(items.map((item) => item.heightMm)),
    lengthMm: maximum(items.map((item) => item.lengthMm)),
    widthMm: maximum(items.map((item) => item.widthMm)),
  };
}

export async function createDeliveryQuote(buyerId: string, address: DeliveryAddressInput) {
  validateDeliveryAddress(address);
  const database = getDatabase();
  const [config] = await database
    .select()
    .from(deliveryPricingConfigs)
    .where(
      and(
        eq(deliveryPricingConfigs.serviceActive, true),
        eq(deliveryPricingConfigs.productionApproved, true),
      ),
    )
    .orderBy(desc(deliveryPricingConfigs.version))
    .limit(1);

  if (!config) {
    throw new DeliveryQuoteError(
      "DELIVERY_CONFIGURATION_INACTIVE",
      "Delivery pricing is not available yet. Choose pickup or try again later.",
    );
  }

  const cart = await database
    .select({
      deliveryAvailable: products.deliveryAvailable,
      deliveryEligible: productShippingProfiles.deliveryEligible,
      heightMm: productShippingProfiles.heightMm,
      isBulky: productShippingProfiles.isBulky,
      isFragile: productShippingProfiles.isFragile,
      lengthMm: productShippingProfiles.lengthMm,
      packagingWeightGrams: productShippingProfiles.packagingWeightGrams,
      pickupCity: sellerPickupLocations.town,
      pickupContactName: sellerPickupLocations.contactName,
      pickupContactPhone: sellerPickupLocations.contactPhone,
      pickupLandmark: sellerPickupLocations.landmark,
      pickupActive: sellerPickupLocations.isActive,
      pickupLatitude: sellerPickupLocations.latitude,
      pickupLga: sellerPickupLocations.lga,
      pickupLocationId: sellerPickupLocations.id,
      pickupLongitude: sellerPickupLocations.longitude,
      pickupState: sellerPickupLocations.state,
      pickupStreetAddress: sellerPickupLocations.streetAddress,
      pickupVerifiedAt: sellerPickupLocations.verifiedAt,
      priceMinor: products.priceMinor,
      productId: products.id,
      productStatus: products.status,
      quantity: cartItems.quantity,
      sellerId: products.sellerId,
      version: products.version,
      weightGrams: productShippingProfiles.weightGrams,
      widthMm: productShippingProfiles.widthMm,
    })
    .from(cartItems)
    .innerJoin(products, eq(products.id, cartItems.productId))
    .leftJoin(productShippingProfiles, eq(productShippingProfiles.productId, products.id))
    .leftJoin(
      sellerPickupLocations,
      eq(sellerPickupLocations.id, productShippingProfiles.pickupLocationId),
    )
    .where(eq(cartItems.buyerId, buyerId));

  if (!cart.length) {
    throw new DeliveryQuoteError("CART_EMPTY", "Your cart is empty.");
  }
  if (
    cart.some(
      (item) =>
        item.productStatus !== "APPROVED" ||
        !item.deliveryAvailable ||
        !item.deliveryEligible ||
        !item.pickupLocationId ||
        !item.pickupActive ||
        !item.pickupVerifiedAt ||
        item.weightGrams === null,
    )
  ) {
    throw new DeliveryQuoteError(
      "DELIVERY_ITEM_INELIGIBLE",
      "A product in your cart needs updated delivery details. Choose pickup or remove that product.",
    );
  }

  const [weightBrackets, vehicles, fallbackRates] = await Promise.all([
    database
      .select()
      .from(deliveryWeightBrackets)
      .where(eq(deliveryWeightBrackets.configId, config.id)),
    database
      .select()
      .from(deliveryVehicleCategories)
      .where(
        and(
          eq(deliveryVehicleCategories.configId, config.id),
          eq(deliveryVehicleCategories.isActive, true),
        ),
      ),
    database
      .select()
      .from(deliveryFallbackRates)
      .where(
        and(
          eq(deliveryFallbackRates.configId, config.id),
          eq(deliveryFallbackRates.isActive, true),
        ),
      ),
  ]);

  if (!vehicles.length) {
    throw new DeliveryQuoteError(
      "DELIVERY_CONFIGURATION_INACTIVE",
      "Delivery vehicle pricing has not been configured.",
    );
  }

  const distanceProvider = getConfiguredDistanceProvider();
  const groups = new Map<string, typeof cart>();
  for (const item of cart) {
    const key = `${item.sellerId}:${item.pickupLocationId}`;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  const shipmentRows: Array<{
    actualCostMinor: number;
    customerChargeMinor: number;
    distanceMeters: number | null;
    distanceSource: string;
    pickupLocationId: string;
    pickupSnapshot: Record<string, string | null>;
    platformComponentMinor: number;
    pricingBreakdown: Record<string, number>;
    productIds: string[];
    sellerId: string;
    totalWeightGrams: number;
    vehicleCategoryCode: string;
    volumeMm3: number | null;
  }> = [];
  for (const items of groups.values()) {
    const first = items[0];
    if (!first?.pickupLocationId || first.weightGrams === null) continue;
    const typedItems: ShipmentItem[] = items.map((item) => ({
      heightMm: item.heightMm,
      isBulky: item.isBulky ?? false,
      isFragile: item.isFragile ?? false,
      lengthMm: item.lengthMm,
      packagingWeightGrams: item.packagingWeightGrams ?? 0,
      productId: item.productId,
      quantity: item.quantity,
      weightGrams: item.weightGrams ?? 0,
      widthMm: item.widthMm,
    }));
    const totalWeightGrams = typedItems.reduce(
      (sum, item) =>
        sum + (item.weightGrams + item.packagingWeightGrams) * item.quantity,
      0,
    );
    const dimensions = shipmentDimensions(typedItems);
    const volumeMm3 = typedItems.reduce((sum, item) => {
      if (item.lengthMm === null || item.widthMm === null || item.heightMm === null) return sum;
      return sum + item.lengthMm * item.widthMm * item.heightMm * item.quantity;
    }, 0);

    if (
      (config.manualQuoteAboveGrams !== null &&
        totalWeightGrams > config.manualQuoteAboveGrams) ||
      (config.manualQuoteAboveVolumeMm3 !== null &&
        volumeMm3 > config.manualQuoteAboveVolumeMm3)
    ) {
      throw new DeliveryQuoteError(
        "MANUAL_QUOTE_REQUIRED",
        "This order needs a manual delivery quote because of its size or weight.",
      );
    }

    const vehicle = chooseVehicleCategory(vehicles, totalWeightGrams, dimensions);
    if (!vehicle) {
      throw new DeliveryQuoteError(
        "MANUAL_QUOTE_REQUIRED",
        "This order needs a manual delivery quote because no configured vehicle can carry it.",
      );
    }

    const distanceMeters = await distanceProvider?.getRoadDistanceMeters(
      { latitude: first.pickupLatitude, longitude: first.pickupLongitude },
      { latitude: address.latitude, longitude: address.longitude },
    ) ?? null;
    const fallback = fallbackRates.find(
      (rate) =>
        (rate.originTown.toLowerCase() === first.pickupCity?.toLowerCase() &&
          rate.destinationTown.toLowerCase() === address.town.toLowerCase()) ||
        (rate.destinationTown.toLowerCase() === first.pickupCity?.toLowerCase() &&
          rate.originTown.toLowerCase() === address.town.toLowerCase()),
    );
    const charge = calculateShipmentCharge({
      distanceMeters,
      fallbackRouteChargeMinor: fallback?.feeMinor ?? null,
      hasBulkyItem: typedItems.some((item) => item.isBulky),
      hasFragileItem: typedItems.some((item) => item.isFragile),
      pricing: config,
      vehicle,
      weightBrackets,
      weightGrams: totalWeightGrams,
    });
    if (!charge) {
      throw new DeliveryQuoteError(
        "DELIVERY_FEE_UNAVAILABLE",
        "We could not calculate a reliable delivery fee for this address.",
      );
    }

    shipmentRows.push({
      ...charge,
      distanceMeters: distanceMeters ?? (fallback?.distanceKm ? Math.round(fallback.distanceKm * 1000) : null),
      distanceSource: distanceMeters !== null ? distanceProvider?.code ?? "GOOGLE_ROUTES" : "FALLBACK_MATRIX",
      pickupLocationId: first.pickupLocationId,
      pickupSnapshot: {
        contactName: first.pickupContactName,
        contactPhone: first.pickupContactPhone,
        landmark: first.pickupLandmark,
        lga: first.pickupLga,
        state: first.pickupState,
        streetAddress: first.pickupStreetAddress,
        town: first.pickupCity,
      },
      productIds: typedItems.map((item) => item.productId),
      sellerId: first.sellerId,
      totalWeightGrams,
      vehicleCategoryCode: vehicle.code,
      volumeMm3: volumeMm3 || null,
    });
  }

  const productSubtotalMinor = cart.reduce(
    (sum, item) => sum + item.priceMinor * item.quantity,
    0,
  );
  const deliveryTotalMinor = shipmentRows.reduce(
    (sum, shipment) => sum + shipment.customerChargeMinor,
    0,
  );
  const totalMinor = productSubtotalMinor + deliveryTotalMinor;
  const fingerprint = calculateDeliveryQuoteFingerprint({
    address,
    buyerId,
    configVersion: config.version,
    items: cart,
  });

  const [existing] = await database
    .select()
    .from(deliveryQuotes)
    .where(
      and(
        eq(deliveryQuotes.buyerId, buyerId),
        eq(deliveryQuotes.cartFingerprint, fingerprint),
        eq(deliveryQuotes.status, "VALID"),
        gt(deliveryQuotes.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(deliveryQuotes.createdAt))
    .limit(1);
  if (existing) return existing;

  const quoteId = randomUUID();
  const expiresAt = new Date(Date.now() + QUOTE_LIFETIME_MS);
  await database.transaction(async (transaction) => {
    await transaction.insert(deliveryQuotes).values({
      addressSnapshot: address,
      buyerId,
      cartFingerprint: fingerprint,
      deliveryTotalMinor,
      expiresAt,
      id: quoteId,
      pricingConfigId: config.id,
      productSubtotalMinor,
      totalMinor,
    });
    await transaction.insert(deliveryQuoteShipments).values(
      shipmentRows.map((shipment) => ({
        actualCostMinor: shipment.actualCostMinor,
        customerChargeMinor: shipment.customerChargeMinor,
        distanceMeters: shipment.distanceMeters,
        distanceSource: shipment.distanceSource,
        pickupLocationId: shipment.pickupLocationId,
        pickupSnapshot: shipment.pickupSnapshot,
        platformComponentMinor: shipment.platformComponentMinor,
        pricingBreakdown: shipment.pricingBreakdown,
        productIds: shipment.productIds,
        quoteId,
        sellerId: shipment.sellerId,
        totalWeightGrams: shipment.totalWeightGrams,
        vehicleCategoryCode: shipment.vehicleCategoryCode,
        volumeMm3: shipment.volumeMm3,
      })),
    );
  });

  return {
    addressSnapshot: address,
    buyerId,
    cartFingerprint: fingerprint,
    consumedAt: null,
    createdAt: new Date(),
    currency: "NGN",
    deliveryTotalMinor,
    expiresAt,
    id: quoteId,
    pricingConfigId: config.id,
    productSubtotalMinor,
    status: "VALID",
    totalMinor,
    updatedAt: new Date(),
    vatMinor: 0,
  } as const;
}

export async function getValidatedDeliveryQuote(buyerId: string, quoteId: string) {
  const database = getDatabase();
  const [quote] = await database
    .select()
    .from(deliveryQuotes)
    .where(
      and(
        eq(deliveryQuotes.id, quoteId),
        eq(deliveryQuotes.buyerId, buyerId),
        eq(deliveryQuotes.status, "VALID"),
        gt(deliveryQuotes.expiresAt, new Date()),
      ),
    )
    .limit(1);
  if (!quote) {
    throw new DeliveryQuoteError(
      "DELIVERY_QUOTE_EXPIRED",
      "Your delivery fee expired. Calculate it again before paying.",
    );
  }
  return quote;
}

export async function consumeDeliveryQuote(quoteId: string) {
  await getDatabase()
    .update(deliveryQuotes)
    .set({ consumedAt: new Date(), status: "CONSUMED", updatedAt: new Date() })
    .where(and(eq(deliveryQuotes.id, quoteId), eq(deliveryQuotes.status, "VALID")));
}

export async function getQuoteShipmentAllocations(quoteId: string) {
  return getDatabase()
    .select()
    .from(deliveryQuoteShipments)
    .where(eq(deliveryQuoteShipments.quoteId, quoteId));
}
