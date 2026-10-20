"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getDatabase } from "@/db/client";
import { auditLogs, products } from "@/db/schema";
import { requireAdminPermission } from "@/lib/auth/permissions";
import { priceInputToMinor } from "@/lib/marketplace/products";

const productIdSchema = z.string().uuid();
const priceSchema = z
  .string()
  .trim()
  .regex(/^\d+(?:\.\d{1,2})?$/, "Enter a valid price in naira.")
  .refine((value) => priceInputToMinor(value) > 0, "Price must be greater than zero.");

const adminProductSchema = z
  .object({
    brand: z.string().trim().min(2).max(100),
    categoryId: z.string().uuid(),
    city: z.string().trim().min(2).max(100),
    condition: z.enum([
      "NEW",
      "USED",
      "REFURBISHED",
      "RECONDITIONED",
      "OEM_TAKE_OFF",
      "AFTERMARKET",
    ]),
    deliveryAvailable: z.boolean(),
    description: z.string().trim().min(20).max(5000),
    id: productIdSchema,
    manufacturerPartNumber: z.string().trim().max(120).optional(),
    name: z.string().trim().min(3).max(160),
    oemPartNumber: z.string().trim().max(120).optional(),
    pickupAvailable: z.boolean(),
    priceNgn: priceSchema,
    quantity: z.coerce.number().int().min(0).max(1_000_000),
    sku: z.string().trim().min(1).max(100),
    state: z.string().trim().min(2).max(100),
  })
  .refine((value) => value.pickupAvailable || value.deliveryAvailable, {
    message: "Choose pickup, delivery, or both.",
  });

function textField(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function optionalText(formData: FormData, name: string) {
  return textField(formData, name).trim() || undefined;
}

function refreshProductPages(productId: string, slug: string) {
  revalidatePath("/");
  revalidatePath("/marketplace");
  revalidatePath("/categories");
  revalidatePath(`/parts/${slug}`);
  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${productId}/edit`);
}

function actionError(error: unknown) {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? "Check the product information and try again.";
  }
  return "The product could not be updated. Check the information and try again.";
}

export async function updateAdminProductAction(formData: FormData) {
  const principal = await requireAdminPermission("products.edit", "/admin/products");
  const parsed = adminProductSchema.safeParse({
    brand: textField(formData, "brand"),
    categoryId: textField(formData, "categoryId"),
    city: textField(formData, "city"),
    condition: textField(formData, "condition"),
    deliveryAvailable: formData.get("deliveryAvailable") === "on",
    description: textField(formData, "description"),
    id: textField(formData, "id"),
    manufacturerPartNumber: optionalText(formData, "manufacturerPartNumber"),
    name: textField(formData, "name"),
    oemPartNumber: optionalText(formData, "oemPartNumber"),
    pickupAvailable: formData.get("pickupAvailable") === "on",
    priceNgn: textField(formData, "priceNgn"),
    quantity: textField(formData, "quantity"),
    sku: textField(formData, "sku"),
    state: textField(formData, "state"),
  });

  const productId = textField(formData, "id");
  if (!parsed.success) {
    redirect(`/admin/products/${productId}/edit?error=${encodeURIComponent(actionError(parsed.error))}`);
  }

  const database = getDatabase();
  const [current] = await database.select().from(products).where(eq(products.id, parsed.data.id)).limit(1);
  if (!current) redirect("/admin/products?error=Product%20not%20found.");

  try {
    await database.transaction(async (transaction) => {
      await transaction
        .update(products)
        .set({
          brand: parsed.data.brand,
          categoryId: parsed.data.categoryId,
          city: parsed.data.city,
          condition: parsed.data.condition,
          deliveryAvailable: parsed.data.deliveryAvailable,
          description: parsed.data.description,
          lastModifiedByUserId: principal.id,
          manufacturerPartNumber: parsed.data.manufacturerPartNumber ?? null,
          name: parsed.data.name,
          oemPartNumber: parsed.data.oemPartNumber ?? null,
          pickupAvailable: parsed.data.pickupAvailable,
          priceMinor: priceInputToMinor(parsed.data.priceNgn),
          quantity: parsed.data.quantity,
          sku: parsed.data.sku,
          state: parsed.data.state,
        })
        .where(eq(products.id, parsed.data.id));
      await transaction.insert(auditLogs).values({
        action: "PRODUCT_EDITED_BY_ADMIN",
        actorUserId: principal.id,
        newValue: parsed.data,
        objectId: parsed.data.id,
        objectType: "PRODUCT",
        previousValue: current,
        reason: "Administrator updated an existing marketplace product.",
      });
    });
  } catch (error) {
    redirect(`/admin/products/${parsed.data.id}/edit?error=${encodeURIComponent(actionError(error))}`);
  }

  refreshProductPages(parsed.data.id, current.slug);
  redirect(`/admin/products/${parsed.data.id}/edit?message=updated`);
}

export async function setAdminProductPublicationAction(formData: FormData) {
  const principal = await requireAdminPermission("products.edit", "/admin/products");
  const parsed = z
    .object({
      action: z.enum(["unpublish", "restore"]),
      id: productIdSchema,
      reason: z.string().trim().min(5).max(500),
    })
    .safeParse({
      action: textField(formData, "action"),
      id: textField(formData, "id"),
      reason: textField(formData, "reason"),
    });
  const productId = textField(formData, "id");
  if (!parsed.success) {
    redirect(`/admin/products/${productId}/edit?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Explain this change.")}`);
  }

  const database = getDatabase();
  const [current] = await database.select().from(products).where(eq(products.id, parsed.data.id)).limit(1);
  if (!current) redirect("/admin/products?error=Product%20not%20found.");
  const requestedStatus = parsed.data.action === "unpublish" ? "SUSPENDED" : "PENDING_REVIEW";

  try {
    await database.transaction(async (transaction) => {
      await transaction
        .update(products)
        .set({ lastModifiedByUserId: principal.id, status: requestedStatus })
        .where(eq(products.id, parsed.data.id));
      await transaction.insert(auditLogs).values({
        action:
          parsed.data.action === "unpublish"
            ? "PRODUCT_UNPUBLISHED_BY_ADMIN"
            : "PRODUCT_RESTORED_BY_ADMIN",
        actorUserId: principal.id,
        newValue: { requestedStatus },
        objectId: parsed.data.id,
        objectType: "PRODUCT",
        previousValue: { status: current.status },
        reason: parsed.data.reason,
      });
    });
  } catch {
    redirect(`/admin/products/${parsed.data.id}/edit?error=${encodeURIComponent("The publication status could not be changed. Confirm that the product still meets marketplace requirements.")}`);
  }

  refreshProductPages(parsed.data.id, current.slug);
  redirect(`/admin/products/${parsed.data.id}/edit?message=${parsed.data.action === "unpublish" ? "unpublished" : "restored"}`);
}
