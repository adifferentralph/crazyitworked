import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { SellerShell } from "@/components/seller/seller-shell";
import { Button } from "@/components/ui/button";

export function SellerOperationPage({
  action,
  actionHref,
  description,
  emptyDescription,
  emptyTitle,
  icon: Icon,
  title,
}: {
  action?: string;
  actionHref?: string;
  description: string;
  emptyDescription: string;
  emptyTitle: string;
  icon: LucideIcon;
  title: string;
}) {
  return (
    <SellerShell description={description} title={title}>
      <div className="rounded-xl border border-stone-200 bg-white px-5 py-12 text-center">
        <Icon aria-hidden="true" className="mx-auto size-9 text-stone-300" />
        <h2 className="mt-4 text-xl font-semibold text-stone-950">{emptyTitle}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-600">{emptyDescription}</p>
        {action && actionHref ? (
          <Button asChild className="mt-5">
            <Link href={actionHref}>{action}</Link>
          </Button>
        ) : null}
      </div>
    </SellerShell>
  );
}