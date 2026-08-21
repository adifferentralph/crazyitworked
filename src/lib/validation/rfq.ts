import { z } from "zod";

const optionalText = (maximum: number) =>
  z.string().trim().max(maximum).transform((value) => value || null);
const optionalUuid = z.string().trim().transform((value) => value || null).pipe(z.string().uuid().nullable());
const money = z
  .string()
  .trim()
  .refine((value) => !value || /^\d{1,9}(?:\.\d{1,2})?$/.test(value), "Enter a valid NGN amount.")
  .transform((value) => {
    if (!value) return null;
    const [naira = "0", kobo = ""] = value.split(".");
    return Number(naira) * 100 + Number(kobo.padEnd(2, "0"));
  });

export const partRequestSchema = z
  .object({
    budgetMaxMinor: money,
    budgetMinMinor: money,
    categoryId: z.string().uuid("Choose a product category."),
    conditionPreferences: z
      .array(z.enum(["NEW", "USED", "REFURBISHED", "RECONDITIONED", "OEM_TAKE_OFF", "AFTERMARKET"]))
      .max(6),
    deliveryCity: z.string().trim().min(2, "Enter a delivery city.").max(100),
    deliveryState: z.string().trim().min(2, "Enter a delivery state.").max(100),
    description: z.string().trim().min(20, "Add enough detail for a seller to identify the part.").max(3000),
    manufacturerPartNumber: optionalText(120),
    oemPartNumber: optionalText(120),
    partName: z.string().trim().min(3, "Enter the part you need.").max(160),
    quantity: z.coerce.number().int().min(1).max(1000),
    savedVehicleId: optionalUuid,
  })
  .refine(
    (data) => data.budgetMinMinor === null || data.budgetMaxMinor === null || data.budgetMaxMinor >= data.budgetMinMinor,
    { message: "Maximum budget must be at least the minimum budget.", path: ["budgetMaxMinor"] },
  );

const optionalDate = z
  .string()
  .trim()
  .refine(
    (value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value),
    "Choose a valid quote expiry date.",
  )
  .transform((value) => (value ? `${value}T23:59:59.999Z` : null));
export const quoteSchema = z.object({
  deliveryFeeMinor: money.transform((value) => value ?? 0),
  estimatedDeliveryDays: z.union([z.literal(""), z.coerce.number().int().min(1).max(365)]).transform((value) => value === "" ? null : value),
  notes: optionalText(1500),
  productId: optionalUuid,
  quantity: z.coerce.number().int().min(1).max(1000),
  requestId: z.string().uuid(),
  unitPriceMinor: money.refine((value) => value !== null && value > 0, "Enter a valid unit price."),
  validUntil: optionalDate,
});

export const requestIdSchema = z.object({ requestId: z.string().uuid() });
export const quoteIdSchema = z.object({ quoteId: z.string().uuid() });