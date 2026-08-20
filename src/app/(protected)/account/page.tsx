import { CircleUserRound, Mail } from "lucide-react";

import { AccountShell } from "@/components/auth/account-shell";
import { requireRole } from "@/lib/auth/principal";

export default async function AccountPage() {
  const principal = await requireRole(["BUYER"], "/account");

  return (
    <AccountShell
      description="Your buyer identity is protected and ready for vehicle and part-request features."
      eyebrow="Buyer account"
      title={`Welcome, ${principal.fullName}`}
    >
      <dl className="grid max-w-2xl gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-stone-200 bg-[#fffdf9] p-5">
          <dt className="flex items-center gap-2 text-sm font-semibold text-stone-600">
            <CircleUserRound className="size-4 text-primary" aria-hidden="true" />
            Account role
          </dt>
          <dd className="mt-2 text-lg font-semibold text-stone-950">Buyer</dd>
        </div>
        <div className="rounded-lg border border-stone-200 bg-[#fffdf9] p-5">
          <dt className="flex items-center gap-2 text-sm font-semibold text-stone-600">
            <Mail className="size-4 text-primary" aria-hidden="true" />
            Email
          </dt>
          <dd className="mt-2 break-all text-lg font-semibold text-stone-950">{principal.email}</dd>
        </div>
      </dl>
    </AccountShell>
  );
}
