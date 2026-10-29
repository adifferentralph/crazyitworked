"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getDatabase } from "@/db/client";
import { auditLogs, sellerLedgerEntries, sellerPayoutAccounts, sellerWithdrawalRequests } from "@/db/schema";
import { requireAdminPermission } from "@/lib/auth/permissions";

export async function reviewPayoutAccountAction(formData: FormData) {
  const principal = await requireAdminPermission("finance.payout", "/admin/withdrawals");
  const parsed = z.object({
    accountId: z.string().uuid(),
    action: z.enum(["verify", "reject"]),
  }).safeParse({ accountId: formData.get("accountId"), action: formData.get("action") });
  if (!parsed.success) redirect("/admin/withdrawals?error=Invalid+bank+account+action.");
  const database = getDatabase();
  const [account] = await database.select().from(sellerPayoutAccounts).where(eq(sellerPayoutAccounts.id, parsed.data.accountId)).limit(1);
  if (!account) redirect("/admin/withdrawals?error=Bank+account+not+found.");
  const status = parsed.data.action === "verify" ? "VERIFIED" : "REJECTED";
  await database.transaction(async (transaction) => {
    await transaction.update(sellerPayoutAccounts).set({
      status,
      updatedAt: new Date(),
      verifiedAt: status === "VERIFIED" ? new Date() : null,
      verifiedBy: principal.id,
    }).where(eq(sellerPayoutAccounts.id, account.id));
    await transaction.insert(auditLogs).values({
      action: status === "VERIFIED" ? "PAYOUT_ACCOUNT_VERIFIED" : "PAYOUT_ACCOUNT_REJECTED",
      actorUserId: principal.id,
      newValue: { status },
      objectId: account.id,
      objectType: "SELLER_PAYOUT_ACCOUNT",
      previousValue: { status: account.status },
    });
  });
  revalidatePath("/admin/withdrawals");
  redirect(`/admin/withdrawals?message=${status === "VERIFIED" ? "Bank+account+verified." : "Bank+account+rejected."}`);
}
export async function reviewWithdrawalAction(formData: FormData) {
  const principal = await requireAdminPermission("finance.payout", "/admin/withdrawals");
  const parsed = z.object({
    action: z.enum(["approve", "reject", "processing", "paid"]),
    adminNote: z.string().trim().max(500).transform((value) => value || null),
    payoutReference: z.string().trim().max(120).transform((value) => value || null),
    withdrawalId: z.string().uuid(),
  }).safeParse({
    action: formData.get("action"),
    adminNote: formData.get("adminNote") ?? "",
    payoutReference: formData.get("payoutReference") ?? "",
    withdrawalId: formData.get("withdrawalId"),
  });
  if (!parsed.success) redirect("/admin/withdrawals?error=Invalid+withdrawal+action.");
  if (parsed.data.action === "paid" && !parsed.data.payoutReference) {
    redirect("/admin/withdrawals?error=Enter+the+payout+reference+before+marking+this+paid.");
  }
  const nextStatuses = {
    approve: "APPROVED",
    paid: "PAID",
    processing: "PROCESSING",
    reject: "REJECTED",
  } as const;
  const nextStatus = nextStatuses[parsed.data.action];
  const database = getDatabase();
  await database.transaction(async (transaction) => {
    await transaction.execute(sql`select pg_advisory_xact_lock(hashtext(${`withdrawal:${parsed.data.withdrawalId}`}))`);
    const [request] = await transaction.select().from(sellerWithdrawalRequests).where(eq(sellerWithdrawalRequests.id, parsed.data.withdrawalId)).limit(1);
    if (!request) throw new Error("WITHDRAWAL_NOT_FOUND");
    const allowedTransitions = {
      APPROVED: ["REQUESTED"],
      PAID: ["APPROVED", "PROCESSING"],
      PROCESSING: ["APPROVED"],
      REJECTED: ["REQUESTED", "APPROVED"],
    } as const;
    const allowed: readonly string[] = allowedTransitions[nextStatus];
    if (!allowed.includes(request.status)) throw new Error("INVALID_WITHDRAWAL_TRANSITION");

    if (nextStatus === "PAID") {
      const ledger = await transaction.select({ amountMinor: sellerLedgerEntries.amountMinor, direction: sellerLedgerEntries.direction }).from(sellerLedgerEntries).where(and(eq(sellerLedgerEntries.sellerId, request.sellerId), eq(sellerLedgerEntries.bucket, "AVAILABLE")));
      const availableMinor = ledger.reduce((sum, entry) => sum + (entry.direction === "CREDIT" ? entry.amountMinor : -entry.amountMinor), 0);
      if (availableMinor < request.amountMinor) throw new Error("INSUFFICIENT_AVAILABLE_BALANCE");
      await transaction.insert(sellerLedgerEntries).values({
        amountMinor: request.amountMinor,
        bucket: "AVAILABLE",
        direction: "DEBIT",
        entryType: "PAYOUT",
        idempotencyKey: `withdrawal-paid:${request.id}`,
        metadata: { payoutReference: parsed.data.payoutReference, withdrawalId: request.id },
        orderId: null,
        orderItemId: null,
        sellerId: request.sellerId,
      }).onConflictDoNothing({ target: sellerLedgerEntries.idempotencyKey });
    }

    await transaction.update(sellerWithdrawalRequests).set({
      adminNote: parsed.data.adminNote,
      paidAt: nextStatus === "PAID" ? new Date() : null,
      payoutReference: parsed.data.payoutReference,
      reviewedAt: new Date(),
      reviewedBy: principal.id,
      status: nextStatus,
      updatedAt: new Date(),
    }).where(and(eq(sellerWithdrawalRequests.id, request.id), inArray(sellerWithdrawalRequests.status, allowed)));
    await transaction.insert(auditLogs).values({
      action: `WITHDRAWAL_${nextStatus}`,
      actorUserId: principal.id,
      newValue: { payoutReference: parsed.data.payoutReference, status: nextStatus },
      objectId: request.id,
      objectType: "SELLER_WITHDRAWAL",
      previousValue: { status: request.status },
      reason: parsed.data.adminNote,
    });
  });
  revalidatePath("/admin/withdrawals");
  revalidatePath("/seller/finance");
  redirect(`/admin/withdrawals?message=Withdrawal+updated+to+${nextStatus.toLowerCase()}.`);
}
