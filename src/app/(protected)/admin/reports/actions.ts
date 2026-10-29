"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getDatabase } from "@/db/client";
import {
  auditLogs,
  marketplaceReports,
  productTrustScores,
  sellerTrustScores,
  trustScoreEvents,
} from "@/db/schema";
import { requireAdminPermission } from "@/lib/auth/permissions";
import { clampTrustScore, complaintAdjustment } from "@/lib/trust/scoring";

const moderationSchema = z
  .object({
    action: z.enum(["uphold", "dismiss", "resolve"]),
    reason: z.string().trim().min(5).max(1000),
    reportId: z.string().uuid(),
    severity: z.enum(["MINOR", "MODERATE", "SERIOUS"]).optional(),
  })
  .superRefine((value, context) => {
    if (value.action === "uphold" && !value.severity) {
      context.addIssue({ code: "custom", message: "Choose a severity before upholding this report.", path: ["severity"] });
    }
  });

export async function moderateMarketplaceReportAction(formData: FormData) {
  const principal = await requireAdminPermission("reports.manage", "/admin/reports");
  const parsed = moderationSchema.safeParse({
    action: formData.get("action"),
    reason: formData.get("reason"),
    reportId: formData.get("reportId"),
    severity: formData.get("severity") || undefined,
  });
  if (!parsed.success) {
    redirect(`/admin/reports?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Check the moderation decision.")}`);
  }

  try {
    await getDatabase().transaction(async (transaction) => {
      const [report] = await transaction
        .select({
          productId: marketplaceReports.productId,
          sellerId: marketplaceReports.sellerId,
          status: marketplaceReports.status,
          targetType: marketplaceReports.targetType,
        })
        .from(marketplaceReports)
        .where(eq(marketplaceReports.id, parsed.data.reportId))
        .for("update")
        .limit(1);
      if (!report) throw new Error("REPORT_NOT_FOUND");

      const now = new Date();
      const idempotencyKey = `report:${parsed.data.reportId}:upheld`;
      if (parsed.data.action === "uphold") {
        if (report.status !== "PENDING") throw new Error("REPORT_ALREADY_DECIDED");
        const delta = complaintAdjustment(parsed.data.severity ?? "MINOR");
        const [event] = await transaction
          .insert(trustScoreEvents)
          .values({
            createdBy: principal.id,
            deltaHundredths: delta,
            idempotencyKey,
            productId: report.targetType === "PRODUCT" ? report.productId : null,
            reason: parsed.data.reason,
            scope: report.targetType === "PRODUCT" ? "PRODUCT" : "SELLER",
            sellerId: report.sellerId,
            sourceId: parsed.data.reportId,
            sourceType: "UPHELD_REPORT",
          })
          .onConflictDoNothing({ target: trustScoreEvents.idempotencyKey })
          .returning({ id: trustScoreEvents.id });

        if (event) {
          if (report.targetType === "PRODUCT" && report.productId) {
            await transaction
              .insert(productTrustScores)
              .values({ productId: report.productId, scoreHundredths: clampTrustScore(350 + delta), eventCount: 1, updatedAt: now })
              .onConflictDoUpdate({
                target: productTrustScores.productId,
                set: {
                  eventCount: sql`${productTrustScores.eventCount} + 1`,
                  scoreHundredths: sql`greatest(100, least(500, ${productTrustScores.scoreHundredths} + ${delta}))`,
                  updatedAt: now,
                },
              });
          } else {
            await transaction
              .insert(sellerTrustScores)
              .values({ sellerId: report.sellerId, scoreHundredths: clampTrustScore(350 + delta), eventCount: 1, updatedAt: now })
              .onConflictDoUpdate({
                target: sellerTrustScores.sellerId,
                set: {
                  eventCount: sql`${sellerTrustScores.eventCount} + 1`,
                  scoreHundredths: sql`greatest(100, least(500, ${sellerTrustScores.scoreHundredths} + ${delta}))`,
                  updatedAt: now,
                },
              });
          }
        }
      }

      if (parsed.data.action === "resolve" && report.status === "UPHELD") {
        const [event] = await transaction
          .update(trustScoreEvents)
          .set({ reversalReason: parsed.data.reason, reversedAt: now, reversedBy: principal.id })
          .where(and(eq(trustScoreEvents.idempotencyKey, idempotencyKey), isNull(trustScoreEvents.reversedAt)))
          .returning({ delta: trustScoreEvents.deltaHundredths, productId: trustScoreEvents.productId, scope: trustScoreEvents.scope });
        if (event) {
          const restore = -event.delta;
          if (event.scope === "PRODUCT" && event.productId) {
            await transaction.update(productTrustScores).set({
              eventCount: sql`greatest(0, ${productTrustScores.eventCount} - 1)`,
              scoreHundredths: sql`greatest(100, least(500, ${productTrustScores.scoreHundredths} + ${restore}))`,
              updatedAt: now,
            }).where(eq(productTrustScores.productId, event.productId));
          } else {
            await transaction.update(sellerTrustScores).set({
              eventCount: sql`greatest(0, ${sellerTrustScores.eventCount} - 1)`,
              scoreHundredths: sql`greatest(100, least(500, ${sellerTrustScores.scoreHundredths} + ${restore}))`,
              updatedAt: now,
            }).where(eq(sellerTrustScores.sellerId, report.sellerId));
          }
        }
      }

      const nextStatus = parsed.data.action === "uphold" ? "UPHELD" : parsed.data.action === "dismiss" ? "DISMISSED" : "RESOLVED";
      await transaction.update(marketplaceReports).set({
        decidedAt: now,
        moderationReason: parsed.data.reason,
        moderatorId: principal.id,
        severity: parsed.data.action === "uphold" ? parsed.data.severity : null,
        status: nextStatus,
        updatedAt: now,
      }).where(eq(marketplaceReports.id, parsed.data.reportId));

      await transaction.insert(auditLogs).values({
        action: `MARKETPLACE_REPORT_${nextStatus}`,
        actorUserId: principal.id,
        newValue: { severity: parsed.data.severity ?? null, status: nextStatus },
        objectId: parsed.data.reportId,
        objectType: "MARKETPLACE_REPORT",
        previousValue: { status: report.status },
        reason: parsed.data.reason,
      });
    });
  } catch (error) {
    console.error("Marketplace report moderation failed", error);
    const message = error instanceof Error && error.message === "REPORT_ALREADY_DECIDED"
      ? "That report has already been decided. Refresh and try again."
      : "The moderation decision could not be saved.";
    redirect(`/admin/reports?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/");
  revalidatePath("/categories/[slug]", "page");
  revalidatePath("/marketplace");
  revalidatePath("/parts/[slug]", "page");
  revalidatePath("/store/[slug]", "page");
  revalidatePath("/admin/reports");
  redirect("/admin/reports?message=updated");
}
