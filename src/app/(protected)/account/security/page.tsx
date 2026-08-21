import Link from "next/link";
import { LockKeyhole } from "lucide-react";

import { AccountSectionPage } from "@/components/account/account-section-page";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/principal";

export default async function SecurityPage() {
  const principal = await requireRole(["BUYER"], "/account/security");

  return (
    <AccountSectionPage
      description="Review your account identity and use Supabase's secure password-recovery flow when needed."
      icon={LockKeyhole}
      title="Profile & Security"
    >
      <div className="grid gap-5 rounded-xl border border-stone-200 bg-white p-5 sm:p-7">
        <div>
          <p className="text-sm font-semibold text-stone-500">Name</p>
          <p className="mt-1 font-semibold text-stone-950">{principal.fullName}</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-stone-500">Email address</p>
          <p className="mt-1 break-all font-semibold text-stone-950">{principal.email}</p>
        </div>
        <div className="border-t border-stone-200 pt-5">
          <Button asChild variant="outline">
            <Link href="/forgot-password">Reset password securely</Link>
          </Button>
        </div>
      </div>
    </AccountSectionPage>
  );
}