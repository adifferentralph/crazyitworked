"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getDatabase } from "@/db/client";
import { sellerLedgerEntries, sellerPayoutAccounts, sellerWithdrawalRequests } from "@/db/schema";
import { requireRole } from "@/lib/auth/principal";
import { priceInputToMinor } from "@/lib/marketplace/products";

const payoutAccountSchema = z.object({
  accountName: z.string().trim().min(2).max(120),
  accountNumber: z.string().trim().regex(/^[0-9]{10}$/, "Enter a 10-digit account number."),
  bankCode: z.string().trim().max(20).transform((value) => value || null),
  bankName: z.string().trim().min(2).max(120),
});

export async function savePayoutAccountAction(formData: FormData) {
  const principal = await requireRole(["SELLER"], "/seller/finance");
  const parsed = payoutAccountSchema.safeParse({
    accountName: formData.get("accountName"),
    accountNumber: formData.get("accountNumber"),
    bankCode: formData.get("bankCode") ?? "",
    bankName: formData.get("bankName"),
  });
  if (!parsed.success) redirect("/seller/finance?error=Check+the+bank+details+and+try+again.");
  const accountNumberLast4 = parsed.data.accountNumber.slice(-4);
  await getDatabase().insert(sellerPayoutAccounts).values({
    accountName: parsed.data.accountName,
    accountNumber: parsed.data.accountNumber,
    accountNumberLast4,
    bankCode: parsed.data.bankCode,
    bankName: parsed.data.bankName,
    sellerId: principal.id,
  }).onConflictDoUpdate({
    target: sellerPayoutAccounts.sellerId,
    set: {
      accountName: parsed.data.accountName,
      accountNumber: parsed.data.accountNumber,
      accountNumberLast4,
      bankCode: parsed.data.bankCode,
      bankName: parsed.data.bankName,
      status: "PENDING_VERIFICATION",
      updatedAt: new Date(),
      verifiedAt: null,
      verifiedBy: null,
    },
  });
  revalidatePath("/seller/finance");
  redirect("/seller/finance?message=Bank+details+saved+for+verification.");
}
export async function requestWithdrawalAction(formData: FormData) {
  const principal = await requireRole(["SELLER"], "/seller/finance");
  const amount = z.string().trim().regex(/^\d{1,9}(?:\.\d{1,2})?$/).safeParse(formData.get("amountNgn"));
  const note = z.string().trim().max(500).safeParse(formData.get("note") ?? "");
  if (!amount.success || !note.success) redirect("/seller/finance?error=Enter+a+valid+withdrawal+amount.");
  const amountMinor = priceInputToMinor(amount.data);
  if (amountMinor < 100_000) redirect("/seller/finance?error=The+minimum+withdrawal+is+NGN+1,000.00.");

  const database = getDatabase();
  try {
    await database.transaction(async (transaction) => {
      await transaction.execute(sql`select pg_advisory_xact_lock(hashtext(${`withdrawal:${principal.id}`}))`);
      const [account] = await transaction.select().from(sellerPayoutAccounts).where(and(eq(sellerPayoutAccounts.sellerId, principal.id), eq(sellerPayoutAccounts.status, "VERIFIED"))).limit(1);
      if (!account) throw new Error("PAYOUT_ACCOUNT_NOT_VERIFIED");
      const ledger = await transaction.select({ amountMinor: sellerLedgerEntries.amountMinor, direction: sellerLedgerEntries.direction }).from(sellerLedgerEntries).where(and(eq(sellerLedgerEntries.sellerId, principal.id), eq(sellerLedgerEntries.bucket, "AVAILABLE")));
      const availableLedgerMinor = ledger.reduce((sum, entry) => sum + (entry.direction === "CREDIT" ? entry.amountMinor : -entry.amountMinor), 0);
      const outstanding = await transaction.select({ amountMinor: sellerWithdrawalRequests.amountMinor }).from(sellerWithdrawalRequests).where(and(eq(sellerWithdrawalRequests.sellerId, principal.id), inArray(sellerWithdrawalRequests.status, ["REQUESTED", "APPROVED", "PROCESSING"])));
      const withdrawableMinor = availableLedgerMinor - outstanding.reduce((sum, item) => sum + item.amountMinor, 0);
      if (amountMinor > withdrawableMinor) throw new Error("INSUFFICIENT_AVAILABLE_BALANCE");
      await transaction.insert(sellerWithdrawalRequests).values({ amountMinor, payoutAccountId: account.id, sellerId: principal.id, sellerNote: note.data || null });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "PAYOUT_ACCOUNT_NOT_VERIFIED") redirect("/seller/finance?error=Your+bank+details+must+be+verified+before+you+withdraw.");
    if (message === "INSUFFICIENT_AVAILABLE_BALANCE") redirect("/seller/finance?error=The+amount+is+higher+than+your+available+balance.");
    throw error;
  }
  revalidatePath("/seller/finance");
  redirect("/seller/finance?message=Withdrawal+request+submitted.");
}
