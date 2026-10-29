"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getDatabase } from "@/db/client";
import {
  auditLogs,
  foundingMerchantAwardEvents,
  foundingMerchantAwards,
  manualSellerVerificationEvents,
  manualSellerVerifications,
  sellerProfiles,
  sellerVerifications,
} from "@/db/schema";
import { requireAdminPermission, requireSuperAdmin } from "@/lib/auth/permissions";

const verificationActionSchema = z
  .object({
    action: z.enum(["approve", "reject"]),
    reason: z.string().trim().max(500),
    sellerId: z.string().uuid(),
  })
  .superRefine((value, context) => {
    if (value.action === "reject" && value.reason.length < 5) {
      context.addIssue({
        code: "custom",
        message: "Add a short reason before rejecting this vendor.",
        path: ["reason"],
      });
    }
  });

export async function reviewSellerVerificationAction(formData: FormData) {
  const principal = await requireAdminPermission("sellers.manage", "/admin/sellers");
  const parsed = verificationActionSchema.safeParse({
    action: formData.get("action"),
    reason: formData.get("reason") ?? "",
    sellerId: formData.get("sellerId"),
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Check the vendor review and try again.";
    redirect(`/admin/sellers?error=${encodeURIComponent(message)}`);
  }

  const database = getDatabase();
  const nextVerificationStatus = parsed.data.action === "approve" ? "APPROVED" : "REJECTED";
  const nextSellerStatus = parsed.data.action === "approve" ? "ACTIVE" : "REJECTED";
  const reason = parsed.data.action === "reject" ? parsed.data.reason : null;
  const reviewedAt = new Date();

  try {
    await database.transaction(async (transaction) => {
      const [current] = await transaction
        .select({
          sellerStatus: sellerProfiles.status,
          storeName: sellerProfiles.storeName,
          verificationStatus: sellerVerifications.status,
        })
        .from(sellerProfiles)
        .leftJoin(
          sellerVerifications,
          eq(sellerVerifications.sellerId, sellerProfiles.userId),
        )
        .where(eq(sellerProfiles.userId, parsed.data.sellerId))
        .limit(1);

      if (!current) {
        throw new Error("SELLER_NOT_FOUND");
      }

      await transaction
        .update(sellerProfiles)
        .set({ status: nextSellerStatus, updatedAt: reviewedAt })
        .where(eq(sellerProfiles.userId, parsed.data.sellerId));

      await transaction
        .insert(sellerVerifications)
        .values({
          rejectionReason: reason,
          reviewedAt,
          reviewedBy: principal.id,
          sellerId: parsed.data.sellerId,
          status: nextVerificationStatus,
          submittedAt: reviewedAt,
          updatedAt: reviewedAt,
        })
        .onConflictDoUpdate({
          target: sellerVerifications.sellerId,
          set: {
            rejectionReason: reason,
            reviewedAt,
            reviewedBy: principal.id,
            status: nextVerificationStatus,
            updatedAt: reviewedAt,
          },
        });

      await transaction.insert(auditLogs).values({
        action:
          parsed.data.action === "approve"
            ? "SELLER_VERIFICATION_APPROVED"
            : "SELLER_VERIFICATION_REJECTED",
        actorUserId: principal.id,
        newValue: {
          sellerStatus: nextSellerStatus,
          verificationStatus: nextVerificationStatus,
        },
        objectId: parsed.data.sellerId,
        objectType: "SELLER",
        previousValue: {
          sellerStatus: current.sellerStatus,
          verificationStatus: current.verificationStatus ?? "DRAFT",
        },
        reason,
      });
    });
  } catch (error) {
    console.error("Vendor verification review failed", error);
    const message = error instanceof Error && error.message === "SELLER_NOT_FOUND"
      ? "That vendor no longer exists."
      : "The vendor review could not be saved. Try again.";
    redirect(`/admin/sellers?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/");
  revalidatePath("/categories/[slug]", "page");
  revalidatePath("/marketplace");
  revalidatePath("/parts/[slug]", "page");
  revalidatePath("/store/[slug]", "page");
  revalidatePath("/admin/sellers");
  redirect(`/admin/sellers?message=${parsed.data.action === "approve" ? "approved" : "rejected"}`);
}

const manualVerificationSchema = z
  .object({
    action: z.enum(["verify", "revoke"]),
    confirmed: z.string().optional(),
    notes: z.string().trim().max(2000),
    reason: z.string().trim().max(1000),
    sellerId: z.string().uuid(),
  })
  .superRefine((value, context) => {
    if (value.action === "verify" && value.confirmed !== "yes") {
      context.addIssue({ code: "custom", message: "Confirm that you personally inspected this business.", path: ["confirmed"] });
    }
    if (value.action === "verify" && value.notes.length < 5) {
      context.addIssue({ code: "custom", message: "Add brief inspection notes.", path: ["notes"] });
    }
    if (value.action === "revoke" && value.reason.length < 5) {
      context.addIssue({ code: "custom", message: "Add a reason for revoking verification.", path: ["reason"] });
    }
  });

export async function manageManualSellerVerificationAction(formData: FormData) {
  const principal = await requireSuperAdmin("/admin/sellers");
  const parsed = manualVerificationSchema.safeParse({
    action: formData.get("action"),
    confirmed: formData.get("confirmed") ?? undefined,
    notes: formData.get("notes") ?? "",
    reason: formData.get("reason") ?? "",
    sellerId: formData.get("sellerId"),
  });
  if (!parsed.success) {
    redirect(`/admin/sellers?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Check the manual verification details.")}`);
  }

  const now = new Date();
  const verifying = parsed.data.action === "verify";
  try {
    await getDatabase().transaction(async (transaction) => {
      const [seller] = await transaction
        .select({ id: sellerProfiles.userId })
        .from(sellerProfiles)
        .where(eq(sellerProfiles.userId, parsed.data.sellerId))
        .limit(1);
      if (!seller) throw new Error("SELLER_NOT_FOUND");

      await transaction
        .insert(manualSellerVerifications)
        .values({
          inspectionNotes: verifying ? parsed.data.notes : null,
          revokedAt: verifying ? null : now,
          revokedBy: verifying ? null : principal.id,
          revocationReason: verifying ? null : parsed.data.reason,
          sellerId: parsed.data.sellerId,
          status: verifying ? "VERIFIED" : "REVOKED",
          updatedAt: now,
          verifiedAt: now,
          verifiedBy: principal.id,
        })
        .onConflictDoUpdate({
          target: manualSellerVerifications.sellerId,
          set: {
            inspectionNotes: verifying ? parsed.data.notes : undefined,
            revokedAt: verifying ? null : now,
            revokedBy: verifying ? null : principal.id,
            revocationReason: verifying ? null : parsed.data.reason,
            status: verifying ? "VERIFIED" : "REVOKED",
            updatedAt: now,
            ...(verifying ? { verifiedAt: now, verifiedBy: principal.id } : {}),
          },
        });

      await transaction.insert(manualSellerVerificationEvents).values({
        actorId: principal.id,
        notes: verifying ? parsed.data.notes : null,
        reason: verifying ? null : parsed.data.reason,
        sellerId: parsed.data.sellerId,
        status: verifying ? "VERIFIED" : "REVOKED",
      });
      await transaction.insert(auditLogs).values({
        action: verifying ? "SELLER_MANUAL_VERIFICATION_GRANTED" : "SELLER_MANUAL_VERIFICATION_REVOKED",
        actorUserId: principal.id,
        newValue: { source: "MANUAL_INSPECTION", status: verifying ? "VERIFIED" : "REVOKED" },
        objectId: parsed.data.sellerId,
        objectType: "SELLER",
        reason: verifying ? parsed.data.notes : parsed.data.reason,
      });
    });
  } catch (error) {
    console.error("Manual seller verification failed", error);
    redirect(`/admin/sellers?error=${encodeURIComponent(error instanceof Error && error.message === "SELLER_NOT_FOUND" ? "That seller no longer exists." : "Manual verification could not be saved.")}`);
  }

  revalidatePath("/");
  revalidatePath("/categories/[slug]", "page");
  revalidatePath("/marketplace");
  revalidatePath("/parts/[slug]", "page");
  revalidatePath("/store/[slug]", "page");
  revalidatePath("/admin/sellers");
  redirect(`/admin/sellers?message=${verifying ? "manually-verified" : "verification-revoked"}`);
}

export async function revokeFoundingMerchantAction(formData: FormData) {
  const principal = await requireSuperAdmin("/admin/sellers");
  const parsed = z.object({
    reason: z.string().trim().min(5).max(1000),
    sellerId: z.string().uuid(),
  }).safeParse({ reason: formData.get("reason"), sellerId: formData.get("sellerId") });
  if (!parsed.success) redirect(`/admin/sellers?error=${encodeURIComponent("Add a reason for revoking the Founding 20 badge.")}`);

  const now = new Date();
  try {
    await getDatabase().transaction(async (transaction) => {
      const [award] = await transaction
        .update(foundingMerchantAwards)
        .set({ revokedAt: now, revokedBy: principal.id, revocationReason: parsed.data.reason })
        .where(and(eq(foundingMerchantAwards.sellerId, parsed.data.sellerId), isNull(foundingMerchantAwards.revokedAt)))
        .returning({ id: foundingMerchantAwards.id, position: foundingMerchantAwards.position });
      if (!award) throw new Error("ACTIVE_AWARD_NOT_FOUND");
      await transaction.insert(foundingMerchantAwardEvents).values({
        action: "REVOKED",
        actorId: principal.id,
        awardId: award.id,
        reason: parsed.data.reason,
      });
      await transaction.insert(auditLogs).values({
        action: "FOUNDING_20_REVOKED",
        actorUserId: principal.id,
        newValue: { position: award.position, revoked: true },
        objectId: parsed.data.sellerId,
        objectType: "SELLER",
        reason: parsed.data.reason,
      });
    });
  } catch (error) {
    console.error("Founding merchant revocation failed", error);
    redirect(`/admin/sellers?error=${encodeURIComponent("The active Founding 20 badge could not be revoked.")}`);
  }
  revalidatePath("/");
  revalidatePath("/categories/[slug]", "page");
  revalidatePath("/marketplace");
  revalidatePath("/parts/[slug]", "page");
  revalidatePath("/store/[slug]", "page");
  revalidatePath("/admin/sellers");
  redirect("/admin/sellers?message=founding-revoked");
}
