"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { z } from "zod";

import { requireRole } from "@/lib/auth/principal";
import type { SellerActionState } from "@/lib/marketplace/seller-action-state";
import {
  conditionRequiresActualItem,
  getSafeImageExtension,
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

function databaseError(message: string): SellerActionState {
  return { message, status: "error" };
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

function collectImageUploads(formData: FormData, actualItemType?: ProductImageType) {
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
      isActualItem: actualItemType === slot.type,
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
    .select("id, is_active, is_primary, position")
    .eq("product_id", productId)
    .order("position", { ascending: false });

  if (currentImagesError) return "Existing product images could not be checked.";

  let nextPosition = (currentImages?.[0]?.position ?? -1) + 1;

  for (const upload of uploads) {
    const extension = getSafeImageExtension(upload.file.type);
    if (!extension) return "An uploaded image has an unsupported file type.";

    const imageId = randomUUID();
    const storagePath = `${sellerId}/${productId}/${imageId}.${extension}`;
    const { error: storageError } = await supabase.storage
      .from(PRODUCT_MEDIA_BUCKET)
      .upload(storagePath, upload.file, {
        cacheControl: "31536000",
        contentType: upload.file.type,
        upsert: false,
      });

    if (storageError) {
      return `Image upload failed: ${storageError.message}`;
    }

    let previousPrimaryId: string | null = null;
    if (upload.type === "PRIMARY") {
      previousPrimaryId =
        currentImages?.find((image) => image.is_active && image.is_primary)?.id ?? null;

      if (previousPrimaryId) {
        const { error: deactivateError } = await supabase
          .from("product_images")
          .update({ is_active: false })
          .eq("id", previousPrimaryId)
          .eq("product_id", productId);

        if (deactivateError) return "The previous primary image could not be preserved.";
      }
    }

    const { error: metadataError } = await supabase.from("product_images").insert({
      id: imageId,
      is_actual_item: upload.isActualItem,
      is_primary: upload.type === "PRIMARY",
      mime_type: upload.file.type,
      original_filename: upload.file.name.slice(0, 255),
      position: nextPosition,
      product_id: productId,
      size_bytes: upload.file.size,
      source: "SELLER_ORIGINAL",
      storage_bucket: PRODUCT_MEDIA_BUCKET,
      storage_path: storagePath,
      type: upload.type,
      uploaded_by: sellerId,
    });

    if (metadataError) {
      if (previousPrimaryId) {
        await supabase
          .from("product_images")
          .update({ is_active: true })
          .eq("id", previousPrimaryId)
          .eq("product_id", productId);
      }
      return "Image metadata could not be saved. The listing remains a draft.";
    }

    nextPosition += 1;
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
      fitmentIds.map((fitmentId) => ({ fitment_id: fitmentId, product_id: productId })),
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

  const uploadedTypes = new Set(uploads.map((upload) => upload.type));
  const missing = requiredProductImageSlots.filter((slot) => !uploadedTypes.has(slot.type));
  if (missing.length > 0) {
    return "Submission requires all five labelled image categories. Save a draft if images are not ready.";
  }

  if (conditionRequiresActualItem(condition) && !uploads.some((upload) => upload.isActualItem)) {
    return "Choose which uploaded image shows the actual physical item being sold.";
  }

  return null;
}

function productValues(parsed: z.infer<typeof productFormSchema>) {
  return {
    brand: parsed.brand,
    category_id: parsed.categoryId,
    city: parsed.city,
    condition: parsed.condition,
    country: parsed.country,
    delivery_available: parsed.deliveryAvailable,
    description: parsed.description,
    manufacturer_part_number: parsed.manufacturerPartNumber,
    name: parsed.name,
    oem_part_number: parsed.oemPartNumber,
    pickup_available: parsed.pickupAvailable,
    price_minor: priceInputToMinor(parsed.priceNgn),
    quantity: parsed.quantity,
    sku: parsed.sku,
    state: parsed.state,
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

  const { errors, uploads } = collectImageUploads(formData, parsed.data.actualItemType);
  if (errors.length > 0) return databaseError(errors[0] ?? "An image is invalid.");

  if (parsed.data.intent === "submit-review") {
    const error = submissionImageError(parsed.data.condition, uploads, true);
    if (error) return databaseError(error);
  }

  const supabase = await createClient();
  const productId = randomUUID();
  const slug = `${slugifyProduct(parsed.data.name) || "part"}-${productId.slice(0, 8)}`;
  const { error: productError } = await supabase.from("products").insert({
    ...productValues(parsed.data),
    id: productId,
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
          "The product was saved as a draft, but it is not submission-ready. Confirm all required images.",
        productId,
        status: "error",
      };
    }
  }

  revalidatePath("/seller/products");
  redirect(
    `/seller/products/${productId}?message=${
      parsed.data.intent === "submit-review" ? "submitted" : "draft-created"
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
  const { data: existingProduct, error: existingError } = await supabase
    .from("products")
    .select("id, status")
    .eq("id", productId)
    .eq("seller_id", principal.id)
    .single();

  if (existingError || !existingProduct) return databaseError("Product not found.");
  if (!["DRAFT", "NEEDS_CHANGES"].includes(existingProduct.status)) {
    return databaseError("Only draft or needs-changes listings can edit product details.");
  }

  const { errors, uploads } = collectImageUploads(formData, parsed.data.actualItemType);
  if (errors.length > 0) return databaseError(errors[0] ?? "An image is invalid.");

  const { error: updateError } = await supabase
    .from("products")
    .update(productValues(parsed.data))
    .eq("id", productId)
    .eq("seller_id", principal.id);

  if (updateError) {
    return databaseError(
      updateError.code === "23505"
        ? "That seller SKU is already used by another product."
        : "The product changes could not be saved.",
    );
  }

  const associationError = await replaceProductAssociations({
    crossReferences: parsed.data.crossReferences,
    fitmentIds: parsed.data.fitmentIds,
    productId,
  });
  if (associationError) return databaseError(associationError);

  const imageError = await uploadProductImages({ productId, sellerId: principal.id, uploads });
  if (imageError) return databaseError(imageError);

  if (parsed.data.intent === "submit-review") {
    const { error } = await supabase
      .from("products")
      .update({ status: "PENDING_REVIEW" })
      .eq("id", productId)
      .eq("seller_id", principal.id);
    if (error) {
      return databaseError(
        "The draft was saved, but submission requires five active required images and an actual-item image when applicable.",
      );
    }
  }

  revalidatePath("/seller/products");
  revalidatePath(`/seller/products/${productId}`);
  redirect(
    `/seller/products/${productId}?message=${
      parsed.data.intent === "submit-review" ? "submitted" : "changes-saved"
    }`,
  );
}
