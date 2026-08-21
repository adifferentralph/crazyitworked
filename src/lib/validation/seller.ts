import { z } from "zod";

import type { ProductImageType } from "@/lib/supabase/database.types";

const requiredText = (label: string, minimum: number, maximum: number) =>
  z
    .string()
    .trim()
    .min(minimum, `${label} must be at least ${minimum} characters.`)
    .max(maximum, `${label} must be ${maximum} characters or fewer.`);

const optionalText = (maximum: number) =>
  z
    .string()
    .trim()
    .max(maximum)
    .transform((value) => value || null);

const checkbox = z.preprocess((value) => value === "on" || value === "true", z.boolean());

export const sellerOnboardingSchema = z.object({
  businessRegistrationNumber: requiredText("Registration number", 2, 100),
  city: requiredText("City", 2, 100),
  contactPhone: z
    .string()
    .trim()
    .regex(/^\+?[0-9][0-9\s-]{7,18}$/, "Enter a valid business phone number."),
  country: z.literal("Nigeria"),
  description: requiredText("Business description", 20, 1000),
  state: requiredText("State", 2, 100),
  storeName: requiredText("Store name", 2, 120),
  websiteUrl: z
    .string()
    .trim()
    .max(300)
    .refine((value) => !value || z.string().url().safeParse(value).success, "Enter a valid URL.")
    .transform((value) => value || null),
});

const priceInput = z
  .string()
  .trim()
  .regex(/^\d{1,9}(?:\.\d{1,2})?$/, "Enter a valid NGN amount without a currency symbol.");

const crossReferences = z
  .string()
  .max(2000)
  .transform((value) =>
    [...new Set(value.split(/[\n,]+/).map((item) => item.trim()).filter(Boolean))].slice(0, 30),
  );

export const productFormSchema = z
  .object({
    actualItemType: z
      .enum(["PRIMARY", "ANGLE", "DETAIL", "PART_NUMBER", "PACKAGING", "OTHER"])
      .optional(),
    brand: requiredText("Brand", 2, 100),
    categoryId: z.string().uuid("Choose a valid category."),
    city: requiredText("City", 2, 100),
    condition: z.enum([
      "NEW",
      "USED",
      "REFURBISHED",
      "RECONDITIONED",
      "OEM_TAKE_OFF",
      "AFTERMARKET",
    ]),
    country: z.literal("Nigeria"),
    crossReferences,
    deliveryAvailable: checkbox,
    description: requiredText("Description", 20, 5000),
    fitmentIds: z.array(z.string().uuid()).max(50),
    intent: z.enum(["save-draft", "submit-review"]),
    manufacturerPartNumber: optionalText(120),
    name: requiredText("Part name", 3, 160),
    oemPartNumber: optionalText(120),
    pickupAvailable: checkbox,
    priceNgn: priceInput,
    productId: z.string().uuid().optional(),
    quantity: z.coerce.number().int().min(0).max(1_000_000),
    sku: requiredText("SKU", 1, 100),
    state: requiredText("State", 2, 100),
  })
  .refine((data) => data.pickupAvailable || data.deliveryAvailable, {
    message: "Choose pickup, delivery, or both.",
    path: ["deliveryAvailable"],
  });

export function getSellerOnboardingValues(formData: FormData) {
  return {
    businessRegistrationNumber: formData.get("businessRegistrationNumber"),
    city: formData.get("city"),
    contactPhone: formData.get("contactPhone"),
    country: formData.get("country"),
    description: formData.get("description"),
    state: formData.get("state"),
    storeName: formData.get("storeName"),
    websiteUrl: formData.get("websiteUrl"),
  };
}

export function getProductFormValues(formData: FormData) {
  const actualItemValue = formData.get("actualItemType");

  return {
    actualItemType:
      typeof actualItemValue === "string" && actualItemValue
        ? (actualItemValue as ProductImageType)
        : undefined,
    brand: formData.get("brand"),
    categoryId: formData.get("categoryId"),
    city: formData.get("city"),
    condition: formData.get("condition"),
    country: formData.get("country"),
    crossReferences: formData.get("crossReferences"),
    deliveryAvailable: formData.get("deliveryAvailable"),
    description: formData.get("description"),
    fitmentIds: formData.getAll("fitmentIds").filter((value): value is string => typeof value === "string"),
    intent: formData.get("intent"),
    manufacturerPartNumber: formData.get("manufacturerPartNumber"),
    name: formData.get("name"),
    oemPartNumber: formData.get("oemPartNumber"),
    pickupAvailable: formData.get("pickupAvailable"),
    priceNgn: formData.get("priceNgn"),
    productId: formData.get("productId") || undefined,
    quantity: formData.get("quantity"),
    sku: formData.get("sku"),
    state: formData.get("state"),
  };
}

export type SellerOnboardingInput = z.infer<typeof sellerOnboardingSchema>;
export type ProductFormInput = z.infer<typeof productFormSchema>;
