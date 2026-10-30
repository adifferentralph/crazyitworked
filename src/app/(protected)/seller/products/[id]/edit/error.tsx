"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function ProductEditError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("seller_product_edit_page_failed", {
      category: "page_render",
      digest: error.digest,
      method: "GET",
      route: "/seller/products/[id]/edit",
    });
  }, [error.digest]);

  return (
    <main className="mx-auto grid min-h-[60vh] w-full max-w-2xl place-items-center px-4 py-12">
      <section className="w-full rounded-lg border border-stone-200 bg-white p-6 text-center sm:p-8">
        <AlertTriangle className="mx-auto size-8 text-primary" aria-hidden="true" />
        <h1 className="mt-4 text-2xl font-semibold text-stone-950">The product editor could not load</h1>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Your product has not been deleted or changed. Try loading the editor again.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Button onClick={reset} type="button">
            <RotateCcw className="size-4" aria-hidden="true" />
            Try again
          </Button>
          <Button asChild variant="outline">
            <Link href="/seller/products">Back to products</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
