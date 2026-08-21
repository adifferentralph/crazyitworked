"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdminPermission } from "@/lib/auth/permissions";
import { requireRole } from "@/lib/auth/principal";
import {
  inventoryCsvSha256,
  MAX_INVENTORY_CSV_BYTES,
  normalizeInventoryRow,
  parseInventoryCsv,
  type NormalizedInventoryRow,
} from "@/lib/inventory/csv";
import type { SellerActionState } from "@/lib/marketplace/seller-action-state";
import { getProductFormOptions } from "@/lib/marketplace/seller-data";
import {
  getSafeImageExtension,
  priceInputToMinor,
  PRODUCT_MEDIA_BUCKET,
  requiredProductImageSlots,
  slugifyProduct,
  validateProductImage,
} from "@/lib/marketplace/products";
import { createClient } from "@/lib/supabase/server";
import type { Json, ProductImageType } from "@/lib/supabase/database.types";
import { getProductFormValues, productFormSchema } from "@/lib/validation/seller";

const uuidSchema = z.string().uuid();
const storedImportRowSchema = z.object({
  brand: z.string().min(1),
  categoryId: z.string().uuid(),
  city: z.string().min(1),
  condition: z.enum(["NEW", "USED", "REFURBISHED", "RECONDITIONED", "OEM_TAKE_OFF", "AFTERMARKET"]),
  description: z.string().min(1),
  fitmentIds: z.array(z.string().uuid()),
  manufacturerPartNumber: z.string(),
  name: z.string().min(3),
  oemPartNumber: z.string(),
  priceMinor: z.number().int().positive(),
  quantity: z.number().int().nonnegative(),
  sku: z.string().min(2),
  state: z.string().min(1),
});

function actionError(message: string, productId?: string): SellerActionState {
  return { message, productId, status: "error" };
}

function collectUploads(formData: FormData, actualItemType?: ProductImageType) {
  const uploads: Array<{ file: File; isActualItem: boolean; type: ProductImageType }> = [];
  for (const slot of requiredProductImageSlots) {
    const value = formData.get(slot.field);
    if (!(value instanceof File) || value.size === 0) continue;
    const error = validateProductImage(value);
    if (error) return { error: `${slot.label}: ${error}`, uploads: [] };
    uploads.push({ file: value, isActualItem: actualItemType === slot.type, type: slot.type });
  }
  return { error: null, uploads };
}

async function createDraftFromValues({
  actorId,
  creationSource,
  fitmentIds,
  sellerId,
  values,
}: {
  actorId: string;
  creationSource: "PLATFORM_ASSISTED" | "BULK_IMPORT";
  fitmentIds: string[];
  sellerId: string;
  values: {
    brand: string;
    categoryId: string;
    city: string;
    condition: "NEW" | "USED" | "REFURBISHED" | "RECONDITIONED" | "OEM_TAKE_OFF" | "AFTERMARKET";
    crossReferences: string[];
    deliveryAvailable: boolean;
    description: string;
    manufacturerPartNumber: string | null;
    name: string;
    oemPartNumber: string | null;
    pickupAvailable: boolean;
    priceMinor: number;
    quantity: number;
    sku: string;
    state: string;
  };
}) {
  const supabase = await createClient();
  const productId = randomUUID();
  const slug = `${slugifyProduct(values.name) || "part"}-${productId.slice(0, 8)}`;
  const { data, error } = await supabase.rpc("create_assisted_product_draft", {
    p_brand: values.brand,
    p_category_id: values.categoryId,
    p_city: values.city,
    p_condition: values.condition,
    p_creation_source: creationSource,
    p_cross_references: values.crossReferences,
    p_delivery_available: values.deliveryAvailable,
    p_description: values.description,
    p_fitment_ids: fitmentIds,
    p_manufacturer_part_number: values.manufacturerPartNumber,
    p_name: values.name,
    p_oem_part_number: values.oemPartNumber,
    p_pickup_available: values.pickupAvailable,
    p_price_minor: values.priceMinor,
    p_quantity: values.quantity,
    p_seller_id: sellerId,
    p_sku: values.sku,
    p_slug: slug,
    p_state: values.state,
  });
  return { actorId, error, productId: data ?? productId };
}

export async function createAssistedProductAction(
  _previousState: SellerActionState,
  formData: FormData,
): Promise<SellerActionState> {
  const parsed = productFormSchema.safeParse(getProductFormValues(formData));
  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors,
      message: "Check the highlighted fields and try again.",
      status: "error",
    };
  }
  const sellerId = uuidSchema.safeParse(formData.get("sellerId"));
  if (!sellerId.success) return actionError("Choose an eligible seller before creating a draft.");
  const principal = await requireAdminPermission("assist_seller_inventory", "/admin/inventory-onboarding/new");
  const collected = collectUploads(formData, parsed.data.actualItemType);
  if (collected.error) return actionError(collected.error);

  const created = await createDraftFromValues({
    actorId: principal.id,
    creationSource: "PLATFORM_ASSISTED",
    fitmentIds: parsed.data.fitmentIds,
    sellerId: sellerId.data,
    values: {
      brand: parsed.data.brand,
      categoryId: parsed.data.categoryId,
      city: parsed.data.city,
      condition: parsed.data.condition,
      crossReferences: parsed.data.crossReferences,
      deliveryAvailable: parsed.data.deliveryAvailable,
      description: parsed.data.description,
      manufacturerPartNumber: parsed.data.manufacturerPartNumber,
      name: parsed.data.name,
      oemPartNumber: parsed.data.oemPartNumber,
      pickupAvailable: parsed.data.pickupAvailable,
      priceMinor: priceInputToMinor(parsed.data.priceNgn),
      quantity: parsed.data.quantity,
      sku: parsed.data.sku,
      state: parsed.data.state,
    },
  });
  if (created.error) {
    return actionError(
      created.error.code === "23505"
        ? "That seller already uses this SKU. Choose a unique SKU."
        : "The assisted product draft could not be created.",
    );
  }

  const supabase = await createClient();
  for (const upload of collected.uploads) {
    const extension = getSafeImageExtension(upload.file.type);
    if (!extension) return actionError("An uploaded image has an unsupported type.", created.productId);
    const imageId = randomUUID();
    const storagePath = `${sellerId.data}/${created.productId}/${imageId}.${extension}`;
    const { error: uploadError } = await supabase.storage.from(PRODUCT_MEDIA_BUCKET).upload(
      storagePath,
      upload.file,
      { cacheControl: "31536000", contentType: upload.file.type, upsert: false },
    );
    if (uploadError) return actionError(`The draft was saved, but an image failed to upload: ${uploadError.message}`, created.productId);

    const { error: registerError } = await supabase.rpc("register_assisted_product_image", {
      p_is_actual_item: upload.isActualItem,
      p_mime_type: upload.file.type,
      p_original_filename: upload.file.name,
      p_product_id: created.productId,
      p_size_bytes: upload.file.size,
      p_storage_path: storagePath,
      p_type: upload.type,
    });
    if (registerError) {
      await supabase.storage.from(PRODUCT_MEDIA_BUCKET).remove([storagePath]);
      return actionError("The draft was saved, but image metadata could not be registered.", created.productId);
    }
  }

  revalidatePath("/admin/inventory-onboarding");
  redirect("/admin/inventory-onboarding?message=draft-created");
}

function resolveCategory(category: string, categories: Array<{ id: string; label: string }>) {
  const target = category.toLowerCase();
  const matches = categories.filter((option) => {
    const label = option.label.toLowerCase();
    return label === target || label.split(" / ").at(-1) === target;
  });
  return matches.length === 1 ? matches[0]!.id : null;
}

function resolveFitments(row: NormalizedInventoryRow, fitments: Array<{ id: string; label: string }>) {
  if (!row.vehicleMake) return [];
  return fitments.filter((fitment) => {
    const [year, make, model] = fitment.label.split(" · ");
    const numericYear = Number(year);
    return make?.toLowerCase() === row.vehicleMake.toLowerCase()
      && model?.toLowerCase() === row.vehicleModel.toLowerCase()
      && numericYear >= (row.yearFrom ?? numericYear)
      && numericYear <= (row.yearTo ?? row.yearFrom ?? numericYear);
  }).map((fitment) => fitment.id);
}

export async function uploadInventoryCsvAction(formData: FormData) {
  const principal = await requireAdminPermission("assist_seller_inventory", "/admin/inventory-onboarding/import");
  const sellerId = uuidSchema.safeParse(formData.get("sellerId"));
  const file = formData.get("inventoryCsv");
  if (!sellerId.success || !(file instanceof File) || file.size === 0) {
    redirect("/admin/inventory-onboarding/import?error=missing-input");
  }
  if (file.size > MAX_INVENTORY_CSV_BYTES || !["text/csv", "application/vnd.ms-excel", "text/plain"].includes(file.type)) {
    redirect("/admin/inventory-onboarding/import?error=invalid-file");
  }

  const bytes = await file.arrayBuffer();
  let records;
  try {
    records = parseInventoryCsv(new TextDecoder().decode(bytes));
  } catch (error) {
    const message = error instanceof Error ? error.message : "The CSV could not be parsed.";
    redirect(`/admin/inventory-onboarding/import?error=${encodeURIComponent(message)}`);
  }

  const supabase = await createClient();
  const [{ categories, fitments }, skuResult] = await Promise.all([
    getProductFormOptions(),
    supabase.rpc("inventory_onboarding_seller_skus" as never, { p_seller_id: sellerId.data } as never),
  ]);
  if (skuResult.error) redirect("/admin/inventory-onboarding/import?error=reference-data");
  const existingSkus = new Set(((skuResult.data ?? []) as unknown as Array<{ sku: string }>).map((item) => item.sku));
  const fileSkus = new Set<string>();

  const rows = records.map((record) => {
    const { errors, normalized } = normalizeInventoryRow(record);
    const categoryId = resolveCategory(normalized.category, categories);
    if (!categoryId) errors.push("Category does not uniquely match an active marketplace category.");
    const fitmentIds = resolveFitments(normalized, fitments);
    if (normalized.vehicleMake && fitmentIds.length === 0) errors.push("No seeded vehicle fitment matches this make, model, and year range.");
    const normalizedSku = normalized.sku.toLowerCase();
    const duplicate = existingSkus.has(normalizedSku) || fileSkus.has(normalizedSku);
    if (duplicate) errors.push("SKU duplicates an existing seller product or an earlier CSV row.");
    fileSkus.add(normalizedSku);
    return {
      normalized: { ...normalized, categoryId, fitmentIds },
      raw: record.raw,
      rowNumber: record.rowNumber,
      status: duplicate ? "DUPLICATE" as const : errors.length > 0 ? "INVALID" as const : "VALID" as const,
      validationErrors: errors,
    };
  });

  const counts = {
    duplicate: rows.filter((row) => row.status === "DUPLICATE").length,
    invalid: rows.filter((row) => row.status === "INVALID").length,
    valid: rows.filter((row) => row.status === "VALID").length,
  };
  const { data: importRecord, error: importError } = await supabase.from("inventory_imports").insert({
    created_by_user_id: principal.id,
    duplicate_rows: counts.duplicate,
    file_name: file.name.slice(0, 255),
    file_sha256: inventoryCsvSha256(bytes),
    invalid_rows: counts.invalid,
    seller_id: sellerId.data,
    status: counts.duplicate + counts.invalid > 0 ? "HAS_ERRORS" : "READY",
    total_rows: rows.length,
    valid_rows: counts.valid,
  }).select("id").single();
  if (importError || !importRecord) {
    redirect(`/admin/inventory-onboarding/import?error=${importError?.code === "23505" ? "duplicate-file" : "save-failed"}`);
  }

  const { error: rowsError } = await supabase.from("inventory_import_rows").insert(rows.map((row) => ({
    import_id: importRecord.id,
    normalized_data: row.normalized as unknown as Json,
    raw_data: row.raw,
    row_number: row.rowNumber,
    status: row.status,
    validation_errors: row.validationErrors,
  })));
  if (rowsError) redirect(`/admin/inventory-onboarding/imports/${importRecord.id}?error=rows-failed`);
  redirect(`/admin/inventory-onboarding/imports/${importRecord.id}`);
}

export async function commitInventoryImportAction(formData: FormData) {
  const principal = await requireAdminPermission("assist_seller_inventory", "/admin/inventory-onboarding");
  const importId = uuidSchema.safeParse(formData.get("importId"));
  if (!importId.success) redirect("/admin/inventory-onboarding?error=invalid-import");
  const supabase = await createClient();
  const { data: importRecord } = await supabase.from("inventory_imports").select("*")
    .eq("id", importId.data).eq("created_by_user_id", principal.id).single();
  if (!importRecord) redirect("/admin/inventory-onboarding?error=import-not-found");
  const { data: rows } = await supabase.from("inventory_import_rows").select("*")
    .eq("import_id", importRecord.id).eq("status", "VALID").order("row_number");

  for (const row of rows ?? []) {
    const parsed = storedImportRowSchema.safeParse(row.normalized_data);
    if (!parsed.success) {
      await supabase.from("inventory_import_rows").update({
        status: "INVALID",
        validation_errors: ["Stored normalized data failed validation."],
      }).eq("id", row.id);
      continue;
    }
    const values = parsed.data;
    const created = await createDraftFromValues({
      actorId: principal.id,
      creationSource: "BULK_IMPORT",
      fitmentIds: values.fitmentIds,
      sellerId: importRecord.seller_id,
      values: {
        ...values,
        crossReferences: [],
        deliveryAvailable: true,
        pickupAvailable: true,
      },
    });
    if (created.error) {
      await supabase.from("inventory_import_rows").update({
        status: "INVALID",
        validation_errors: [created.error.code === "23505" ? "SKU became a duplicate before import." : "Draft creation failed."],
      }).eq("id", row.id);
    } else {
      await supabase.from("inventory_import_rows").update({
        imported_at: new Date().toISOString(),
        product_id: created.productId,
        status: "IMPORTED",
      }).eq("id", row.id);
    }
  }

  const { data: finalRows } = await supabase.from("inventory_import_rows").select("status").eq("import_id", importRecord.id);
  const imported = finalRows?.filter((row) => row.status === "IMPORTED").length ?? 0;
  const invalid = finalRows?.filter((row) => row.status === "INVALID").length ?? 0;
  const duplicate = finalRows?.filter((row) => row.status === "DUPLICATE").length ?? 0;
  const valid = finalRows?.filter((row) => row.status === "VALID").length ?? 0;
  await supabase.from("inventory_imports").update({
    completed_at: valid === 0 ? new Date().toISOString() : null,
    duplicate_rows: duplicate,
    imported_rows: imported,
    invalid_rows: invalid,
    status: valid > 0 ? "READY" : invalid + duplicate > 0 ? "HAS_ERRORS" : "IMPORTED",
    valid_rows: imported + valid,
  }).eq("id", importRecord.id).eq("created_by_user_id", principal.id);

  revalidatePath("/admin/inventory-onboarding");
  redirect(`/admin/inventory-onboarding/imports/${importRecord.id}?message=processed`);
}

export async function confirmAssistedProductAction(formData: FormData) {
  const productId = uuidSchema.safeParse(formData.get("productId"));
  if (!productId.success) redirect("/seller/products");
  await requireRole(["SELLER"], `/seller/products/${productId.data}`);
  const supabase = await createClient();
  const { error } = await supabase.rpc("confirm_assisted_product", { p_product_id: productId.data });
  if (error) redirect(`/seller/products/${productId.data}?message=assisted-not-ready`);
  revalidatePath("/seller/products");
  redirect(`/seller/products/${productId.data}?message=assisted-submitted`);
}