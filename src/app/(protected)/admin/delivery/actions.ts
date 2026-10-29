"use server";

import { and, eq, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getDatabase } from "@/db/client";
import {
  auditLogs,
  deliveryFallbackRates,
  deliveryPricingConfigs,
  deliveryVehicleCategories,
  deliveryWeightBrackets,
} from "@/db/schema";
import { requireAdminPermission } from "@/lib/auth/permissions";
import { priceInputToMinor } from "@/lib/marketplace/products";

const money = z.string().trim().regex(/^\d{1,9}(?:\.\d{1,2})?$/);
const optionalPositiveInteger = z.preprocess(
  (value) => (value === "" || value === null ? null : value),
  z.coerce.number().int().positive().nullable(),
);

function value(formData: FormData, name: string) {
  const entry = formData.get(name);
  return typeof entry === "string" ? entry.trim() : "";
}

function errorRedirect(message: string): never {
  redirect(`/admin/delivery?error=${encodeURIComponent(message)}`);
}

function moneyMinor(input: string) {
  return priceInputToMinor(input);
}

const configSchema = z.object({
  baseCharge: money,
  bulkySurcharge: money,
  costPerKm: money,
  fragileSurcharge: money,
  handlingCharge: money,
  handlingMaxDays: z.coerce.number().int().min(0).max(30),
  handlingMinDays: z.coerce.number().int().min(0).max(30),
  manualQuoteAboveGrams: optionalPositiveInteger,
  manualQuoteAboveVolumeMm3: optionalPositiveInteger,
  marketplaceMarkup: money,
  maximumAutomaticFee: money,
  minimumCharge: money,
  name: z.string().min(2).max(120),
  returnFees: z.enum(["", "FREE_RETURN", "RETURN_SHIPPING_FEES"]),
  returnMethod: z.enum(["", "RETURN_BY_MAIL", "RETURN_IN_STORE"]),
  returnPolicyActive: z.boolean(),
  returnWindowDays: optionalPositiveInteger,
  roundingStepMinor: z.coerce.number().int().positive().max(100_000),
  transitMaxDays: z.coerce.number().int().min(0).max(60),
  transitMinDays: z.coerce.number().int().min(0).max(60),
}).superRefine((input, context) => {
  if (input.handlingMaxDays < input.handlingMinDays || input.transitMaxDays < input.transitMinDays) {
    context.addIssue({ code: "custom", message: "Maximum delivery days cannot be lower than minimum days." });
  }
  if (input.returnPolicyActive && (!input.returnWindowDays || !input.returnFees || !input.returnMethod)) {
    context.addIssue({ code: "custom", message: "Complete the return policy before enabling it." });
  }
});

export async function createDeliveryConfigAction(formData: FormData) {
  const principal = await requireAdminPermission("admin.manage", "/admin/delivery");
  const parsed = configSchema.safeParse({
    baseCharge: value(formData, "baseCharge"),
    bulkySurcharge: value(formData, "bulkySurcharge"),
    costPerKm: value(formData, "costPerKm"),
    fragileSurcharge: value(formData, "fragileSurcharge"),
    handlingCharge: value(formData, "handlingCharge"),
    handlingMaxDays: value(formData, "handlingMaxDays"),
    handlingMinDays: value(formData, "handlingMinDays"),
    manualQuoteAboveGrams: value(formData, "manualQuoteAboveGrams"),
    manualQuoteAboveVolumeMm3: value(formData, "manualQuoteAboveVolumeMm3"),
    marketplaceMarkup: value(formData, "marketplaceMarkup"),
    maximumAutomaticFee: value(formData, "maximumAutomaticFee"),
    minimumCharge: value(formData, "minimumCharge"),
    name: value(formData, "name"),
    returnFees: value(formData, "returnFees"),
    returnMethod: value(formData, "returnMethod"),
    returnPolicyActive: formData.get("returnPolicyActive") === "on",
    returnWindowDays: value(formData, "returnWindowDays"),
    roundingStepMinor: value(formData, "roundingStepMinor"),
    transitMaxDays: value(formData, "transitMaxDays"),
    transitMinDays: value(formData, "transitMinDays"),
  });
  if (!parsed.success) errorRedirect(parsed.error.issues[0]?.message ?? "Check the delivery settings.");

  const database = getDatabase();
  const [versionRow] = await database.select({ value: max(deliveryPricingConfigs.version) }).from(deliveryPricingConfigs);
  const nextVersion = (versionRow?.value ?? 0) + 1;
  const input = parsed.data;
  const [created] = await database.insert(deliveryPricingConfigs).values({
    baseChargeMinor: moneyMinor(input.baseCharge),
    bulkySurchargeMinor: moneyMinor(input.bulkySurcharge),
    costPerKmMinor: moneyMinor(input.costPerKm),
    createdBy: principal.id,
    fragileSurchargeMinor: moneyMinor(input.fragileSurcharge),
    handlingChargeMinor: moneyMinor(input.handlingCharge),
    handlingMaxDays: input.handlingMaxDays,
    handlingMinDays: input.handlingMinDays,
    manualQuoteAboveGrams: input.manualQuoteAboveGrams,
    manualQuoteAboveVolumeMm3: input.manualQuoteAboveVolumeMm3,
    marketplaceMarkupMinor: moneyMinor(input.marketplaceMarkup),
    maximumAutomaticFeeMinor: moneyMinor(input.maximumAutomaticFee),
    minimumChargeMinor: moneyMinor(input.minimumCharge),
    name: input.name,
    productionApproved: false,
    returnFees: input.returnPolicyActive ? input.returnFees : null,
    returnMethod: input.returnPolicyActive ? input.returnMethod : null,
    returnPolicyActive: input.returnPolicyActive,
    returnWindowDays: input.returnPolicyActive ? input.returnWindowDays : null,
    roundingStepMinor: input.roundingStepMinor,
    serviceActive: false,
    transitMaxDays: input.transitMaxDays,
    transitMinDays: input.transitMinDays,
    version: nextVersion,
  }).returning({ id: deliveryPricingConfigs.id });
  if (!created) errorRedirect("The delivery configuration could not be created.");
  await database.insert(auditLogs).values({
    action: "DELIVERY_CONFIG_CREATED",
    actorUserId: principal.id,
    newValue: { name: input.name, version: nextVersion },
    objectId: created.id,
    objectType: "DELIVERY_CONFIG",
  });
  revalidatePath("/admin/delivery");
  redirect("/admin/delivery?message=Pricing+version+created+inactive.+Add+vehicles+and+fallback+routes+before+activation.");
}

export async function addWeightBracketAction(formData: FormData) {
  await requireAdminPermission("admin.manage", "/admin/delivery");
  const parsed = z.object({
    configId: z.string().uuid(),
    maxGrams: optionalPositiveInteger,
    minGrams: z.coerce.number().int().min(0),
    position: z.coerce.number().int().min(0).max(1000),
    surcharge: money,
  }).safeParse({
    configId: value(formData, "configId"),
    maxGrams: value(formData, "maxGrams"),
    minGrams: value(formData, "minGrams"),
    position: value(formData, "position") || "0",
    surcharge: value(formData, "surcharge"),
  });
  if (!parsed.success || (parsed.data.maxGrams !== null && parsed.data.maxGrams <= parsed.data.minGrams)) {
    errorRedirect("Enter a valid weight bracket.");
  }
  await getDatabase().insert(deliveryWeightBrackets).values({
    configId: parsed.data.configId,
    maxGrams: parsed.data.maxGrams,
    minGrams: parsed.data.minGrams,
    position: parsed.data.position,
    surchargeMinor: moneyMinor(parsed.data.surcharge),
  });
  revalidatePath("/admin/delivery");
}

export async function addVehicleCategoryAction(formData: FormData) {
  await requireAdminPermission("admin.manage", "/admin/delivery");
  const parsed = z.object({
    code: z.string().trim().regex(/^[A-Z0-9_]{2,30}$/),
    configId: z.string().uuid(),
    maxHeightMm: optionalPositiveInteger,
    maxLengthMm: optionalPositiveInteger,
    maxWeightGrams: z.coerce.number().int().positive(),
    maxWidthMm: optionalPositiveInteger,
    name: z.string().trim().min(2).max(80),
    position: z.coerce.number().int().min(0).max(1000),
    surcharge: money,
  }).safeParse({
    code: value(formData, "code").toUpperCase().replace(/\s+/g, "_"),
    configId: value(formData, "configId"),
    maxHeightMm: value(formData, "maxHeightMm"),
    maxLengthMm: value(formData, "maxLengthMm"),
    maxWeightGrams: value(formData, "maxWeightGrams"),
    maxWidthMm: value(formData, "maxWidthMm"),
    name: value(formData, "name"),
    position: value(formData, "position") || "0",
    surcharge: value(formData, "surcharge"),
  });
  if (!parsed.success) errorRedirect("Enter valid vehicle limits and pricing.");
  const { surcharge, ...vehicle } = parsed.data;
  await getDatabase().insert(deliveryVehicleCategories).values({
    ...vehicle,
    surchargeMinor: moneyMinor(surcharge),
  });
  revalidatePath("/admin/delivery");
}

export async function addFallbackRateAction(formData: FormData) {
  await requireAdminPermission("admin.manage", "/admin/delivery");
  const parsed = z.object({
    configId: z.string().uuid(),
    destinationTown: z.string().trim().min(2).max(100),
    distanceKm: z.preprocess((entry) => entry === "" ? null : entry, z.coerce.number().positive().nullable()),
    fee: money,
    originTown: z.string().trim().min(2).max(100),
  }).safeParse({
    configId: value(formData, "configId"),
    destinationTown: value(formData, "destinationTown"),
    distanceKm: value(formData, "distanceKm"),
    fee: value(formData, "fee"),
    originTown: value(formData, "originTown"),
  });
  if (!parsed.success) errorRedirect("Enter a valid fallback route and fee.");
  await getDatabase().insert(deliveryFallbackRates).values({
    configId: parsed.data.configId,
    destinationTown: parsed.data.destinationTown,
    distanceKm: parsed.data.distanceKm,
    feeMinor: moneyMinor(parsed.data.fee),
    originTown: parsed.data.originTown,
  });
  revalidatePath("/admin/delivery");
}

export async function activateDeliveryConfigAction(formData: FormData) {
  const principal = await requireAdminPermission("admin.manage", "/admin/delivery");
  const configId = z.string().uuid().safeParse(value(formData, "configId"));
  if (!configId.success) errorRedirect("Choose a valid pricing version.");
  const database = getDatabase();
  const [config, vehicles, fallback] = await Promise.all([
    database.select().from(deliveryPricingConfigs).where(eq(deliveryPricingConfigs.id, configId.data)).limit(1),
    database.select({ id: deliveryVehicleCategories.id }).from(deliveryVehicleCategories).where(and(eq(deliveryVehicleCategories.configId, configId.data), eq(deliveryVehicleCategories.isActive, true))).limit(1),
    database.select({ id: deliveryFallbackRates.id }).from(deliveryFallbackRates).where(and(eq(deliveryFallbackRates.configId, configId.data), eq(deliveryFallbackRates.isActive, true))).limit(1),
  ]);
  if (!config[0]) errorRedirect("Pricing version not found.");
  if (!vehicles.length) errorRedirect("Add at least one delivery vehicle category before activation.");
  if (!fallback.length && !process.env.GOOGLE_MAPS_ROUTES_API_KEY) {
    errorRedirect("Add at least one fallback town rate or configure the server routing key before activation.");
  }
  await database.transaction(async (transaction) => {
    await transaction.update(deliveryPricingConfigs).set({ productionApproved: false, serviceActive: false, updatedAt: new Date() });
    await transaction.update(deliveryPricingConfigs).set({ productionApproved: true, serviceActive: true, updatedAt: new Date() }).where(eq(deliveryPricingConfigs.id, configId.data));
    await transaction.insert(auditLogs).values({
      action: "DELIVERY_CONFIG_ACTIVATED",
      actorUserId: principal.id,
      newValue: { version: config[0]?.version },
      objectId: configId.data,
      objectType: "DELIVERY_CONFIG",
    });
  });
  revalidatePath("/admin/delivery");
  revalidatePath("/checkout");
  redirect("/admin/delivery?message=Delivery+pricing+is+active.");
}

export async function deactivateDeliveryAction(formData: FormData) {
  const principal = await requireAdminPermission("admin.manage", "/admin/delivery");
  const configId = z.string().uuid().safeParse(value(formData, "configId"));
  if (!configId.success) errorRedirect("Choose a valid pricing version.");
  await getDatabase().transaction(async (transaction) => {
    await transaction.update(deliveryPricingConfigs).set({ serviceActive: false, updatedAt: new Date() }).where(eq(deliveryPricingConfigs.id, configId.data));
    await transaction.insert(auditLogs).values({ action: "DELIVERY_CONFIG_DEACTIVATED", actorUserId: principal.id, objectId: configId.data, objectType: "DELIVERY_CONFIG" });
  });
  revalidatePath("/admin/delivery");
}
