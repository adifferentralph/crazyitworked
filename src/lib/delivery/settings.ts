import "server-only";

import { asc, desc, eq } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import {
  deliveryFallbackRates,
  deliveryPricingConfigs,
  deliveryVehicleCategories,
  deliveryWeightBrackets,
} from "@/db/schema";

export async function getDeliverySettings() {
  const database = getDatabase();
  const configs = await database
    .select()
    .from(deliveryPricingConfigs)
    .orderBy(desc(deliveryPricingConfigs.version));
  const selected = configs[0] ?? null;

  if (!selected) {
    return { config: null, configs, fallbackRates: [], vehicles: [], weightBrackets: [] };
  }

  const [weightBrackets, vehicles, fallbackRates] = await Promise.all([
    database
      .select()
      .from(deliveryWeightBrackets)
      .where(eq(deliveryWeightBrackets.configId, selected.id))
      .orderBy(asc(deliveryWeightBrackets.position)),
    database
      .select()
      .from(deliveryVehicleCategories)
      .where(eq(deliveryVehicleCategories.configId, selected.id))
      .orderBy(asc(deliveryVehicleCategories.position)),
    database
      .select()
      .from(deliveryFallbackRates)
      .where(eq(deliveryFallbackRates.configId, selected.id))
      .orderBy(asc(deliveryFallbackRates.originTown), asc(deliveryFallbackRates.destinationTown)),
  ]);

  return { config: selected, configs, fallbackRates, vehicles, weightBrackets };
}

export async function getPublicDeliveryPolicy() {
  const [config] = await getDatabase()
    .select()
    .from(deliveryPricingConfigs)
    .where(eq(deliveryPricingConfigs.serviceActive, true))
    .orderBy(desc(deliveryPricingConfigs.version))
    .limit(1);

  if (!config?.productionApproved) return null;
  return config;
}
