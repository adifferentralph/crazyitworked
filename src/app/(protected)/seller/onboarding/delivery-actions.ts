"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getDatabase } from "@/db/client";
import { productShippingProfiles, sellerPickupLocations } from "@/db/schema";
import { requireRole } from "@/lib/auth/principal";
import { ANAMBRA_LGAS } from "@/lib/delivery/anambra";

const optionalCoordinate = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.coerce.number().min(-180).max(180).nullable(),
);

const pickupLocationSchema = z
  .object({
    contactName: z.string().trim().min(2).max(120),
    contactPhone: z.string().trim().regex(/^\+?[0-9][0-9\s-]{7,18}$/),
    id: z.string().uuid().optional(),
    isDefault: z.preprocess((value) => value === "on", z.boolean()),
    label: z.string().trim().min(2).max(80),
    landmark: z.string().trim().max(200).transform((value) => value || null),
    latitude: optionalCoordinate,
    lga: z.enum(ANAMBRA_LGAS),
    longitude: optionalCoordinate,
    streetAddress: z.string().trim().min(5).max(200),
    town: z.string().trim().min(2).max(100),
  })
  .refine(
    (value) => (value.latitude === null) === (value.longitude === null),
    { message: "Add both map coordinates or leave both empty." },
  );

function locationValues(formData: FormData) {
  return {
    contactName: formData.get("contactName"),
    contactPhone: formData.get("contactPhone"),
    id: formData.get("id") || undefined,
    isDefault: formData.get("isDefault"),
    label: formData.get("label"),
    landmark: formData.get("landmark") ?? "",
    latitude: formData.get("latitude"),
    lga: formData.get("lga"),
    longitude: formData.get("longitude"),
    streetAddress: formData.get("streetAddress"),
    town: formData.get("town"),
  };
}
export async function savePickupLocationAction(formData: FormData) {
  const principal = await requireRole(["SELLER"], "/seller/onboarding");
  const parsed = pickupLocationSchema.safeParse(locationValues(formData));
  if (!parsed.success) {
    redirect("/seller/onboarding?deliveryError=Check+the+pickup+address+and+try+again.#pickup-locations");
  }
  const database = getDatabase();
  const values = {
    contactName: parsed.data.contactName,
    contactPhone: parsed.data.contactPhone,
    isDefault: parsed.data.isDefault,
    label: parsed.data.label,
    landmark: parsed.data.landmark,
    latitude: parsed.data.latitude,
    lga: parsed.data.lga,
    longitude: parsed.data.longitude,
    state: "Anambra",
    streetAddress: parsed.data.streetAddress,
    town: parsed.data.town,
    updatedAt: new Date(),
    verifiedAt: new Date(),
  };

  await database.transaction(async (transaction) => {
    const existingLocations = await transaction
      .select({ id: sellerPickupLocations.id })
      .from(sellerPickupLocations)
      .where(
        and(
          eq(sellerPickupLocations.sellerId, principal.id),
          eq(sellerPickupLocations.isActive, true),
        ),
      );
    const shouldBeDefault = parsed.data.isDefault || existingLocations.length === 0;
    if (shouldBeDefault) {
      await transaction
        .update(sellerPickupLocations)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(eq(sellerPickupLocations.sellerId, principal.id));
    }

    if (parsed.data.id) {
      const [updated] = await transaction
        .update(sellerPickupLocations)
        .set({ ...values, isDefault: shouldBeDefault })
        .where(
          and(
            eq(sellerPickupLocations.id, parsed.data.id),
            eq(sellerPickupLocations.sellerId, principal.id),
          ),
        )
        .returning({ id: sellerPickupLocations.id });
      if (!updated) throw new Error("Pickup location not found.");
    } else {
      await transaction.insert(sellerPickupLocations).values({
        ...values,
        isDefault: shouldBeDefault,
        sellerId: principal.id,
      });
    }
  });

  revalidatePath("/seller/onboarding");
  redirect("/seller/onboarding?deliveryMessage=Pickup+location+saved.#pickup-locations");
}

export async function setDefaultPickupLocationAction(formData: FormData) {
  const principal = await requireRole(["SELLER"], "/seller/onboarding");
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) redirect("/seller/onboarding?deliveryError=Pickup+location+not+found.#pickup-locations");
  const database = getDatabase();
  await database.transaction(async (transaction) => {
    const [owned] = await transaction
      .select({ id: sellerPickupLocations.id })
      .from(sellerPickupLocations)
      .where(
        and(
          eq(sellerPickupLocations.id, id.data),
          eq(sellerPickupLocations.sellerId, principal.id),
          eq(sellerPickupLocations.isActive, true),
        ),
      )
      .limit(1);
    if (!owned) throw new Error("Pickup location not found.");
    await transaction
      .update(sellerPickupLocations)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(
        and(
          eq(sellerPickupLocations.sellerId, principal.id),
          ne(sellerPickupLocations.id, id.data),
        ),
      );
    await transaction
      .update(sellerPickupLocations)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(eq(sellerPickupLocations.id, id.data));
  });
  revalidatePath("/seller/onboarding");
  redirect("/seller/onboarding?deliveryMessage=Default+pickup+location+updated.#pickup-locations");
}

export async function archivePickupLocationAction(formData: FormData) {
  const principal = await requireRole(["SELLER"], "/seller/onboarding");
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) redirect("/seller/onboarding?deliveryError=Pickup+location+not+found.#pickup-locations");
  const database = getDatabase();
  const [inUse] = await database
    .select({ productId: productShippingProfiles.productId })
    .from(productShippingProfiles)
    .where(
      and(
        eq(productShippingProfiles.pickupLocationId, id.data),
        eq(productShippingProfiles.deliveryEligible, true),
      ),
    )
    .limit(1);
  if (inUse) {
    redirect("/seller/onboarding?deliveryError=Move+deliverable+products+to+another+pickup+location+first.#pickup-locations");
  }
  const [archived] = await database
    .update(sellerPickupLocations)
    .set({ isActive: false, isDefault: false, updatedAt: new Date() })
    .where(
      and(
        eq(sellerPickupLocations.id, id.data),
        eq(sellerPickupLocations.sellerId, principal.id),
      ),
    )
    .returning({ id: sellerPickupLocations.id });
  if (!archived) throw new Error("Pickup location not found.");
  revalidatePath("/seller/onboarding");
  redirect("/seller/onboarding?deliveryMessage=Pickup+location+archived.#pickup-locations");
}
