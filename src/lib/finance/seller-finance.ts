import "server-only";

import { desc, eq, sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import {
  sellerLedgerEntries,
  sellerPayoutAccounts,
  sellerWithdrawalRequests,
} from "@/db/schema";

export async function getSellerFinance(sellerId: string) {
  const database = getDatabase();
  const [ledger, balances, payoutAccount, withdrawals] = await Promise.all([
    database.select().from(sellerLedgerEntries).where(eq(sellerLedgerEntries.sellerId, sellerId)).orderBy(desc(sellerLedgerEntries.createdAt)).limit(100),
    database.execute<{ available_minor: string; held_minor: string }>(sql`
      select
        coalesce(sum(case when bucket = 'AVAILABLE' then case when direction = 'CREDIT' then amount_minor else -amount_minor end else 0 end), 0)::text as available_minor,
        coalesce(sum(case when bucket = 'HELD' then case when direction = 'CREDIT' then amount_minor else -amount_minor end else 0 end), 0)::text as held_minor
      from public.seller_ledger_entries
      where seller_id = ${sellerId}::uuid
    `),
    database.select().from(sellerPayoutAccounts).where(eq(sellerPayoutAccounts.sellerId, sellerId)).limit(1),
    database.select().from(sellerWithdrawalRequests).where(eq(sellerWithdrawalRequests.sellerId, sellerId)).orderBy(desc(sellerWithdrawalRequests.createdAt)).limit(30),
  ]);
  const heldMinor = Number(balances[0]?.held_minor ?? 0);
  const availableLedgerMinor = Number(balances[0]?.available_minor ?? 0);
  const reservedWithdrawalMinor = withdrawals.filter((request) => ["REQUESTED", "APPROVED", "PROCESSING"].includes(request.status)).reduce((sum, request) => sum + request.amountMinor, 0);

  return {
    availableMinor: Math.max(0, availableLedgerMinor - reservedWithdrawalMinor),
    heldMinor: Math.max(0, heldMinor),
    ledger,
    payoutAccount: payoutAccount[0] ?? null,
    reservedWithdrawalMinor,
    withdrawals,
  };
}
export async function getAdminWithdrawalOperations() {
  return getDatabase().execute<{
    account_name: string;
    account_number: string;
    account_number_last4: string;
    amount_minor: string;
    bank_name: string;
    created_at: string;
    email: string;
    id: string;
    payout_account_id: string;
    payout_account_status: string;
    payout_reference: string | null;
    seller_id: string;
    status: string;
    store_name: string;
  }>(sql`
    select
      seller_withdrawal_requests.id,
      seller_withdrawal_requests.seller_id,
      seller_withdrawal_requests.payout_account_id,
      seller_withdrawal_requests.amount_minor::text,
      seller_withdrawal_requests.status,
      seller_withdrawal_requests.payout_reference,
      seller_withdrawal_requests.created_at::text,
      seller_payout_accounts.bank_name,
      seller_payout_accounts.account_name,
      seller_payout_accounts.account_number,
      seller_payout_accounts.account_number_last4,
      seller_payout_accounts.status as payout_account_status,
      seller_profiles.store_name,
      profiles.email
    from public.seller_withdrawal_requests
    join public.seller_payout_accounts on seller_payout_accounts.id = seller_withdrawal_requests.payout_account_id
    join public.seller_profiles on seller_profiles.user_id = seller_withdrawal_requests.seller_id
    join public.profiles on profiles.id = seller_withdrawal_requests.seller_id
    order by seller_withdrawal_requests.created_at desc
    limit 200
  `);
}

export type AdminPayoutAccount = {
  accountName: string;
  accountNumber: string;
  accountNumberLast4: string;
  bankName: string;
  email: string;
  id: string;
  sellerId: string;
  status: string;
  storeName: string;
  updatedAt: Date | string;
};

export async function getPendingPayoutAccounts(): Promise<AdminPayoutAccount[]> {
  return getDatabase().execute(sql<AdminPayoutAccount>`
    select
      seller_payout_accounts.id,
      seller_payout_accounts.seller_id as "sellerId",
      seller_payout_accounts.bank_name as "bankName",
      seller_payout_accounts.account_name as "accountName",
      seller_payout_accounts.account_number as "accountNumber",
      seller_payout_accounts.account_number_last4 as "accountNumberLast4",
      seller_payout_accounts.status,
      seller_payout_accounts.updated_at as "updatedAt",
      seller_profiles.store_name as "storeName",
      profiles.email
    from public.seller_payout_accounts
    join public.seller_profiles on seller_profiles.user_id = seller_payout_accounts.seller_id
    join public.profiles on profiles.id = seller_payout_accounts.seller_id
    where seller_payout_accounts.status in ('PENDING_VERIFICATION', 'REJECTED')
    order by seller_payout_accounts.updated_at desc
  `);
}
