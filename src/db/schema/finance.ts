import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  index,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { authenticatedRole, authUid } from "drizzle-orm/supabase";

import { sellerProfiles } from "@/db/schema/identity";

const adminCanRead = sql`exists (
  select 1 from public.profiles
  where id = ${authUid} and role = 'ADMIN' and status = 'ACTIVE'
)`;

export const sellerPayoutAccounts = pgTable(
  "seller_payout_accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sellerId: uuid("seller_id")
      .notNull()
      .references(() => sellerProfiles.userId, { onDelete: "cascade" }),
    bankName: text("bank_name").notNull(),
    bankCode: text("bank_code"),
    accountName: text("account_name").notNull(),
    accountNumber: text("account_number").notNull(),
    accountNumberLast4: text("account_number_last4").notNull(),
    currency: text("currency").default("NGN").notNull(),
    status: text("status").default("PENDING_VERIFICATION").notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    verifiedBy: uuid("verified_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("seller_payout_accounts_seller_unique").on(table.sellerId),
    check("seller_payout_accounts_ngn_only", sql`${table.currency} = 'NGN'`),
    check(
      "seller_payout_accounts_status_valid",
      sql`${table.status} in ('PENDING_VERIFICATION', 'VERIFIED', 'REJECTED', 'DISABLED')`,
    ),
    check(
      "seller_payout_accounts_number_valid",
      sql`${table.accountNumber} ~ '^[0-9]{10}$' and ${table.accountNumberLast4} ~ '^[0-9]{4}$'`,
    ),
    pgPolicy("seller_payout_accounts_select_owner_or_admin", {
      for: "select",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.sellerId} or ${adminCanRead}`,
    }),
    pgPolicy("seller_payout_accounts_insert_owner", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${authUid} = ${table.sellerId} and ${table.status} = 'PENDING_VERIFICATION'`,
    }),
    pgPolicy("seller_payout_accounts_update_owner", {
      for: "update",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.sellerId}`,
      withCheck: sql`${authUid} = ${table.sellerId} and ${table.status} = 'PENDING_VERIFICATION'`,
    }),
  ],
).enableRLS();
export const sellerWithdrawalRequests = pgTable(
  "seller_withdrawal_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sellerId: uuid("seller_id")
      .notNull()
      .references(() => sellerProfiles.userId, { onDelete: "restrict" }),
    payoutAccountId: uuid("payout_account_id")
      .notNull()
      .references(() => sellerPayoutAccounts.id, { onDelete: "restrict" }),
    amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
    currency: text("currency").default("NGN").notNull(),
    status: text("status").default("REQUESTED").notNull(),
    sellerNote: text("seller_note"),
    adminNote: text("admin_note"),
    reviewedBy: uuid("reviewed_by"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    payoutReference: text("payout_reference"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("seller_withdrawal_requests_seller_created_idx").on(table.sellerId, table.createdAt),
    index("seller_withdrawal_requests_status_created_idx").on(table.status, table.createdAt),
    uniqueIndex("seller_withdrawal_requests_payout_reference_unique")
      .on(table.payoutReference)
      .where(sql`${table.payoutReference} is not null`),
    check("seller_withdrawal_requests_amount_positive", sql`${table.amountMinor} > 0`),
    check("seller_withdrawal_requests_ngn_only", sql`${table.currency} = 'NGN'`),
    check(
      "seller_withdrawal_requests_status_valid",
      sql`${table.status} in ('REQUESTED', 'APPROVED', 'PROCESSING', 'PAID', 'REJECTED', 'CANCELLED')`,
    ),
    pgPolicy("seller_withdrawal_requests_select_owner_or_admin", {
      for: "select",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.sellerId} or ${adminCanRead}`,
    }),
    pgPolicy("seller_withdrawal_requests_insert_owner", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${authUid} = ${table.sellerId} and ${table.status} = 'REQUESTED'`,
    }),
  ],
).enableRLS();
