import { ShieldCheck } from "lucide-react";

import { AccountShell } from "@/components/auth/account-shell";
import { requireRole } from "@/lib/auth/principal";

export default async function AdminPage() {
  const principal = await requireRole(["ADMIN"], "/admin");

  return (
    <AccountShell
      description="This route confirms protected team access. Operational admin modules will be implemented in their dedicated phase."
      eyebrow="Internal operations"
      title={`Admin access for ${principal.fullName}`}
    >
      <div className="flex max-w-2xl gap-4 rounded-lg border border-stone-200 bg-[#fffdf9] p-5">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
        <p className="text-sm leading-6 text-stone-700">
          Your identity has the ADMIN application role. Fine-grained permissions remain enforced by
          the admin role and permission tables before operational tools are exposed.
        </p>
      </div>
    </AccountShell>
  );
}
