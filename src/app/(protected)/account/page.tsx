import Link from "next/link";
import {
  Bell,
  CarFront,
  ClipboardList,
  FileQuestion,
  Heart,
  LockKeyhole,
  MapPin,
  Star,
  UserRound,
  type LucideIcon,
} from "lucide-react";

import { requireRole } from "@/lib/auth/principal";

type AccountDestination = {
  description: string;
  href: string;
  icon: LucideIcon;
  label: string;
};

const destinations: AccountDestination[] = [
  { href: "/account/orders", icon: ClipboardList, label: "Orders", description: "Track purchases and review order history." },
  { href: "/account/requests", icon: FileQuestion, label: "Part Requests", description: "Send requests and compare matched supplier quotes." },
  { href: "/account/vehicles", icon: CarFront, label: "Saved Vehicles", description: "Keep the vehicles you source parts for." },
  { href: "/account/saved-parts", icon: Heart, label: "Saved Parts", description: "Return to parts you want to compare." },
  { href: "/account/addresses", icon: MapPin, label: "Addresses", description: "Manage delivery and pickup details." },
  { href: "/account/reviews", icon: Star, label: "Reviews", description: "Review eligible purchases and your feedback." },
  { href: "/account/notifications", icon: Bell, label: "Notifications", description: "See marketplace and order updates." },
  { href: "/account/security", icon: LockKeyhole, label: "Profile & Security", description: "Review account details and password security." },
];

export default async function AccountPage() {
  const principal = await requireRole(["BUYER"], "/account");
  const firstName = principal.fullName.trim().split(/\s+/)[0] || principal.fullName;

  return (
    <section className="min-h-[70vh] bg-stone-50 py-8 sm:py-12">
      <div className="container-page">
        <div className="flex items-start gap-4 border-b border-stone-200 pb-7">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-black text-white">
            <UserRound aria-hidden="true" className="size-6" />
          </span>
          <div>
            <h1 className="text-3xl font-semibold text-stone-950 sm:text-4xl">Hello, {firstName}</h1>
            <p className="mt-2 text-sm text-stone-600">Manage your shopping activity, vehicles, delivery details, and account security.</p>
          </div>
        </div>

        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {destinations.map(({ description, href, icon: Icon, label }) => (
            <Link className="rounded-xl border border-stone-200 bg-white p-5 focus-visible:ring-2 focus-visible:ring-primary" href={href} key={href}>
              <Icon aria-hidden="true" className="size-5 text-primary" />
              <h2 className="mt-4 font-body text-lg font-bold text-stone-950">{label}</h2>
              <p className="mt-2 text-sm leading-6 text-stone-600">{description}</p>
            </Link>
          ))}
        </div>

        <div className="mt-7 rounded-xl border border-stone-200 bg-white p-5">
          <h2 className="font-body text-sm font-bold text-stone-950">Account details</h2>
          <dl className="mt-3 text-sm">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <dt className="text-stone-500">Email address</dt>
              <dd className="break-all font-semibold text-stone-800">{principal.email}</dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}