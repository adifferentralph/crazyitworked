import type { Metadata } from "next";
import Link from "next/link";
import { CircleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "Account unavailable",
};

export default function AccountRestrictedPage() {
  return (
    <section className="grid min-h-[60vh] place-items-center bg-white py-16">
      <div className="container-page max-w-xl text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-red-50 text-primary">
          <CircleAlert className="size-7" aria-hidden="true" />
        </span>
        <p className="mt-6 font-mono text-xs font-bold uppercase tracking-[0.16em] text-primary">
          Account status
        </p>
        <h1 className="mt-3 text-4xl font-semibold text-stone-950">
          This account is not available right now.
        </h1>
        <p className="mt-4 leading-7 text-stone-600">
          Contact Twenty-Two Parts support if you believe this restriction is an error.
        </p>
        <Button asChild className="mt-7">
          <Link href="/">Return home</Link>
        </Button>
      </div>
    </section>
  );
}
