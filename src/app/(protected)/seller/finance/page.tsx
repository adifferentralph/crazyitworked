import { Building2, Clock3, WalletCards } from "lucide-react";

import { requestWithdrawalAction, savePayoutAccountAction } from "@/app/(protected)/seller/finance/actions";
import { SellerShell } from "@/components/seller/seller-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireRole } from "@/lib/auth/principal";
import { formatAdminDate } from "@/lib/admin/format";
import { getSellerFinance } from "@/lib/finance/seller-finance";
import { formatNgn } from "@/lib/marketplace/products";

const labelClass = "mb-2 block text-sm font-semibold text-stone-800";

export default async function SellerFinancePage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const principal = await requireRole(["SELLER"], "/seller/finance");
  const [finance, query] = await Promise.all([getSellerFinance(principal.id), searchParams]);
  const account = finance.payoutAccount;

  return (
    <SellerShell description="See sales money, add the bank account that receives payouts, and request a withdrawal when funds are available." title="Finance">
      {query.message ? <p className="mb-5 rounded-md bg-emerald-50 p-3 text-sm font-semibold text-emerald-900" role="status">{query.message}</p> : null}
      {query.error ? <p className="mb-5 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-900" role="alert">{query.error}</p> : null}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-stone-200 bg-white p-5"><p className="text-sm text-stone-600">Available to withdraw</p><p className="mt-2 text-2xl font-bold text-stone-950">{formatNgn(finance.availableMinor)}</p></div>
        <div className="rounded-lg border border-stone-200 bg-white p-5"><p className="text-sm text-stone-600">Held from sales</p><p className="mt-2 text-2xl font-bold text-stone-950">{formatNgn(finance.heldMinor)}</p></div>
        <div className="rounded-lg border border-stone-200 bg-white p-5"><p className="text-sm text-stone-600">Pending withdrawals</p><p className="mt-2 text-2xl font-bold text-stone-950">{formatNgn(finance.reservedWithdrawalMinor)}</p></div>
      </div>
      <div className="mt-7 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-stone-200 bg-white p-5">
          <div className="flex items-center gap-2"><Building2 aria-hidden="true" className="size-5 text-primary" /><h2 className="text-xl font-bold text-stone-950">Bank details</h2></div>
          {account ? <p className="mt-3 text-sm text-stone-600">Current account: {account.bankName} ending in {account.accountNumberLast4}. Status: <span className="font-semibold capitalize">{account.status.replaceAll("_", " ").toLowerCase()}</span>.</p> : <p className="mt-3 text-sm text-stone-600">Add the bank account where you want to receive withdrawals.</p>}
          <form action={savePayoutAccountAction} className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><label className={labelClass} htmlFor="bankName">Bank name</label><Input defaultValue={account?.bankName ?? ""} id="bankName" name="bankName" required /></div>
            <div className="sm:col-span-2"><label className={labelClass} htmlFor="accountName">Account name</label><Input defaultValue={account?.accountName ?? ""} id="accountName" name="accountName" required /></div>
            <div><label className={labelClass} htmlFor="accountNumber">Account number</label><Input autoComplete="off" id="accountNumber" inputMode="numeric" maxLength={10} minLength={10} name="accountNumber" placeholder={account ? `******${account.accountNumberLast4}` : "10 digits"} required /></div>
            <div><label className={labelClass} htmlFor="bankCode">Bank code <span className="font-normal text-stone-500">- Optional</span></label><Input defaultValue={account?.bankCode ?? ""} id="bankCode" name="bankCode" /></div>
            <Button className="sm:col-span-2" type="submit">Save bank details</Button>
          </form>
        </section>
        <section className="rounded-lg border border-stone-200 bg-white p-5">
          <div className="flex items-center gap-2"><WalletCards aria-hidden="true" className="size-5 text-primary" /><h2 className="text-xl font-bold text-stone-950">Withdraw money</h2></div>
          <p className="mt-3 text-sm text-stone-600">Only released sales money can be withdrawn. The minimum request is {formatNgn(100_000)}.</p>
          <form action={requestWithdrawalAction} className="mt-5 grid gap-4">
            <div><label className={labelClass} htmlFor="amountNgn">Amount (NGN)</label><Input id="amountNgn" inputMode="decimal" name="amountNgn" placeholder="1000.00" required /></div>
            <div><label className={labelClass} htmlFor="note">Note <span className="font-normal text-stone-500">- Optional</span></label><Input id="note" name="note" /></div>
            <Button disabled={!account || account.status !== "VERIFIED" || finance.availableMinor < 100_000} type="submit">Request withdrawal</Button>
          </form>
        </section>
      </div>
      <section className="mt-7 rounded-lg border border-stone-200 bg-white p-5">
        <div className="flex items-center gap-2"><Clock3 aria-hidden="true" className="size-5 text-primary" /><h2 className="text-xl font-bold text-stone-950">Withdrawal history</h2></div>
        {finance.withdrawals.length ? <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead><tr className="border-b border-stone-200 text-stone-600"><th className="p-3">Date</th><th className="p-3">Amount</th><th className="p-3">Status</th><th className="p-3">Reference</th></tr></thead><tbody>{finance.withdrawals.map((request) => <tr className="border-b border-stone-100" key={request.id}><td className="p-3">{formatAdminDate(request.createdAt)}</td><td className="p-3 font-semibold">{formatNgn(request.amountMinor)}</td><td className="p-3 capitalize">{request.status.toLowerCase()}</td><td className="p-3 font-mono">{request.payoutReference ?? "—"}</td></tr>)}</tbody></table></div> : <p className="mt-4 text-sm text-stone-600">No withdrawal requests yet.</p>}
      </section>
    </SellerShell>
  );
}
