import { Cookie, FileText, Shield } from "lucide-react";

import { AccountMenuRow } from "@/components/account/account-menu-row";
import { AccountSectionPage } from "@/components/account/account-section-page";
import { requireRole } from "@/lib/auth/principal";

export default async function PrivacySettingsPage() {
  await requireRole(["BUYER"], "/account/settings/privacy");

  return (
    <AccountSectionPage
      description="Review privacy information and control optional browser storage."
      icon={Shield}
      title="Privacy & Cookies"
    >
      <nav aria-label="Privacy and cookie settings" className="overflow-hidden rounded-xl border border-stone-200 bg-white">
        <AccountMenuRow
          href="/cookie-preferences"
          icon={Cookie}
          label="Cookie preferences"
        />
        <AccountMenuRow
          href="/cookie-policy"
          icon={FileText}
          label="Cookie Policy"
        />
        <AccountMenuRow
          href="/privacy-policy"
          icon={Shield}
          label="Privacy Policy"
        />
      </nav>
    </AccountSectionPage>
  );
}
