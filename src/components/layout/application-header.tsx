import Link from "next/link";
import {
  Activity,
  Bell,
  Boxes,
  CarFront,
  ClipboardList,
  FileQuestion,
  Heart,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Package,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Star,
  Store,
  UserRound,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

import { signOutAction } from "@/app/(auth)/actions";
import { BrandLogo } from "@/components/brand/brand-logo";
import type { Principal } from "@/lib/auth/types";
import { cn } from "@/lib/utils";

type NavigationItem = {
  href: string;
  icon: LucideIcon;
  label: string;
};

const buyerAccountLinks: NavigationItem[] = [
  { href: "/account", icon: UserRound, label: "My Account" },
  { href: "/account/orders", icon: ClipboardList, label: "My Orders" },
  { href: "/account/requests", icon: FileQuestion, label: "Part Requests" },
  { href: "/account/vehicles", icon: CarFront, label: "Saved Vehicles" },
  { href: "/account/saved-parts", icon: Heart, label: "Saved Parts" },
  { href: "/account/addresses", icon: MapPin, label: "Addresses" },
  { href: "/account/reviews", icon: Star, label: "Reviews" },
  { href: "/account/notifications", icon: Bell, label: "Notifications" },
];

const sellerLinks: NavigationItem[] = [
  { href: "/seller/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/seller/products", icon: Package, label: "Products" },
  { href: "/seller/orders", icon: ClipboardList, label: "Orders" },
  { href: "/seller/requests", icon: FileQuestion, label: "Requests" },
  { href: "/seller/inventory", icon: Boxes, label: "Inventory" },
  { href: "/seller/finance", icon: WalletCards, label: "Finance" },
  { href: "/seller/reviews", icon: Star, label: "Reviews" },
  { href: "/seller/notifications", icon: Bell, label: "Notifications" },
  { href: "/seller/onboarding", icon: Store, label: "Store Settings" },
];

function HeaderSearch({ id }: { id: string }) {
  return (
    <form action="/marketplace" className="relative min-w-0 flex-1" role="search">
      <label className="sr-only" htmlFor={id}>
        Search part name, OEM number, vehicle, or seller
      </label>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-stone-500"
      />
      <input
        className="h-11 w-full rounded-md border border-stone-300 bg-stone-50 pl-10 pr-3 text-sm outline-none placeholder:text-stone-500 focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
        id={id}
        name="q"
        placeholder="Search brake pads, OEM number, Toyota Camry..."
        type="search"
      />
    </form>
  );
}

function SignOutButton({ compact = false }: { compact?: boolean }) {
  return (
    <form action={signOutAction}>
      <button
        className={cn(
          "flex w-full items-center gap-3 rounded-md text-left text-sm font-semibold text-stone-700 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          compact ? "px-3 py-2.5" : "px-4 py-3",
        )}
        type="submit"
      >
        <LogOut aria-hidden="true" className="size-4 text-primary" />
        Sign Out
      </button>
    </form>
  );
}

function BuyerAccountMenu({ firstName }: { firstName: string }) {
  return (
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md px-2 py-2 text-sm font-semibold text-stone-800 outline-none hover:bg-stone-100 focus-visible:ring-2 focus-visible:ring-primary [&::-webkit-details-marker]:hidden">
        <UserRound aria-hidden="true" className="size-5" />
        <span className="hidden xl:block">
          <span className="block text-[11px] font-medium leading-none text-stone-500">Hi, {firstName}</span>
          <span className="mt-1 block leading-none">Account</span>
        </span>
      </summary>
      <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-64 rounded-lg border border-stone-200 bg-white p-2 shadow-xl">
        <p className="border-b border-stone-200 px-3 py-2 text-sm font-semibold text-stone-950">Hi, {firstName}</p>
        <nav aria-label="Buyer account" className="mt-1 grid gap-0.5">
          {buyerAccountLinks.map(({ href, icon: Icon, label }) => (
            <Link
              className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-stone-700 hover:bg-stone-100 focus-visible:ring-2 focus-visible:ring-primary"
              href={href}
              key={href}
            >
              <Icon aria-hidden="true" className="size-4 text-primary" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-1 border-t border-stone-200 pt-1">
          <SignOutButton compact />
        </div>
      </div>
    </details>
  );
}

function BuyerHeader({ cartCount, principal }: { cartCount: number; principal: Principal }) {
  const firstName = principal.fullName.trim().split(/\s+/)[0] || "there";

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-stone-200 bg-white">
        <div className="container-page">
          <div className="flex min-h-16 items-center gap-3 lg:gap-5">
            <BrandLogo className="shrink-0 [&_span]:hidden sm:[&_span]:inline" href="/marketplace" priority />
            <Link
              className="hidden shrink-0 items-center gap-2 rounded-md px-2 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-100 focus-visible:ring-2 focus-visible:ring-primary xl:flex"
              href="/marketplace#categories"
            >
              <Menu aria-hidden="true" className="size-4" />
              Categories
            </Link>
            <div className="hidden min-w-0 flex-1 md:block">
              <HeaderSearch id="commerce-header-search-desktop" />
            </div>
            <nav aria-label="Buyer shortcuts" className="ml-auto flex shrink-0 items-center gap-1">
              <Link className="hidden items-center gap-2 rounded-md px-2 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-100 focus-visible:ring-2 focus-visible:ring-primary xl:flex" href="/account/vehicles">
                <CarFront aria-hidden="true" className="size-5" />
                My Vehicle
              </Link>
              <Link className="hidden items-center gap-2 rounded-md px-2 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-100 focus-visible:ring-2 focus-visible:ring-primary lg:flex" href="/account/orders">
                <ClipboardList aria-hidden="true" className="size-5" />
                Orders
              </Link>
              <BuyerAccountMenu firstName={firstName} />
              <Link
                aria-label={`Cart with ${cartCount} ${cartCount === 1 ? "item" : "items"}`}
                className="relative flex items-center gap-2 rounded-md px-2 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-100 focus-visible:ring-2 focus-visible:ring-primary"
                href="/cart"
              >
                <ShoppingCart aria-hidden="true" className="size-5" />
                <span className="hidden xl:inline">Cart</span>
                <span className="grid min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] leading-5 text-white">{cartCount}</span>
              </Link>
            </nav>
          </div>
          <div className="pb-3 md:hidden">
            <HeaderSearch id="commerce-header-search-mobile" />
          </div>
        </div>
      </header>
      <MobileNavigation
        items={[
          { href: "/marketplace", icon: Store, label: "Home" },
          { href: "/marketplace#categories", icon: Menu, label: "Categories" },
          { href: "/account/requests", icon: FileQuestion, label: "Requests" },
          { href: "/cart", icon: ShoppingCart, label: `Cart${cartCount ? ` ${cartCount}` : ""}` },
          { href: "/account", icon: UserRound, label: "Account" },
        ]}
      />
    </>
  );
}

function SellerHeader({ principal, storeName }: { principal: Principal; storeName?: string | null }) {
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-stone-200 bg-white">
        <div className="container-page flex min-h-16 items-center gap-5">
          <BrandLogo className="shrink-0 [&_span]:hidden xl:[&_span]:inline" href="/seller/dashboard" priority />
          <nav aria-label="Seller workspace" className="hidden min-w-0 flex-1 items-center gap-1 lg:flex">
            {sellerLinks.map(({ href, icon: Icon, label }) => (
              <Link
                className="flex items-center gap-1.5 rounded-md px-2 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100 focus-visible:ring-2 focus-visible:ring-primary xl:text-sm"
                href={href}
                key={href}
              >
                <Icon aria-hidden="true" className="size-4 shrink-0" />
                {label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Link className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-white focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" href="/seller/products/new">
              <Plus aria-hidden="true" className="size-4" />
              <span className="hidden sm:inline">Add Product</span>
            </Link>
            <details className="group relative">
              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md px-2 py-2 text-sm font-semibold outline-none hover:bg-stone-100 focus-visible:ring-2 focus-visible:ring-primary [&::-webkit-details-marker]:hidden">
                <UserRound aria-hidden="true" className="size-5" />
                <span className="hidden 2xl:block">{storeName || principal.fullName}</span>
              </summary>
              <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-64 rounded-lg border border-stone-200 bg-white p-2 shadow-xl">
                <p className="border-b border-stone-200 px-3 py-2 text-sm font-semibold">{storeName || "Complete your store"}</p>
                <Link className="mt-1 flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-stone-700 hover:bg-stone-100" href="/seller/onboarding">
                  <Settings aria-hidden="true" className="size-4 text-primary" />
                  Account and store settings
                </Link>
                <div className="mt-1 border-t border-stone-200 pt-1">
                  <SignOutButton compact />
                </div>
              </div>
            </details>
          </div>
        </div>
      </header>
      <MobileNavigation
        items={[
          { href: "/seller/dashboard", icon: LayoutDashboard, label: "Dashboard" },
          { href: "/seller/requests", icon: FileQuestion, label: "Requests" },
          { href: "/seller/products", icon: Package, label: "Products" },
          { href: "/seller/orders", icon: ClipboardList, label: "Orders" },
          { href: "/seller/onboarding", icon: UserRound, label: "Account" },
        ]}
      />
    </>
  );
}

function AdminHeader({ principal }: { principal: Principal }) {
  return (
    <header className="sticky top-0 z-40 border-b border-stone-800 bg-black text-white">
      <div className="container-page flex min-h-16 items-center gap-5">
        <BrandLogo href="/admin" inverse priority />
        <nav aria-label="Admin workspace" className="ml-auto flex items-center gap-2">
          <Link className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold hover:bg-white/10" href="/admin">
            <ShieldCheck aria-hidden="true" className="size-4 text-accent" />
            Operations
          </Link>
          <Link className="hidden items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold hover:bg-white/10 sm:flex" href="/admin/inventory-onboarding">
            <Boxes aria-hidden="true" className="size-4 text-accent" />
            Inventory
          </Link>
          <Link className="hidden items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold hover:bg-white/10 lg:flex" href="/admin/fitment-intelligence">
            <Activity aria-hidden="true" className="size-4 text-accent" />
            Fitment
          </Link>
          <span className="hidden text-sm text-stone-400 sm:inline">{principal.fullName}</span>
          <SignOutButton compact />
        </nav>
      </div>
    </header>
  );
}

function MobileNavigation({ items }: { items: NavigationItem[] }) {
  return (
    <nav
      aria-label="Mobile application navigation"
      className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-stone-200 bg-white px-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1 shadow-[0_-8px_24px_-20px_rgba(0,0,0,0.5)] lg:hidden"
    >
      {items.map(({ href, icon: Icon, label }) => (
        <Link className="flex min-w-0 flex-col items-center gap-1 rounded-md px-1 py-2 text-[10px] font-semibold text-stone-700 focus-visible:ring-2 focus-visible:ring-primary" href={href} key={href}>
          <Icon aria-hidden="true" className="size-5" />
          <span className="max-w-full truncate">{label}</span>
        </Link>
      ))}
    </nav>
  );
}

export function ApplicationHeader({
  cartCount = 0,
  principal,
  storeName,
}: {
  cartCount?: number;
  principal: Principal;
  storeName?: string | null;
}) {
  if (principal.role === "BUYER") return <BuyerHeader cartCount={cartCount} principal={principal} />;
  if (principal.role === "SELLER") return <SellerHeader principal={principal} storeName={storeName} />;
  return <AdminHeader principal={principal} />;
}