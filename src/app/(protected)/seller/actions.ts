"use server";

import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { z } from "zod";

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
  validateProductImage,
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

type ImageUpload = {
  file: File;
  isActualItem: boolean;
  type: ProductImageType;
};

function collectImageUploads(
  formData: FormData,
  condition: ProductCondition,
  actualItemType?: ProductImageType,
) {
  const uploads: ImageUpload[] = [];
  const errors: string[] = [];

  for (const slot of requiredProductImageSlots) {
    const value = formData.get(slot.field);
    if (!(value instanceof File) || value.size === 0) continue;

    const error = validateProductImage(value);
    if (error) {
      errors.push(`${slot.label}: ${error}`);
      continue;
    }

    uploads.push({
      file: value,
      isActualItem:
        actualItemType === slot.type ||
        (!actualItemType && conditionRequiresActualItem(condition) && slot.type === "PRIMARY"),
      type: slot.type,
    });
  }

  return { errors, uploads };
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

async function uploadProductImages({
  productId,
  sellerId,
  uploads,
}: {
  productId: string;
  sellerId: string;
  uploads: ImageUpload[];
}) {
  if (uploads.length === 0) return null;

  const supabase = await createClient();
  const { data: currentImages, error: currentImagesError } = await supabase
    .from("product_images")
    .select("id, is_active, is_primary, position, type")
    .eq("product_id", productId)
    .order("position", { ascending: false });

  if (currentImagesError) return "Existing product images could not be checked.";

  const nextPosition = (currentImages?.[0]?.position ?? -1) + 1;
  const preparedUploads = uploads.map((upload, index) => {
    const extension = getSafeImageExtension(upload.file.type);
    if (!extension) return null;

    const imageId = randomUUID();
    const storagePath = `${sellerId}/${productId}/${imageId}.${extension}`;
    return {
      imageId,
      position: nextPosition + index,
      storagePath,
      upload,
    };
  });

  if (preparedUploads.some((upload) => upload === null)) {
    return "An uploaded image has an unsupported file type.";
  }

  const readyUploads = preparedUploads.filter((upload) => upload !== null);
  const storageResults = await Promise.all(
    readyUploads.map(async ({ storagePath, upload }) => {
      const { error } = await supabase.storage
        .from(PRODUCT_MEDIA_BUCKET)
        .upload(storagePath, upload.file, {
          cacheControl: "31536000",
          contentType: upload.file.type,
          upsert: false,
        });
      return { error, storagePath };
    }),
  );
  const failedUpload = storageResults.find(({ error }) => error);

  if (failedUpload?.error) {
    const uploadedPaths = storageResults
      .filter(({ error }) => !error)
      .map(({ storagePath }) => storagePath);
    if (uploadedPaths.length > 0) {
      await supabase.storage.from(PRODUCT_MEDIA_BUCKET).remove(uploadedPaths);
    }
    return `Image upload failed: ${failedUpload.error.message}`;
  }

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
    await supabase.storage
      .from(PRODUCT_MEDIA_BUCKET)
      .remove(readyUploads.map((prepared) => prepared.storagePath));
  };

  for (const { imageId, position, storagePath, upload } of readyUploads) {
    const previousImageIds = (currentImages ?? [])
      .filter((image) => image.is_active && image.type === upload.type)
      .map((image) => image.id);

    if (previousImageIds.length > 0) {
      const { error: deactivateError } = await supabase
        .from("product_images")
        .update({ is_active: false })
        .eq("product_id", productId)
        .in("id", previousImageIds);

      if (deactivateError) {
        await rollbackImageChanges();
        return "The previous image could not be preserved.";
      }
      deactivatedImageIds.push(...previousImageIds);
    }

    const { error: metadataError } = await supabase.from("product_images").insert({
      id: imageId,
      is_actual_item: upload.isActualItem,
      is_primary: upload.type === "PRIMARY",
      mime_type: upload.file.type,
      original_filename: upload.file.name.slice(0, 255),
      position,
      product_id: productId,
      size_bytes: upload.file.size,
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
  uploads: ImageUpload[],
  isNewProduct: boolean,
) {
  if (!isNewProduct) return null;

  if (uploads.length < 5) {
    return "Add five genuine photos of this product before publishing. Save a draft if the photos are not ready.";
  }

  if (conditionRequiresActualItem(condition) && !uploads.some((upload) => upload.isActualItem)) {
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

export async function createProductAction(
  _previousState: SellerActionState,
  formData: FormData,
): Promise<SellerActionState> {
  const parsed = productFormSchema.safeParse(getProductFormValues(formData));
  if (!parsed.success) return validationError(parsed.error);

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

  const { errors, uploads } = collectImageUploads(
    formData,
    parsed.data.condition,
    parsed.data.actualItemType,
  );
  if (errors.length > 0) return databaseError(errors[0] ?? "An image is invalid.", "images");

  if (parsed.data.intent === "submit-review") {
    const error = submissionImageError(parsed.data.condition, uploads, true);
    if (error) return databaseError(error, "images");
  }

  const supabase = await createClient();
  const productId = randomUUID();
  const sku = parsed.data.sku ?? `TTP-${productId.slice(0, 8).toUpperCase()}`;
  const slug = `${slugifyProduct(parsed.data.name) || "part"}-${productId.slice(0, 8)}`;
  const { error: productError } = await supabase.from("products").insert({
    ...productValues(parsed.data, sku, pickupLocation),
    created_by_user_id: principal.id,
    creation_source: "SELLER",
    id: productId,
    last_modified_by_user_id: principal.id,
    seller_id: principal.id,
    slug,
    status: "DRAFT",
  });

  if (productError) {
    return databaseError(
      productError.code === "23505"
        ? "That seller SKU is already used by another product."
        : "The product draft could not be created.",
    );
  }

  try {
    await getDatabase().insert(productShippingProfiles).values({
      productId,
      ...shippingValues(parsed.data, pickupLocation),
    });
  } catch {
    return {
      message: "The product draft was created, but its delivery details could not be saved.",
      productId,
      status: "error",
    };
  }

  const associationError = await replaceProductAssociations({
    crossReferences: parsed.data.crossReferences,
    fitmentIds: parsed.data.fitmentIds,
    productId,
  });
  if (associationError) return { message: associationError, productId, status: "error" };

  const imageError = await uploadProductImages({ productId, sellerId: principal.id, uploads });
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

  const { errors, uploads } = collectImageUploads(
    formData,
    parsed.data.condition,
    parsed.data.actualItemType,
  );
  if (errors.length > 0) return databaseError(errors[0] ?? "An image is invalid.", "images");

  const associationError = await replaceProductAssociations({
    crossReferences: parsed.data.crossReferences,
    fitmentIds: parsed.data.fitmentIds,
    productId,
  });
  if (associationError) return databaseError(associationError);

  const imageError = await uploadProductImages({ productId, sellerId: principal.id, uploads });
  if (imageError) return databaseError(imageError);

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
