import {
  Bell,
  Cookie,
  LockKeyhole,
  Mail,
  MapPin,
} from "lucide-react";

import { AccountMenuRow } from "@/components/account/account-menu-row";
import { requireRole } from "@/lib/auth/principal";

const settings = [
  {
    description: "Personal details, buyer type, sign-in email, and password",
    href: "/account/security",
    icon: LockKeyhole,
    label: "Profile & Security",
  },
  {
    description: "Delivery and pickup details",
    href: "/account/addresses",
    icon: MapPin,
    label: "Addresses",
  },
  {
    description: "Marketplace and order updates",
    href: "/account/notifications",
    icon: Bell,
    label: "Notifications",
  },
  {
    description: "Optional marketplace email preferences",
    href: "/account/settings/marketing",
    icon: Mail,
    label: "Marketing preferences",
  },
  {
    description: "Cookie choices and privacy information",
    href: "/account/settings/privacy",
    icon: Cookie,
    label: "Privacy & Cookies",
  },
] as const;

export default async function AccountSettingsPage() {
  await requireRole(["BUYER"], "/account/settings");

  return (
    <section className="min-h-[70vh] bg-stone-50 py-6 font-body sm:py-10">
      <div className="container-page max-w-3xl">
        <h1 className="font-body text-3xl font-bold text-stone-950">Settings</h1>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Manage your buyer profile, contact details, preferences, and privacy.
        </p>
        <nav aria-label="Buyer settings" className="mt-6 overflow-hidden rounded-xl border border-stone-200 bg-white">
          {settings.map((setting) => (
            <AccountMenuRow {...setting} key={setting.href} />
          ))}
        </nav>
      </div>
    </section>
  );
}
