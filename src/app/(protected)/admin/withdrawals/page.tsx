import { BadgeCheck, CircleX, WalletCards } from "lucide-react";

import { reviewPayoutAccountAction, reviewWithdrawalAction } from "@/app/(protected)/admin/withdrawals/actions";
import { AdminShell } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatAdminDate } from "@/lib/admin/format";
import { requireAdminPermission } from "@/lib/auth/permissions";
import { getAdminWithdrawalOperations, getPendingPayoutAccounts } from "@/lib/finance/seller-finance";
import { formatNgn } from "@/lib/marketplace/products";

export default async function AdminWithdrawalsPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  await requireAdminPermission("finance.payout", "/admin/withdrawals");
  const [accounts, withdrawals, query] = await Promise.all([getPendingPayoutAccounts(), getAdminWithdrawalOperations(), searchParams]);
  return (
    <AdminShell description="Verify seller bank details and process withdrawal requests with an audit trail." title="Withdrawals">
      {query.message ? <p className="mb-5 rounded-md bg-emerald-50 p-3 text-sm font-semibold text-emerald-900" role="status">{query.message}</p> : null}
      {query.error ? <p className="mb-5 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-900" role="alert">{query.error}</p> : null}
      <section className="rounded-lg border border-stone-200 bg-white p-5">
        <h2 className="text-xl font-bold text-stone-950">Bank accounts awaiting review</h2>
        {accounts.length ? <div className="mt-4 grid gap-3">{accounts.map((account) => <article className="flex flex-col justify-between gap-4 rounded-md border border-stone-200 p-4 sm:flex-row sm:items-center" key={account.id}><div><p className="font-bold text-stone-950">{account.storeName}</p><p className="mt-1 text-sm text-stone-600">{account.email} · {account.bankName} · {account.accountName} · {account.accountNumber}</p><p className="mt-1 text-xs text-stone-500">Updated {formatAdminDate(account.updatedAt)}</p></div><div className="flex gap-2"><form action={reviewPayoutAccountAction}><input name="accountId" type="hidden" value={account.id} /><Button name="action" size="sm" type="submit" value="verify"><BadgeCheck aria-hidden="true" className="size-4" />Verify</Button></form><form action={reviewPayoutAccountAction}><input name="accountId" type="hidden" value={account.id} /><Button name="action" size="sm" type="submit" value="reject" variant="outline"><CircleX aria-hidden="true" className="size-4" />Reject</Button></form></div></article>)}</div> : <p className="mt-4 text-sm text-stone-600">No bank accounts need review.</p>}
      </section>
      <section className="mt-6 rounded-lg border border-stone-200 bg-white p-5">
        <div className="flex items-center gap-2"><WalletCards aria-hidden="true" className="size-5 text-primary" /><h2 className="text-xl font-bold text-stone-950">Withdrawal requests</h2></div>
        {withdrawals.length ? <div className="mt-4 grid gap-4">{withdrawals.map((request) => <article className="rounded-md border border-stone-200 p-4" key={request.id}><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold text-stone-950">{request.store_name}</p><p className="mt-1 text-sm text-stone-600">{request.bank_name} · {request.account_name} · {request.account_number}</p><p className="mt-1 text-xs text-stone-500">{request.email} · {formatAdminDate(request.created_at)}</p></div><div className="text-right"><p className="text-xl font-bold">{formatNgn(Number(request.amount_minor))}</p><p className="text-xs font-semibold capitalize text-stone-600">{request.status.toLowerCase()}</p></div></div>{["REQUESTED", "APPROVED", "PROCESSING"].includes(request.status) ? <form action={reviewWithdrawalAction} className="mt-4 grid gap-3 border-t border-stone-200 pt-4 sm:grid-cols-2"><input name="withdrawalId" type="hidden" value={request.id} /><Input name="payoutReference" placeholder="Payout reference (required when paid)" /><Input name="adminNote" placeholder="Admin note (optional)" /><div className="flex flex-wrap gap-2 sm:col-span-2">{request.status === "REQUESTED" ? <Button name="action" size="sm" type="submit" value="approve">Approve</Button> : null}{request.status === "APPROVED" ? <Button name="action" size="sm" type="submit" value="processing">Mark processing</Button> : null}{["APPROVED", "PROCESSING"].includes(request.status) ? <Button name="action" size="sm" type="submit" value="paid">Mark paid</Button> : null}{["REQUESTED", "APPROVED"].includes(request.status) ? <Button name="action" size="sm" type="submit" value="reject" variant="outline">Reject</Button> : null}</div></form> : null}</article>)}</div> : <p className="mt-4 text-sm text-stone-600">No withdrawal requests yet.</p>}
      </section>
    </AdminShell>
  );
}
