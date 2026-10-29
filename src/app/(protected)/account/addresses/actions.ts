"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getDatabase } from "@/db/client";
import { addresses } from "@/db/schema";
import { requireRole } from "@/lib/auth/principal";
import { ANAMBRA_LGAS } from "@/lib/delivery/anambra";

const coordinate = z.preprocess(
  (value) => value === "" || value === null ? null : value,
  z.coerce.number().finite().nullable(),
);
const addressSchema = z.object({
  label: z.string().trim().min(2).max(60),
  landmark: z.string().trim().max(180).transform((entry) => entry || null),
  latitude: coordinate,
  lga: z.enum(ANAMBRA_LGAS),
  line1: z.string().trim().min(5).max(240),
  longitude: coordinate,
  phone: z.string().trim().min(7).max(30),
  recipientName: z.string().trim().min(2).max(120),
  town: z.string().trim().min(2).max(100),
}).superRefine((input, context) => {
  if ((input.latitude === null) !== (input.longitude === null)) {
    context.addIssue({ code: "custom", message: "Add both map coordinates or leave both empty." });
  }
  if (input.latitude !== null && (input.latitude < -90 || input.latitude > 90)) context.addIssue({ code: "custom", message: "Latitude is outside the valid range." });
  if (input.longitude !== null && (input.longitude < -180 || input.longitude > 180)) context.addIssue({ code: "custom", message: "Longitude is outside the valid range." });
});

function field(formData: FormData, name: string) {
  const entry = formData.get(name);
  return typeof entry === "string" ? entry : "";
}

export async function saveBuyerAddressAction(formData: FormData) {
  const principal = await requireRole(["BUYER"], "/account/addresses");
  const parsed = addressSchema.safeParse({
    label: field(formData, "label"),
    landmark: field(formData, "landmark"),
    latitude: field(formData, "latitude"),
    lga: field(formData, "lga"),
    line1: field(formData, "line1"),
    longitude: field(formData, "longitude"),
    phone: field(formData, "phone"),
    recipientName: field(formData, "recipientName"),
    town: field(formData, "town"),
  });
  if (!parsed.success) redirect(`/account/addresses?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Check the address.")}`);
  const database = getDatabase();
  const makeDefault = formData.get("isDefault") === "on";
  await database.transaction(async (transaction) => {
    if (makeDefault) await transaction.update(addresses).set({ isDefault: false, updatedAt: new Date() }).where(eq(addresses.userId, principal.id));
    await transaction.insert(addresses).values({
      city: parsed.data.town,
      country: "Nigeria",
      isDefault: makeDefault,
      label: parsed.data.label,
      landmark: parsed.data.landmark,
      latitude: parsed.data.latitude,
      lga: parsed.data.lga,
      line1: parsed.data.line1,
      longitude: parsed.data.longitude,
      phone: parsed.data.phone,
      recipientName: parsed.data.recipientName,
      state: "Anambra",
      town: parsed.data.town,
      type: "SHIPPING",
      userId: principal.id,
    });
  });
  revalidatePath("/account/addresses");
  revalidatePath("/checkout");
  redirect("/account/addresses?message=Address+saved.");
}

export async function setDefaultBuyerAddressAction(formData: FormData) {
  const principal = await requireRole(["BUYER"], "/account/addresses");
  const id = z.string().uuid().safeParse(field(formData, "addressId"));
  if (!id.success) redirect("/account/addresses?error=Invalid+address.");
  await getDatabase().transaction(async (transaction) => {
    await transaction.update(addresses).set({ isDefault: false, updatedAt: new Date() }).where(eq(addresses.userId, principal.id));
    await transaction.update(addresses).set({ isDefault: true, updatedAt: new Date() }).where(and(eq(addresses.id, id.data), eq(addresses.userId, principal.id)));
  });
  revalidatePath("/account/addresses");
  revalidatePath("/checkout");
}

export async function deleteBuyerAddressAction(formData: FormData) {
  const principal = await requireRole(["BUYER"], "/account/addresses");
  const id = z.string().uuid().safeParse(field(formData, "addressId"));
  if (!id.success) redirect("/account/addresses?error=Invalid+address.");
  await getDatabase().delete(addresses).where(and(eq(addresses.id, id.data), eq(addresses.userId, principal.id)));
  revalidatePath("/account/addresses");
  revalidatePath("/checkout");
}
