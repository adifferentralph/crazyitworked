import { Search } from "lucide-react";

import { AdminStatus, AdminTable } from "@/components/admin/admin-table";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireRole } from "@/lib/auth/principal";
import { getMarketingAudience } from "@/lib/admin/operations";

export default async function MarketingAudiencePage({ searchParams }: { searchParams: Promise<{ consent?: string; q?: string }> }) {
  await requireRole(["ADMIN"], "/admin/marketing/audience");
  const params = await searchParams;
  const consent = params.consent === "opted-in" || params.consent === "unsubscribed" ? params.consent : "all";
  const audience = await getMarketingAudience(params.q, consent);

  return (
    <AdminShell description="Consent-aware buyer email directory for legitimate marketing operations. Transactional email eligibility is separate." title="Marketing Audience">
      <form className="mb-5 grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px_auto]" method="get" role="search">
        <label className="sr-only" htmlFor="audience-search">Search marketing audience</label>
        <div className="relative">
          <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-500" />
          <input className="input-base pl-10" defaultValue={params.q} id="audience-search" name="q" placeholder="Search name or email" type="search" />
        </div>
        <label className="sr-only" htmlFor="audience-consent">Consent status</label>
        <select className="input-base" defaultValue={consent} id="audience-consent" name="consent">
          <option value="all">All preferences</option>
          <option value="opted-in">Marketing opted in</option>
          <option value="unsubscribed">Unsubscribed</option>
        </select>
        <button className="h-11 rounded-md bg-stone-950 px-4 text-sm font-bold text-white hover:bg-primary" type="submit">Filter</button>
      </form>
      <AdminTable columns={["Name", "Email", "Account type", "Joined", "Marketing", "Account"]} emptyMessage="No audience records match these filters." rows={audience.map((customer) => [
        <span className="font-semibold text-stone-950" key="name">{customer.fullName}</span>,
        customer.email,
        customer.accountType.replaceAll("_", " "),
        customer.joinedAt.toLocaleDateString("en-NG"),
        <AdminStatus key="marketing" value={customer.unsubscribedAt ? "UNSUBSCRIBED" : customer.marketingOptIn ? "OPTED_IN" : "NOT_OPTED_IN"} />,
        <AdminStatus key="account" value={customer.accountStatus} />,
      ])} />
    </AdminShell>
  );
}
