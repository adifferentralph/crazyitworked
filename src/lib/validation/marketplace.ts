import { z } from "zod";

export const vehicleSelectionSchema = z.object({
  year: z.coerce
    .number()
    .int()
    .min(1900)
    .max(new Date().getFullYear() + 1)
    .optional(),
  make: z.string().trim().min(1).max(80).optional(),
  model: z.string().trim().min(1).max(120).optional(),
  variant: z.string().trim().min(1).max(120).optional(),
});

export const catalogSearchSchema = z.object({
  query: z.string().trim().max(120).default(""),
  page: z.coerce.number().int().min(0).max(200).default(0),
  category: z.string().trim().max(120).optional(),
  vendor: z.string().trim().max(160).optional(),
  location: z.string().trim().max(120).optional(),
  availability: z.enum(["in_stock", "low_stock", "out_of_stock", "preorder"]).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  rating: z.coerce.number().min(1).max(5).optional(),
  sponsored: z.coerce.boolean().optional(),
  sort: z
    .enum(["relevance", "price_asc", "price_desc", "rating_desc", "newest"])
    .default("relevance"),
  year: vehicleSelectionSchema.shape.year,
  make: vehicleSelectionSchema.shape.make,
  model: vehicleSelectionSchema.shape.model,
  variant: vehicleSelectionSchema.shape.variant,
});

export const uploadRequestSchema = z.object({
  filename: z.string().trim().min(3).max(180),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp", "application/pdf", "text/csv"]),
  size: z
    .number()
    .int()
    .min(1)
    .max(12 * 1024 * 1024),
  folder: z.enum(["products", "verification", "rfq", "chat", "imports"]),
});

export const checkoutLineItemSchema = z.object({
  name: z.string().trim().min(2).max(120),
  sku: z.string().trim().min(1).max(80),
  quantity: z.number().int().min(1).max(500),
  unitAmount: z.number().int().min(100),
  currency: z.string().trim().length(3).default("NGN"),
});

export const checkoutRequestSchema = z.object({
  orderId: z.string().trim().min(1).max(120),
  buyerEmail: z.string().email(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  lineItems: z.array(checkoutLineItemSchema).min(1).max(100),
});

export const rfqSchema = z.object({
  title: z.string().trim().min(4).max(140),
  description: z.string().trim().min(20).max(4000),
  quantity: z.number().int().min(1).max(100000),
  destinationCity: z.string().trim().min(2).max(120),
  destinationCountry: z.string().trim().min(2).max(120),
  targetCurrency: z.string().trim().length(3).default("NGN"),
  neededBy: z.number().int().optional(),
  attachmentUrls: z.array(z.string().url()).max(10).default([]),
});
