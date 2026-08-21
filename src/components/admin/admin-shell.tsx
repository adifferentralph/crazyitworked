import Link from "next/link";
import { Activity, Boxes, LayoutDashboard } from "lucide-react";

const navigation = [
  { href: "/admin", icon: LayoutDashboard, label: "Operations" },
  { href: "/admin/inventory-onboarding", icon: Boxes, label: "Inventory onboarding" },
  { href: "/admin/fitment-intelligence", icon: Activity, label: "Fitment & demand" },
] as const;

export function AdminShell({
  children,
  description,
  title,
}: {
  children: React.ReactNode;
  description: string;
  title: string;
}) {
  return (
    <div className="container-page py-8 sm:py-10">
      <div className="grid gap-8 lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <nav aria-label="Admin operations" className="sticky top-24 grid gap-1 rounded-lg border border-stone-200 bg-white p-3">
            {navigation.map(({ href, icon: Icon, label }) => (
              <Link className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-orange-50 hover:text-primary" href={href} key={href}>
                <Icon aria-hidden="true" className="size-4" />
                {label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="min-w-0">
          <div className="mb-7 border-b border-stone-200 pb-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Admin operations</p>
            <h1 className="mt-2 font-display text-4xl font-semibold text-stone-950">{title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">{description}</p>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}