import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <section className="container-page grid min-h-[65vh] place-items-center py-20 text-center">
      <div className="max-w-lg">
        <p className="text-sm font-bold uppercase tracking-[0.22em] text-primary">Error 404</p>
        <h1 className="mt-4 text-balance text-4xl font-semibold tracking-tight">
          This road does not lead to a part.
        </h1>
        <p className="mt-4 leading-7 text-muted-foreground">
          The page may have moved, or this listing may no longer be available.
        </p>
        <Button asChild className="mt-7">
          <Link href="/">Return home</Link>
        </Button>
      </div>
    </section>
  );
}
