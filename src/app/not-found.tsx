import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <section className="container-page grid min-h-[60vh] place-items-center py-20 text-center">
      <div className="max-w-md space-y-5">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">404</p>
        <h1 className="text-3xl font-semibold">This route is not in the catalog.</h1>
        <p className="text-muted-foreground">
          Try search, compatibility filters, or return home to continue sourcing parts.
        </p>
        <Button asChild>
          <Link href="/">Back home</Link>
        </Button>
      </div>
    </section>
  );
}
