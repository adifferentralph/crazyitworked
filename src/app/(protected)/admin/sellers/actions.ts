"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getDatabase } from "@/db/client";
import { auditLogs, sellerProfiles, sellerVerifications } from "@/db/schema";
import { requireAdminPermission } from "@/lib/auth/permissions";

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
  revalidatePath("/marketplace");
  revalidatePath("/admin/sellers");
  redirect(`/admin/sellers?message=${parsed.data.action === "approve" ? "approved" : "rejected"}`);
}
