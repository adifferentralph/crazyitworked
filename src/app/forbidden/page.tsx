import type { Metadata } from "next";
import Link from "next/link";
import { ShieldX } from "lucide-react";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "Access denied",
};

export default function ForbiddenPage() {
  return (
    <section className="grid min-h-[60vh] place-items-center bg-white py-16">
      <div className="container-page max-w-xl text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-red-50 text-primary">
          <ShieldX className="size-7" aria-hidden="true" />
        </span>
        <p className="mt-6 font-mono text-xs font-bold uppercase tracking-[0.16em] text-primary">
          Access denied
        </p>
        <h1 className="mt-3 text-4xl font-semibold text-stone-950">
          This account cannot open that area.
        </h1>
        <p className="mt-4 leading-7 text-stone-600">
          Buyer, supplier, and admin tools are separated to protect marketplace data and actions.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link href="/">Return home</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/login">Use another account</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
