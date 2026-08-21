"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/principal";
import type { RfqActionState } from "@/lib/rfq/action-state";
import {
  getSafeRequestImageExtension,
  MAX_REQUEST_IMAGES,
  REQUEST_MEDIA_BUCKET,
  validateRequestImage,
} from "@/lib/rfq/media";
import { createClient } from "@/lib/supabase/server";
import { partRequestSchema, quoteIdSchema, quoteSchema, requestIdSchema } from "@/lib/validation/rfq";

function formValues(formData: FormData) {
  return {
    budgetMaxMinor: formData.get("budgetMaxNgn"),
    budgetMinMinor: formData.get("budgetMinNgn"),
    categoryId: formData.get("categoryId"),
    conditionPreferences: formData.getAll("conditionPreferences"),
    deliveryCity: formData.get("deliveryCity"),
    deliveryState: formData.get("deliveryState"),
    description: formData.get("description"),
    manufacturerPartNumber: formData.get("manufacturerPartNumber"),
    oemPartNumber: formData.get("oemPartNumber"),
    partName: formData.get("partName"),
    quantity: formData.get("quantity"),
    savedVehicleId: formData.get("savedVehicleId"),
  };
}

export async function createPartRequestAction(
  previousState: RfqActionState,
  formData: FormData,
): Promise<RfqActionState> {
  const principal = await requireRole(["BUYER"], "/account/requests/new");
  const parsed = partRequestSchema.safeParse(formValues(formData));
  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors,
      message: "Check the highlighted fields and try again.",
      requestId: previousState.requestId,
      status: "error",
    };
  }

  const images = formData
    .getAll("images")
    .filter((value): value is File => value instanceof File && value.size > 0);
  if (images.length > MAX_REQUEST_IMAGES) {
    return { message: `Upload no more than ${MAX_REQUEST_IMAGES} images.`, requestId: previousState.requestId, status: "error" };
  }
  for (const image of images) {
    const error = validateRequestImage(image);
    if (error) return { message: `${image.name}: ${error}`, requestId: previousState.requestId, status: "error" };
  }

  const supabase = await createClient();
  let fitmentId: string | null = null;
  if (parsed.data.savedVehicleId) {
    const { data: vehicle } = await supabase
      .from("saved_vehicles")
      .select("fitment_id")
      .eq("id", parsed.data.savedVehicleId)
      .eq("buyer_id", principal.id)
      .single();
    if (!vehicle) return { message: "Choose a saved vehicle that belongs to your account.", status: "error" };
    fitmentId = vehicle.fitment_id;
  }

  let requestId = previousState.requestId;
  const values = {
    budget_max_minor: parsed.data.budgetMaxMinor,
    budget_min_minor: parsed.data.budgetMinMinor,
    category_id: parsed.data.categoryId,
    condition_preferences: parsed.data.conditionPreferences,
    delivery_city: parsed.data.deliveryCity,
    delivery_state: parsed.data.deliveryState,
    description: parsed.data.description,
    fitment_id: fitmentId,
    manufacturer_part_number: parsed.data.manufacturerPartNumber,
    oem_part_number: parsed.data.oemPartNumber,
    part_name: parsed.data.partName,
    quantity: parsed.data.quantity,
    saved_vehicle_id: parsed.data.savedVehicleId,
  };

  if (requestId) {
    const { data: draft } = await supabase
      .from("part_requests")
      .select("id")
      .eq("id", requestId)
      .eq("buyer_id", principal.id)
      .eq("status", "DRAFT")
      .maybeSingle();
    if (!draft) requestId = undefined;
  }

  if (requestId) {
    const { error } = await supabase.from("part_requests").update(values).eq("id", requestId).eq("buyer_id", principal.id).eq("status", "DRAFT");
    if (error) return { message: "We could not update the request draft.", requestId, status: "error" };
  } else {
    requestId = randomUUID();
    const { error } = await supabase.from("part_requests").insert({
      ...values,
      buyer_id: principal.id,
      id: requestId,
      status: "DRAFT",
    });
    if (error) return { message: "We could not create the request draft.", status: "error" };
  }

  const { count: currentImageCount } = await supabase
    .from("part_request_images")
    .select("id", { count: "exact", head: true })
    .eq("request_id", requestId);
  if ((currentImageCount ?? 0) + images.length > MAX_REQUEST_IMAGES) {
    return { message: `This request can have no more than ${MAX_REQUEST_IMAGES} images.`, requestId, status: "error" };
  }

  for (const image of images) {
    const storagePath = `${principal.id}/${requestId}/${randomUUID()}.${getSafeRequestImageExtension(image)}`;
    const { error: uploadError } = await supabase.storage
      .from(REQUEST_MEDIA_BUCKET)
      .upload(storagePath, await image.arrayBuffer(), { contentType: image.type, upsert: false });
    if (uploadError) return { message: `We could not upload ${image.name}. You can submit the draft again.`, requestId, status: "error" };
    const { error: imageError } = await supabase.from("part_request_images").insert({
      mime_type: image.type,
      original_filename: image.name,
      request_id: requestId,
      size_bytes: image.size,
      storage_path: storagePath,
      uploaded_by: principal.id,
    });
    if (imageError) {
      await supabase.storage.from(REQUEST_MEDIA_BUCKET).remove([storagePath]);
      return { message: `We could not attach ${image.name}. You can submit the draft again.`, requestId, status: "error" };
    }
  }

  const { error: submitError } = await supabase
    .from("part_requests")
    .update({ status: "OPEN", submitted_at: new Date().toISOString() })
    .eq("id", requestId)
    .eq("buyer_id", principal.id)
    .eq("status", "DRAFT");
  if (submitError) return { message: "The draft was saved but could not be submitted. Try again.", requestId, status: "error" };

  revalidatePath("/account/requests");
  revalidatePath("/seller/requests");
  redirect(`/account/requests/${requestId}?message=submitted`);
}

export async function cancelPartRequestAction(formData: FormData) {
  const principal = await requireRole(["BUYER"], "/account/requests");
  const parsed = requestIdSchema.safeParse({ requestId: formData.get("requestId") });
  if (!parsed.success) return;
  const supabase = await createClient();
  await supabase
    .from("part_requests")
    .update({ closed_at: new Date().toISOString(), status: "CANCELLED" })
    .eq("id", parsed.data.requestId)
    .eq("buyer_id", principal.id)
    .in("status", ["OPEN", "QUOTED"]);
  revalidatePath("/account/requests");
  revalidatePath(`/account/requests/${parsed.data.requestId}`);
}

export async function submitPartQuoteAction(formData: FormData) {
  const principal = await requireRole(["SELLER"], "/seller/requests");
  const parsed = quoteSchema.safeParse({
    deliveryFeeMinor: formData.get("deliveryFeeNgn"),
    estimatedDeliveryDays: formData.get("estimatedDeliveryDays"),
    notes: formData.get("notes"),
    productId: formData.get("productId"),
    quantity: formData.get("quantity"),
    requestId: formData.get("requestId"),
    unitPriceMinor: formData.get("unitPriceNgn"),
    validUntil: formData.get("validUntil"),
  });
  if (!parsed.success) redirect(`/seller/requests?quote=invalid`);
  const supabase = await createClient();
  const { data: match } = await supabase
    .from("seller_request_matches")
    .select("id")
    .eq("request_id", parsed.data.requestId)
    .eq("seller_id", principal.id)
    .neq("status", "DECLINED")
    .maybeSingle();
  if (!match) redirect("/seller/requests?quote=forbidden");

  if (parsed.data.productId) {
    const { data: product } = await supabase
      .from("products")
      .select("id")
      .eq("id", parsed.data.productId)
      .eq("seller_id", principal.id)
      .maybeSingle();
    if (!product) redirect(`/seller/requests/${parsed.data.requestId}?quote=product`);
  }

  const { data: existing } = await supabase
    .from("part_request_quotes")
    .select("id")
    .eq("request_id", parsed.data.requestId)
    .eq("seller_id", principal.id)
    .maybeSingle();
  const values = {
    delivery_fee_minor: parsed.data.deliveryFeeMinor,
    estimated_delivery_days: parsed.data.estimatedDeliveryDays,
    notes: parsed.data.notes,
    product_id: parsed.data.productId,
    quantity: parsed.data.quantity,
    unit_price_minor: parsed.data.unitPriceMinor!,
    valid_until: parsed.data.validUntil,
  };
  const result = existing
    ? await supabase.from("part_request_quotes").update({ ...values, status: "REVISED" }).eq("id", existing.id).eq("seller_id", principal.id)
    : await supabase.from("part_request_quotes").insert({ ...values, request_id: parsed.data.requestId, seller_id: principal.id });
  if (result.error) redirect(`/seller/requests/${parsed.data.requestId}?quote=error`);
  revalidatePath(`/seller/requests/${parsed.data.requestId}`);
  revalidatePath(`/account/requests/${parsed.data.requestId}`);
  redirect(`/seller/requests/${parsed.data.requestId}?quote=submitted`);
}

export async function declinePartRequestAction(formData: FormData) {
  const principal = await requireRole(["SELLER"], "/seller/requests");
  const parsed = requestIdSchema.safeParse({ requestId: formData.get("requestId") });
  if (!parsed.success) return;
  const supabase = await createClient();
  await supabase
    .from("seller_request_matches")
    .update({ responded_at: new Date().toISOString(), status: "DECLINED" })
    .eq("request_id", parsed.data.requestId)
    .eq("seller_id", principal.id);
  revalidatePath("/seller/requests");
  redirect("/seller/requests?request=declined");
}

export async function acceptPartRequestQuoteAction(formData: FormData) {
  await requireRole(["BUYER"], "/account/requests");
  const parsed = quoteIdSchema.safeParse({ quoteId: formData.get("quoteId") });
  if (!parsed.success) return;
  const supabase = await createClient();
  const { data: requestId, error } = await supabase.rpc("accept_part_request_quote", { p_quote_id: parsed.data.quoteId });
  if (error || !requestId) redirect("/account/requests?quote=unavailable");
  revalidatePath(`/account/requests/${requestId}`);
  revalidatePath("/account/requests");
  redirect(`/account/requests/${requestId}?message=accepted`);
}