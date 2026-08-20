import type { ReactNode } from "react";
import { LogOut } from "lucide-react";

import { signOutAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";

export function AccountShell({
  children,
  description,
  eyebrow,
  title,
}: {
  children: ReactNode;
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <section className="min-h-[60vh] bg-white py-12 sm:py-16">
      <div className="container-page">
        <div className="flex flex-col gap-5 border-b border-stone-200 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-primary">
              {eyebrow}
            </p>
            <h1 className="mt-3 text-4xl font-semibold text-stone-950">{title}</h1>
            <p className="mt-3 max-w-2xl text-stone-600">{description}</p>
          </div>
          <form action={signOutAction}>
            <Button type="submit" variant="outline">
              <LogOut className="size-4" aria-hidden="true" />
              Sign out
            </Button>
          </form>
        </div>
        <div className="py-8">{children}</div>
      </div>
    </section>
  );
}
