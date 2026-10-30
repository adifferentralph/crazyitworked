"use server";

import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getDatabase } from "@/db/client";
import { productShippingProfiles, sellerPickupLocations } from "@/db/schema";
import { requireRole } from "@/lib/auth/principal";
import type { SellerActionState } from "@/lib/marketplace/seller-action-state";
import {
  canSellerEditProduct,
  conditionRequiresActualItem,
  getSafeImageExtension,
  isPublishedSellerProduct,
  priceInputToMinor,
  PRODUCT_MEDIA_BUCKET,
  requiredProductImageSlots,
  slugifyProduct,
  validateProductImageMetadata,
} from "@/lib/marketplace/products";
import { createClient } from "@/lib/supabase/server";
import type { ProductCondition, ProductImageType } from "@/lib/supabase/database.types";
import {
  getProductFormValues,
  getSellerOnboardingValues,
  productFormSchema,
  sellerOnboardingSchema,
} from "@/lib/validation/seller";

function validationError(error: z.ZodError): SellerActionState {
  return {
    fieldErrors: error.flatten().fieldErrors,
    message: "Check the highlighted fields and try again.",
    status: "error",
  };
}

function databaseError(message: string, field?: string): SellerActionState {
  return {
    fieldErrors: field ? { [field]: [message] } : undefined,
    message,
    status: "error",
  };
}

export async function completeSellerOnboardingAction(
  _previousState: SellerActionState,
  formData: FormData,
): Promise<SellerActionState> {
  const parsed = sellerOnboardingSchema.safeParse(getSellerOnboardingValues(formData));
  if (!parsed.success) return validationError(parsed.error);

  const principal = await requireRole(["SELLER"], "/seller/onboarding");
  const supabase = await createClient();
  const completedAt = new Date().toISOString();
  const { error: profileError } = await supabase
    .from("seller_profiles")
    .update({
      business_registration_number: parsed.data.businessRegistrationNumber,
      city: parsed.data.city,
      contact_phone: parsed.data.contactPhone,
      country: parsed.data.country,
      description: parsed.data.description,
      onboarding_completed_at: completedAt,
      state: parsed.data.state,
      store_name: parsed.data.storeName,
      website_url: parsed.data.websiteUrl,
    })
    .eq("user_id", principal.id);

  if (profileError) {
    return databaseError("We could not save the supplier profile. Please try again.");
  }

  const { error: clearCategoriesError } = await supabase
    .from("seller_categories")
    .delete()
    .eq("seller_id", principal.id);
  if (clearCategoriesError) {
    return databaseError("Your profile was saved, but product categories could not be updated.");
  }
  const { error: categoryError } = await supabase.from("seller_categories").insert(
    parsed.data.categoryIds.map((categoryId, index) => ({
      category_id: categoryId,
      is_primary: index === 0,
      seller_id: principal.id,
    })),
  );
  if (categoryError) {
    return databaseError("Your profile was saved, but product categories could not be updated.");
  }
  const { error: verificationError } = await supabase
    .from("seller_verifications")
    .update({
      status: parsed.data.businessRegistrationNumber ? "SUBMITTED" : "DRAFT",
      submitted_at: parsed.data.businessRegistrationNumber ? completedAt : null,
    })
    .eq("seller_id", principal.id);

  if (verificationError) {
    return databaseError(
      "Your profile was saved, but verification submission could not be completed. Try again.",
    );
  }

  revalidatePath("/seller");
  redirect("/seller/dashboard?message=onboarding-complete");
}

const productImageTypeSchema = z.enum([
  "PRIMARY",
  "ANGLE",
  "DETAIL",
  "PART_NUMBER",
  "PACKAGING",
  "OTHER",
]);

const imageUploadManifestSchema = z
  .array(
    z.object({
      field: z.string().min(1).max(80),
      mimeType: z.string().min(1).max(100),
      originalFilename: z.string().min(1).max(255),
      sizeBytes: z.number().int().positive(),
      type: productImageTypeSchema,
    }),
  )
  .max(requiredProductImageSlots.length);

const uploadedImageReferenceSchema = imageUploadManifestSchema.element.extend({
  imageId: z.string().uuid(),
  storagePath: z.string().min(1).max(600),
});

const uploadedImagesSchema = z.array(uploadedImageReferenceSchema).max(requiredProductImageSlots.length);

type ImageUploadManifestItem = z.infer<typeof imageUploadManifestSchema>[number];
type UploadedImageReference = z.infer<typeof uploadedImageReferenceSchema>;

export type PreparedProductUpload = ImageUploadManifestItem & {
  imageId: string;
  storagePath: string;
  token: string;
};

export type ProductUploadPreparationState = SellerActionState & {
  uploads?: PreparedProductUpload[];
};

function parseJsonField<T>(value: FormDataEntryValue | null, schema: z.ZodType<T[]>) {
  if (typeof value !== "string" || value.length === 0) return { data: [], error: null };
  try {
    const parsed = schema.safeParse(JSON.parse(value));
    return parsed.success
      ? { data: parsed.data, error: null }
      : { data: null, error: "The selected product photos could not be prepared." };
  } catch {
    return { data: null, error: "The selected product photos could not be prepared." };
  }
}

function validateImageManifestItems(items: ImageUploadManifestItem[]) {
  const usedFields = new Set<string>();
  const usedTypes = new Set<ProductImageType>();
  for (const item of items) {
    const slot = requiredProductImageSlots.find(
      (candidate) => candidate.field === item.field && candidate.type === item.type,
    );
    if (!slot || usedFields.has(item.field) || usedTypes.has(item.type)) {
      return "The selected product photos contain a duplicate or invalid image slot.";
    }
    const error = validateProductImageMetadata({
      name: item.originalFilename,
      size: item.sizeBytes,
      type: item.mimeType,
    });
    if (error) return `${slot.label}: ${error}`;
    usedFields.add(item.field);
    usedTypes.add(item.type);
  }
  return null;
}

function collectUploadedImageReferences(formData: FormData) {
  const parsed = parseJsonField(formData.get("uploadedImages"), uploadedImagesSchema);
  if (parsed.error || !parsed.data) return { error: parsed.error, uploads: [] };
  const error = validateImageManifestItems(parsed.data);
  return { error, uploads: error ? [] : parsed.data };
}

function collectRemovedImageTypes(formData: FormData) {
  const values = formData
    .getAll("removeImageTypes")
    .filter((value): value is string => typeof value === "string");
  return [...new Set(values.flatMap((value) => {
    const parsed = productImageTypeSchema.safeParse(value);
    return parsed.success ? [parsed.data] : [];
  }))];
}

function requestIdFrom(formData: FormData) {
  const value = formData.get("requestId");
  return typeof value === "string" && /^[a-zA-Z0-9-]{8,80}$/.test(value) ? value : undefined;
}

function logProductActionFailure(details: {
  action: string;
  category: string;
  code?: string;
  productId?: string;
  requestId?: string;
}) {
  console.error("seller_product_action_failed", {
    action: details.action,
    category: details.category,
    code: details.code,
    method: "POST",
    productId: details.productId,
    requestId: details.requestId,
    route: "/seller/products",
  });
}

async function ensureSellerOnboarded(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("seller_profiles")
    .select("onboarding_completed_at")
    .eq("user_id", userId)
    .single();

  return !error && Boolean(data?.onboarding_completed_at);
}

async function applyProductImageChanges({
  actualItemType,
  condition,
  productId,
  removeTypes,
  sellerId,
  shouldPublish,
  uploads,
}: {
  actualItemType?: ProductImageType;
  condition: ProductCondition;
  productId: string;
  removeTypes: ProductImageType[];
  sellerId: string;
  shouldPublish: boolean;
  uploads: UploadedImageReference[];
}) {
  if (uploads.length === 0 && removeTypes.length === 0) return null;

  const supabase = await createClient();
  const { data: currentImages, error: currentImagesError } = await supabase
    .from("product_images")
    .select("id, is_active, is_actual_item, is_primary, position, type")
    .eq("product_id", productId)
    .order("position", { ascending: false });

  if (currentImagesError) return "Existing product images could not be checked.";

  const replacementTypes = new Set(uploads.map((upload) => upload.type));
  const actualType = actualItemType ?? "PRIMARY";
  const effectiveRemoveTypes = new Set(
    removeTypes.filter((type) => !replacementTypes.has(type)),
  );
  const retainedImages = (currentImages ?? []).filter(
    (image) =>
      image.is_active &&
      !replacementTypes.has(image.type) &&
      !effectiveRemoveTypes.has(image.type),
  );
  const resultingImages = [
    ...retainedImages.map((image) => ({
      isActualItem: image.is_actual_item,
      isPrimary: image.is_primary,
    })),
    ...uploads.map((upload) => ({
      isActualItem: upload.type === actualType,
      isPrimary: upload.type === "PRIMARY",
    })),
  ];
  if (shouldPublish) {
    if (resultingImages.length < 5 || !resultingImages.some((image) => image.isPrimary)) {
      return "Keep at least five product photos, including one main photo, before publishing.";
    }
    if (
      conditionRequiresActualItem(condition) &&
      !resultingImages.some((image) => image.isActualItem)
    ) {
      return "The main photo must show the actual physical item being sold.";
    }
  }

  const folder = `${sellerId}/${productId}`;
  const storedChecks = await Promise.all(
    uploads.map(async (upload) => {
      const expectedPrefix = `${folder}/${upload.imageId}.`;
      if (!upload.storagePath.startsWith(expectedPrefix)) return false;
      const filename = upload.storagePath.slice(folder.length + 1);
      const { data, error } = await supabase.storage
        .from(PRODUCT_MEDIA_BUCKET)
        .list(folder, { limit: 2, search: filename });
      return !error && Boolean(data?.some((file) => file.name === filename));
    }),
  );
  if (storedChecks.some((stored) => !stored)) {
    return "One or more product photos did not finish uploading. Your product details are still here; try the upload again.";
  }

  const nextPosition = (currentImages?.[0]?.position ?? -1) + 1;
  const readyUploads = uploads.map((upload, index) => ({
    imageId: upload.imageId,
    position: nextPosition + index,
    storagePath: upload.storagePath,
    upload,
  }));

  const insertedImageIds: string[] = [];
  const deactivatedImageIds: string[] = [];
  const rollbackImageChanges = async () => {
    if (insertedImageIds.length > 0) {
      await supabase
        .from("product_images")
        .delete()
        .eq("product_id", productId)
        .in("id", insertedImageIds);
    }
    if (deactivatedImageIds.length > 0) {
      await supabase
        .from("product_images")
        .update({ is_active: true })
        .eq("product_id", productId)
        .in("id", deactivatedImageIds);
    }
  };

  const typesToDeactivate = new Set([...replacementTypes, ...effectiveRemoveTypes]);
  const imageIdsToDeactivate = (currentImages ?? [])
    .filter((image) => image.is_active && typesToDeactivate.has(image.type))
    .map((image) => image.id);
  if (imageIdsToDeactivate.length > 0) {
    const { error: deactivateError } = await supabase
      .from("product_images")
      .update({ is_active: false })
      .eq("product_id", productId)
      .in("id", imageIdsToDeactivate);
    if (deactivateError) return "The previous image could not be preserved.";
    deactivatedImageIds.push(...imageIdsToDeactivate);
  }

  for (const { imageId, position, storagePath, upload } of readyUploads) {
    const { error: metadataError } = await supabase.from("product_images").insert({
      id: imageId,
      is_actual_item: upload.type === actualType,
      is_primary: upload.type === "PRIMARY",
      mime_type: upload.mimeType,
      original_filename: upload.originalFilename.slice(0, 255),
      position,
      product_id: productId,
      size_bytes: upload.sizeBytes,
      source: "SELLER_ORIGINAL",
      storage_bucket: PRODUCT_MEDIA_BUCKET,
      storage_path: storagePath,
      type: upload.type,
      uploaded_by: sellerId,
    });

    if (metadataError) {
      await rollbackImageChanges();
      return "Image metadata could not be saved. The listing remains a draft.";
    }
    insertedImageIds.push(imageId);
  }

  return null;
}

async function replaceProductAssociations({
  crossReferences,
  fitmentIds,
  productId,
}: {
  crossReferences: string[];
  fitmentIds: string[];
  productId: string;
}) {
  const supabase = await createClient();
  const [crossReferenceDelete, fitmentDelete] = await Promise.all([
    supabase.from("product_cross_references").delete().eq("product_id", productId),
    supabase.from("product_fitments").delete().eq("product_id", productId),
  ]);

  if (crossReferenceDelete.error || fitmentDelete.error) {
    return "Existing identification or fitment records could not be updated.";
  }

  if (crossReferences.length > 0) {
    const { error } = await supabase.from("product_cross_references").insert(
      crossReferences.map((referenceNumber) => ({
        product_id: productId,
        reference_number: referenceNumber,
      })),
    );
    if (error) return "Cross-reference numbers could not be saved.";
  }

  if (fitmentIds.length > 0) {
    const { error } = await supabase.from("product_fitments").insert(
      fitmentIds.map((fitmentId, index) => ({
        fitment_id: fitmentId,
        is_primary: index === 0,
        product_id: productId,
      })),
    );
    if (error) return "Vehicle compatibility could not be saved.";
  }

  return null;
}

function submissionImageError(
  condition: ProductCondition,
  uploads: UploadedImageReference[],
  isNewProduct: boolean,
  actualItemType?: ProductImageType,
) {
  if (!isNewProduct) return null;

  if (uploads.length < 5) {
    return "Add five genuine photos of this product before publishing. Save a draft if the photos are not ready.";
  }

  const actualType = actualItemType ?? "PRIMARY";
  if (
    conditionRequiresActualItem(condition) &&
    !uploads.some((upload) => upload.type === actualType)
  ) {
    return "The main photo must show the actual physical item being sold.";
  }

  return null;
}

type PickupLocation = {
  id: string;
  state: string;
  town: string;
  verifiedAt: Date | null;
};

async function getOwnedPickupLocation(sellerId: string, locationId: string | null) {
  if (!locationId) return null;
  const [location] = await getDatabase()
    .select({
      id: sellerPickupLocations.id,
      state: sellerPickupLocations.state,
      town: sellerPickupLocations.town,
      verifiedAt: sellerPickupLocations.verifiedAt,
    })
    .from(sellerPickupLocations)
    .where(
      and(
        eq(sellerPickupLocations.id, locationId),
        eq(sellerPickupLocations.sellerId, sellerId),
        eq(sellerPickupLocations.isActive, true),
      ),
    )
    .limit(1);
  return location ?? null;
}

function productValues(
  parsed: z.infer<typeof productFormSchema>,
  sku: string,
  pickupLocation: PickupLocation | null,
) {
  return {
    brand: parsed.brand,
    category_id: parsed.categoryId,
    city: pickupLocation?.town ?? parsed.city,
    condition: parsed.condition,
    country: parsed.country,
    delivery_available: parsed.deliveryAvailable,
    delivery_fee_minor: parsed.deliveryAvailable ? priceInputToMinor(parsed.deliveryFeeNgn) : 0,
    description: parsed.description,
    manufacturer_part_number: parsed.manufacturerPartNumber,
    name: parsed.name,
    oem_part_number: parsed.oemPartNumber,
    pickup_available: parsed.pickupAvailable,
    price_minor: priceInputToMinor(parsed.priceNgn),
    quantity: parsed.quantity,
    sku,
    state: pickupLocation?.state ?? parsed.state,
  };
}

function measurementToMillimetres(value: number | null) {
  return value === null ? null : Math.round(value * 10);
}

function shippingValues(
  parsed: z.infer<typeof productFormSchema>,
  pickupLocation: PickupLocation | null,
) {
  return {
    deliveryEligible:
      parsed.deliveryAvailable &&
      Boolean(pickupLocation?.verifiedAt) &&
      parsed.weightKg !== null,
    heightMm: measurementToMillimetres(parsed.heightCm),
    isBulky: parsed.isBulky,
    isFragile: parsed.isFragile,
    lengthMm: measurementToMillimetres(parsed.lengthCm),
    packagingWeightGrams: parsed.packagingWeightGrams,
    pickupLocationId: pickupLocation?.id ?? null,
    requiresLocationUpdate: !pickupLocation?.verifiedAt,
    weightGrams: parsed.weightKg === null ? null : Math.round(parsed.weightKg * 1000),
    widthMm: measurementToMillimetres(parsed.widthCm),
  };
}

async function createProductDraftRecord({
  parsed,
  pickupLocation,
  sellerId,
}: {
  parsed: z.infer<typeof productFormSchema>;
  pickupLocation: PickupLocation | null;
  sellerId: string;
}): Promise<{ error?: SellerActionState; productId: string }> {
  const supabase = await createClient();
  const productId = randomUUID();
  const sku = parsed.sku ?? `TTP-${productId.slice(0, 8).toUpperCase()}`;
  const slug = `${slugifyProduct(parsed.name) || "part"}-${productId.slice(0, 8)}`;
  const { error: productError } = await supabase.from("products").insert({
    ...productValues(parsed, sku, pickupLocation),
    created_by_user_id: sellerId,
    creation_source: "SELLER",
    id: productId,
    last_modified_by_user_id: sellerId,
    seller_id: sellerId,
    slug,
    status: "DRAFT",
  });

  if (productError) {
    return {
      error: databaseError(
        productError.code === "23505"
          ? "That seller SKU is already used by another product."
          : "The product draft could not be created.",
      ),
      productId,
    };
  }

  try {
    await getDatabase().insert(productShippingProfiles).values({
      productId,
      ...shippingValues(parsed, pickupLocation),
    });
  } catch {
    return {
      error: {
        message: "The product draft was created, but its delivery details could not be saved.",
        productId,
        status: "error",
      },
      productId,
    };
  }

  const associationError = await replaceProductAssociations({
    crossReferences: parsed.crossReferences,
    fitmentIds: parsed.fitmentIds,
    productId,
  });
  if (associationError) {
    return {
      error: { message: associationError, productId, status: "error" },
      productId,
    };
  }

  return { productId };
}

export async function prepareProductImageUploadsAction(
  formData: FormData,
): Promise<ProductUploadPreparationState> {
  const requestId = requestIdFrom(formData);
  const parsed = productFormSchema.safeParse(getProductFormValues(formData));
  if (!parsed.success) return validationError(parsed.error);

  const manifestResult = parseJsonField(formData.get("imageManifest"), imageUploadManifestSchema);
  if (manifestResult.error || !manifestResult.data) {
    return databaseError(manifestResult.error ?? "The selected product photos could not be prepared.", "images");
  }
  const manifestError = validateImageManifestItems(manifestResult.data);
  if (manifestError) return databaseError(manifestError, "images");
  if (manifestResult.data.length === 0) {
    return databaseError("Choose at least one product photo to upload.", "images");
  }

  const principal = await requireRole(
    ["SELLER"],
    parsed.data.productId
      ? `/seller/products/${parsed.data.productId}/edit`
      : "/seller/products/new",
  );
  if (!(await ensureSellerOnboarded(principal.id))) {
    redirect("/seller/onboarding?next=/seller/products/new");
  }
  const pickupLocation = await getOwnedPickupLocation(
    principal.id,
    parsed.data.pickupLocationId,
  );
  if (parsed.data.pickupLocationId && !pickupLocation) {
    return databaseError("Choose a valid pickup location from your store settings.", "pickupLocationId");
  }

  let productId = parsed.data.productId;
  if (productId) {
    const supabase = await createClient();
    const { data: existingProduct, error } = await supabase
      .from("products")
      .select("id, status")
      .eq("id", productId)
      .eq("seller_id", principal.id)
      .single();
    if (error || !existingProduct) return databaseError("Product not found.");
    if (!canSellerEditProduct(existingProduct.status)) {
      return databaseError("This product cannot be edited while it is under marketplace action.");
    }
  } else {
    const created = await createProductDraftRecord({
      parsed: parsed.data,
      pickupLocation,
      sellerId: principal.id,
    });
    productId = created.productId;
    if (created.error) return created.error;
  }

  const supabase = await createClient();
  const prepared: PreparedProductUpload[] = [];
  for (const item of manifestResult.data) {
    const extension = getSafeImageExtension(item.mimeType);
    if (!extension) return databaseError("An uploaded image has an unsupported file type.", "images");
    const imageId = randomUUID();
    const storagePath = `${principal.id}/${productId}/${imageId}.${extension}`;
    const { data, error } = await supabase.storage
      .from(PRODUCT_MEDIA_BUCKET)
      .createSignedUploadUrl(storagePath, { upsert: false });
    if (error || !data?.token) {
      logProductActionFailure({
        action: "prepare_product_image_uploads",
        category: "storage_signing",
        code: error?.name,
        productId,
        requestId,
      });
      return {
        fieldErrors: { images: ["The photo upload could not start. Try again."] },
        message: "The photo upload could not start. Your product details are still saved.",
        productId,
        status: "error",
      };
    }
    prepared.push({ ...item, imageId, storagePath, token: data.token });
  }

  return { productId, status: "success", uploads: prepared };
}

export async function createProductAction(
  _previousState: SellerActionState,
  formData: FormData,
): Promise<SellerActionState> {
  const parsed = productFormSchema.safeParse(getProductFormValues(formData));
  if (!parsed.success) return validationError(parsed.error);
  if (parsed.data.productId) return updateProductAction(_previousState, formData);

  const principal = await requireRole(["SELLER"], "/seller/products/new");
  if (!(await ensureSellerOnboarded(principal.id))) {
    redirect("/seller/onboarding?next=/seller/products/new");
  }
  const pickupLocation = await getOwnedPickupLocation(
    principal.id,
    parsed.data.pickupLocationId,
  );
  if (parsed.data.pickupLocationId && !pickupLocation) {
    return databaseError("Choose a valid pickup location from your store settings.", "pickupLocationId");
  }

  const { error: uploadPayloadError, uploads } = collectUploadedImageReferences(formData);
  if (uploadPayloadError) return databaseError(uploadPayloadError, "images");

  if (parsed.data.intent === "submit-review") {
    const error = submissionImageError(
      parsed.data.condition,
      uploads,
      true,
      parsed.data.actualItemType,
    );
    if (error) return databaseError(error, "images");
  }

  const supabase = await createClient();
  const created = await createProductDraftRecord({
    parsed: parsed.data,
    pickupLocation,
    sellerId: principal.id,
  });
  const productId = created.productId;
  if (created.error) return created.error;

  const imageError = await applyProductImageChanges({
    actualItemType: parsed.data.actualItemType,
    condition: parsed.data.condition,
    productId,
    removeTypes: [],
    sellerId: principal.id,
    shouldPublish: parsed.data.intent === "submit-review",
    uploads,
  });
  if (imageError) return { message: imageError, productId, status: "error" };

  if (parsed.data.intent === "submit-review") {
    const { error } = await supabase
      .from("products")
      .update({ status: "PENDING_REVIEW" })
      .eq("id", productId)
      .eq("seller_id", principal.id);

    if (error) {
      return {
        message:
          "The product was saved as a draft, but it could not be published. Confirm the vehicle fitment and all required images.",
        productId,
        status: "error",
      };
    }
  }

  revalidatePath("/seller/products");
  if (parsed.data.intent === "submit-review") {
    revalidatePath("/");
    revalidatePath("/marketplace");
    revalidatePath("/categories");
  }
  redirect(
    `/seller/products/${productId}?message=${
      parsed.data.intent === "submit-review" ? "published" : "draft-created"
    }`,
  );
}

export async function updateProductAction(
  _previousState: SellerActionState,
  formData: FormData,
): Promise<SellerActionState> {
  const parsed = productFormSchema.safeParse(getProductFormValues(formData));
  if (!parsed.success) return validationError(parsed.error);
  if (!parsed.data.productId) return databaseError("The product identifier is missing.");

  const productId = parsed.data.productId;
  const principal = await requireRole(["SELLER"], `/seller/products/${productId}/edit`);
  const supabase = await createClient();
  const pickupLocation = await getOwnedPickupLocation(
    principal.id,
    parsed.data.pickupLocationId,
  );
  if (parsed.data.pickupLocationId && !pickupLocation) {
    return databaseError("Choose a valid pickup location from your store settings.", "pickupLocationId");
  }
  const { data: existingProduct, error: existingError } = await supabase
    .from("products")
    .select("id, sku, status")
    .eq("id", productId)
    .eq("seller_id", principal.id)
    .single();

  if (existingError || !existingProduct) return databaseError("Product not found.");
  if (!canSellerEditProduct(existingProduct.status)) {
    return databaseError("This product cannot be edited while it is under marketplace action.");
  }

  const shouldPublish =
    isPublishedSellerProduct(existingProduct.status) || parsed.data.intent === "submit-review";
  if (shouldPublish && parsed.data.fitmentIds.length === 0) {
    return databaseError("Choose at least one car this part fits.", "fitmentIds");
  }

  const { error: uploadPayloadError, uploads } = collectUploadedImageReferences(formData);
  if (uploadPayloadError) return databaseError(uploadPayloadError, "images");
  const removeTypes = collectRemovedImageTypes(formData);

  const associationError = await replaceProductAssociations({
    crossReferences: parsed.data.crossReferences,
    fitmentIds: parsed.data.fitmentIds,
    productId,
  });
  if (associationError) return databaseError(associationError);

  const imageError = await applyProductImageChanges({
    actualItemType: parsed.data.actualItemType,
    condition: parsed.data.condition,
    productId,
    removeTypes,
    sellerId: principal.id,
    shouldPublish,
    uploads,
  });
  if (imageError) return databaseError(imageError, "images");

  await getDatabase()
    .insert(productShippingProfiles)
    .values({
      productId,
      ...shippingValues(parsed.data, pickupLocation),
    })
    .onConflictDoUpdate({
      target: productShippingProfiles.productId,
      set: {
        ...shippingValues(parsed.data, pickupLocation),
        updatedAt: new Date(),
      },
    });

  const { error: updateError } = await supabase
    .from("products")
    .update({
      ...productValues(parsed.data, parsed.data.sku ?? existingProduct.sku, pickupLocation),
      last_modified_by_user_id: principal.id,
      ...(shouldPublish ? { status: "PENDING_REVIEW" as const } : {}),
    })
    .eq("id", productId)
    .eq("seller_id", principal.id);

  if (updateError) {
    if (updateError.code === "23505") {
      return databaseError("That seller SKU is already used by another product.", "sku");
    }
    if (updateError.code === "23514") {
      return databaseError(
        parsed.data.deliveryAvailable
          ? "Add a verified Anambra pickup location, shipping weight, one vehicle fitment, and five active photos before publishing."
          : "Keep one vehicle fitment and five active product photos before publishing.",
        "images",
      );
    }
    return databaseError("The product changes could not be saved.");
  }
  revalidatePath("/seller/products");
  revalidatePath(`/seller/products/${productId}`);
  if (shouldPublish) {
    revalidatePath("/");
    revalidatePath("/marketplace");
    revalidatePath("/categories");
  }
  redirect(
    `/seller/products/${productId}?message=${
      shouldPublish ? "published" : "changes-saved"
    }`,
  );
}
