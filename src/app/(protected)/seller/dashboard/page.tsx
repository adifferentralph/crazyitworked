import Link from "next/link";
import {
  BadgeCheck,
  Boxes,
  CircleAlert,
  Clock3,
  PackageCheck,
  Plus,
  Store,
} from "lucide-react";

import { SellerShell } from "@/components/seller/seller-shell";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/principal";
import { getSellerProducts } from "@/lib/marketplace/seller-data";
import { createClient } from "@/lib/supabase/server";

export default async function SellerDashboardPage() {
  const principal = await requireRole(["SELLER"], "/seller/dashboard");
  const supabase = await createClient();
  const [{ data: seller }, { data: verification }, products] = await Promise.all([
    supabase
      .from("seller_profiles")
      .select("store_name, status, onboarding_completed_at")
      .eq("user_id", principal.id)
      .single(),
    supabase
      .from("seller_verifications")
      .select("status")
      .eq("seller_id", principal.id)
      .maybeSingle(),
    getSellerProducts(principal.id),
  ]);
  const approved = products.filter((product) => product.status === "APPROVED").length;
  const pending = products.filter((product) => product.status === "PENDING_REVIEW").length;
  const needsAttention = products.filter((product) =>
    ["DRAFT", "NEEDS_CHANGES", "REJECTED", "FLAGGED"].includes(product.status),
  ).length;

  return (
    <SellerShell
      description="Manage your store, real product catalogue, inventory, and listing review status."
      title={seller?.store_name ?? "Supplier account"}
    >
      {!seller?.onboarding_completed_at ? (
        <div className="mb-7 flex flex-col gap-4 rounded-lg border border-orange-200 bg-orange-50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <CircleAlert className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
            <div>
              <h2 className="font-semibold text-stone-950">Complete your supplier profile</h2>
              <p className="mt-1 text-sm text-stone-700">
                Trading, contact, and location details are required before you can add products. Business registration is optional.
              </p>
            </div>
          </div>
          <Button asChild>
            <Link href="/seller/onboarding">Continue onboarding</Link>
          </Button>
        </div>
      ) : null}

      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: Store, label: "Total products", value: products.length },
          { icon: BadgeCheck, label: "Approved", value: approved },
          { icon: Clock3, label: "Pending review", value: pending },
          { icon: Boxes, label: "Needs attention", value: needsAttention },
        ].map(({ icon: Icon, label, value }) => (
          <div className="rounded-lg border border-stone-200 bg-white p-5" key={label}>
            <dt className="flex items-center gap-2 text-sm font-semibold text-stone-600">
              <Icon className="size-4 text-primary" aria-hidden="true" />
              {label}
            </dt>
            <dd className="mt-3 text-3xl font-semibold text-stone-950">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_auto]">
        <div className="rounded-lg border border-stone-200 bg-[#fffdf9] p-6">
          <div className="flex items-start gap-3">
            <PackageCheck className="mt-1 size-5 text-primary" aria-hidden="true" />
            <div>
              <h2 className="text-2xl font-semibold text-stone-950">Catalogue workflow</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
                Drafts are private. A listing becomes public only after it has five required
                seller-original images, is submitted, and receives marketplace approval.
              </p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/seller/products/new">
                <Plus className="size-4" aria-hidden="true" />
                Add product
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/seller/products">View catalogue</Link>
            </Button>
          </div>
        </div>
        <div className="min-w-64 rounded-lg border border-stone-200 bg-white p-6">
          <p className="text-sm font-semibold text-stone-500">Store review</p>
          <p className="mt-3 text-xl font-semibold capitalize text-stone-950">
            {(verification?.status ?? "DRAFT").replaceAll("_", " ").toLowerCase()}
          </p>
        </div>
      </div>
    </SellerShell>
  );
}