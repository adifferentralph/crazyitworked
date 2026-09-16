import {
  CarFront,
  ClipboardList,
  FileQuestion,
  Heart,
  LogOut,
  Settings,
  Star,
} from "lucide-react";

import { signOutAction } from "@/app/(auth)/actions";
import { AccountMenuRow } from "@/components/account/account-menu-row";
import { LetterAvatar } from "@/components/account/letter-avatar";
import { requireRole } from "@/lib/auth/principal";

const accountDestinations = [
  { href: "/account/orders", icon: ClipboardList, label: "Orders" },
  { href: "/account/requests", icon: FileQuestion, label: "Part Requests" },
  { href: "/account/reviews", icon: Star, label: "Pending Reviews" },
  { href: "/account/saved-parts", icon: Heart, label: "Saved Parts" },
] as const;

export default async function AccountPage() {
  const principal = await requireRole(["BUYER"], "/account");

  return (
    <section className="min-h-[70vh] bg-stone-50 py-6 font-body sm:py-10">
      <div className="container-page max-w-3xl">
        <div className="flex items-center gap-4 rounded-xl border border-stone-200 bg-white p-5">
          <LetterAvatar
            email={principal.email}
            name={principal.fullName}
            size="lg"
            userId={principal.id}
          />
          <div className="min-w-0">
            <h1 className="truncate font-body text-2xl font-bold text-stone-950">
              {principal.fullName}
            </h1>
            <p className="mt-1 truncate text-sm text-stone-600">{principal.email}</p>
          </div>
        </div>

        <div className="mt-7 grid gap-7">
          <section>
            <h2 className="mb-2 px-1 font-body text-xs font-bold uppercase tracking-[0.14em] text-stone-500">
              My account
            </h2>
            <nav aria-label="My account" className="overflow-hidden rounded-xl border border-stone-200 bg-white">
              {accountDestinations.map((destination) => (
                <AccountMenuRow {...destination} key={destination.href} />
              ))}
            </nav>
          </section>

          <section>
            <h2 className="mb-2 px-1 font-body text-xs font-bold uppercase tracking-[0.14em] text-stone-500">
              My vehicles
            </h2>
            <nav aria-label="My vehicles" className="overflow-hidden rounded-xl border border-stone-200 bg-white">
              <AccountMenuRow
                href="/account/vehicles"
                icon={CarFront}
                label="Saved Vehicles"
              />
            </nav>
          </section>

          <section>
            <h2 className="mb-2 px-1 font-body text-xs font-bold uppercase tracking-[0.14em] text-stone-500">
              Account settings
            </h2>
            <nav aria-label="Account settings" className="overflow-hidden rounded-xl border border-stone-200 bg-white">
              <AccountMenuRow
                description="Profile, addresses, notifications, privacy and security"
                href="/account/settings"
                icon={Settings}
                label="Settings"
              />
            </nav>
          </section>

          <form action={signOutAction}>
            <button
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-stone-300 bg-white px-4 font-bold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              type="submit"
            >
              <LogOut aria-hidden="true" className="size-4" />
              Sign out
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
