"use server";

import { randomUUID } from "node:crypto";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getDatabase } from "@/db/client";
import { marketplaceBanners } from "@/db/schema";
import { requireAdminPermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

const imageTypes = new Map([
  ["image/avif", "avif"],
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

const bannerSchema = z
  .object({
    ctaLabel: z.string().trim().max(40).optional(),
    ctaUrl: z.string().trim().max(500).optional(),
    displayOrder: z.coerce.number().int().min(0).max(10_000),
    endAt: z.string().trim().optional(),
    placement: z.enum(["HOME_HERO", "HOME_MID", "CATEGORY"]),
    startAt: z.string().trim().optional(),
    subtitle: z.string().trim().max(180).optional(),
    title: z.string().trim().min(2).max(100),
  })
  .superRefine((value, context) => {
    if (Boolean(value.ctaLabel) !== Boolean(value.ctaUrl)) {
      context.addIssue({ code: "custom", message: "CTA label and URL must be provided together." });
    }
    if (value.ctaUrl && !(value.ctaUrl.startsWith("/") || value.ctaUrl.startsWith("https://"))) {
      context.addIssue({ code: "custom", message: "CTA URL must be an internal path or HTTPS URL." });
    }
    if (value.startAt && value.endAt && new Date(value.endAt) <= new Date(value.startAt)) {
      context.addIssue({ code: "custom", message: "End date must be later than start date." });
    }
  });

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function parseBanner(formData: FormData) {
  return bannerSchema.parse({
    ctaLabel: field(formData, "ctaLabel") || undefined,
    ctaUrl: field(formData, "ctaUrl") || undefined,
    displayOrder: field(formData, "displayOrder") || "0",
    endAt: field(formData, "endAt") || undefined,
    placement: field(formData, "placement"),
    startAt: field(formData, "startAt") || undefined,
    subtitle: field(formData, "subtitle") || undefined,
    title: field(formData, "title"),
  });
}

function bannerDate(value?: string) {
  return value ? new Date(value) : null;
}

function errorMessage(error: unknown) {
  if (error instanceof z.ZodError) return error.issues[0]?.message ?? "Check the banner fields.";
  return error instanceof Error ? error.message : "The banner could not be saved.";
}

async function uploadBannerImage(file: File, userId: string, label: string) {
  const extension = imageTypes.get(file.type);
  if (!extension || file.size <= 0 || file.size > 5 * 1024 * 1024) {
    throw new Error("Use a JPG, PNG, WebP or AVIF image no larger than 5 MB.");
  }

  const path = `${userId}/${randomUUID()}-${label}.${extension}`;
  const supabase = await createClient();
  const result = await supabase.storage.from("marketplace-banners").upload(path, file, {
    cacheControl: "31536000",
    contentType: file.type,
    upsert: false,
  });
  if (result.error) throw new Error(result.error.message);

  return {
    path,
    publicUrl: supabase.storage.from("marketplace-banners").getPublicUrl(path).data.publicUrl,
  };
}

function refreshBanners() {
  revalidatePath("/");
  revalidatePath("/find-a-part");
  revalidatePath("/admin/banners");
}

export async function createBannerAction(formData: FormData) {
  const principal = await requireAdminPermission("content.manage", "/admin/banners");
  let upload: Awaited<ReturnType<typeof uploadBannerImage>> | null = null;

  try {
    const values = parseBanner(formData);
    const file = formData.get("image");
    if (!(file instanceof File) || file.size === 0) throw new Error("Choose a banner image.");
    upload = await uploadBannerImage(file, principal.id, "desktop");

    await getDatabase().insert(marketplaceBanners).values({
      createdBy: principal.id,
      ctaLabel: values.ctaLabel,
      ctaUrl: values.ctaUrl,
      displayOrder: values.displayOrder,
      endAt: bannerDate(values.endAt),
      imagePath: upload.path,
      imageUrl: upload.publicUrl,
      placement: values.placement,
      startAt: bannerDate(values.startAt),
      subtitle: values.subtitle,
      title: values.title,
    });
  } catch (error) {
    if (upload) {
      const supabase = await createClient();
      await supabase.storage.from("marketplace-banners").remove([upload.path]);
    }
    redirect(`/admin/banners?error=${encodeURIComponent(errorMessage(error))}`);
  }

  refreshBanners();
  redirect("/admin/banners?message=created");
}

export async function updateBannerAction(formData: FormData) {
  await requireAdminPermission("content.manage", "/admin/banners");
  const id = field(formData, "id");
  if (!z.string().uuid().safeParse(id).success) redirect("/admin/banners?error=Invalid%20banner.");

  try {
    const values = parseBanner(formData);
    await getDatabase()
      .update(marketplaceBanners)
      .set({
        ctaLabel: values.ctaLabel ?? null,
        ctaUrl: values.ctaUrl ?? null,
        displayOrder: values.displayOrder,
        endAt: bannerDate(values.endAt),
        placement: values.placement,
        startAt: bannerDate(values.startAt),
        subtitle: values.subtitle ?? null,
        title: values.title,
      })
      .where(eq(marketplaceBanners.id, id));
  } catch (error) {
    redirect(`/admin/banners/${id}?error=${encodeURIComponent(errorMessage(error))}`);
  }

  refreshBanners();
  redirect("/admin/banners?message=updated");
}

export async function setBannerStatusAction(formData: FormData) {
  await requireAdminPermission("content.manage", "/admin/banners");
  const parsed = z.object({
    id: z.string().uuid(),
    status: z.enum(["ACTIVE", "PAUSED", "ARCHIVED"]),
  }).safeParse({ id: field(formData, "id"), status: field(formData, "status") });

  if (!parsed.success) redirect("/admin/banners?error=Invalid%20banner%20action.");
  await getDatabase().update(marketplaceBanners).set({ status: parsed.data.status }).where(eq(marketplaceBanners.id, parsed.data.id));
  refreshBanners();
}

export async function reorderBannerAction(formData: FormData) {
  await requireAdminPermission("content.manage", "/admin/banners");
  const parsed = z.object({
    direction: z.enum(["up", "down"]),
    id: z.string().uuid(),
  }).safeParse({ direction: field(formData, "direction"), id: field(formData, "id") });

  if (!parsed.success) redirect("/admin/banners?error=Invalid%20reorder%20action.");
  const delta = parsed.data.direction === "up" ? -1 : 1;
  await getDatabase()
    .update(marketplaceBanners)
    .set({ displayOrder: sql`greatest(0, ${marketplaceBanners.displayOrder} + ${delta})` })
    .where(and(eq(marketplaceBanners.id, parsed.data.id)));
  refreshBanners();
}
