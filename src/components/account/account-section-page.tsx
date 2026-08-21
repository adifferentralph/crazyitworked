import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

export function AccountSectionPage({
  action,
  actionHref = "/marketplace",
  children,
  description,
  emptyDescription,
  emptyTitle,
  icon: Icon,
  title,
}: {
  action?: string;
  actionHref?: string;
  children?: ReactNode;
  description: string;
  emptyDescription?: string;
  emptyTitle?: string;
  icon: LucideIcon;
  title: string;
}) {
  return (
    <section className="min-h-[70vh] bg-stone-50 py-8 sm:py-12">
      <div className="container-page">
        <div className="flex items-start gap-4 border-b border-stone-200 pb-7">
          <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-black text-white">
            <Icon aria-hidden="true" className="size-5" />
          </span>
          <div>
            <h1 className="text-3xl font-semibold text-stone-950 sm:text-4xl">{title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600 sm:text-base">{description}</p>
          </div>
        </div>
        <div className="py-8">
          {children ?? (
            <div className="rounded-xl border border-stone-200 bg-white px-5 py-12 text-center">
              <Icon aria-hidden="true" className="mx-auto size-9 text-stone-300" />
              <h2 className="mt-4 text-xl font-semibold text-stone-950">{emptyTitle}</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-600">{emptyDescription}</p>
              {action ? (
                <Button asChild className="mt-5">
                  <Link href={actionHref}>{action}</Link>
                </Button>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}