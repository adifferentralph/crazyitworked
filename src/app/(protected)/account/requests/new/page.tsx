import Link from "next/link";
import { ArrowLeft, FileQuestion } from "lucide-react";

import { RequestPartForm } from "@/components/rfq/request-part-form";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/principal";
import { getPartRequestFormOptions } from "@/lib/rfq/data";

export default async function NewPartRequestPage() {
  const principal = await requireRole(["BUYER"], "/account/requests/new");
  const options = await getPartRequestFormOptions(principal.id);

  return (
    <section className="min-h-screen bg-stone-50 py-8 sm:py-12">
      <div className="container-page max-w-4xl">
        <Button asChild size="sm" variant="ghost"><Link href="/account/requests"><ArrowLeft className="size-4" aria-hidden="true" />Back to requests</Link></Button>
        <div className="mt-5 flex items-start gap-4 border-b border-stone-200 pb-7"><span className="grid size-11 shrink-0 place-items-center rounded-lg bg-black text-white"><FileQuestion className="size-5" aria-hidden="true" /></span><div><h1 className="text-3xl font-semibold text-stone-950 sm:text-4xl">Request a part</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">Describe the exact part once. Only matched verified suppliers can view it and respond with a quote.</p></div></div>
        <div className="mt-7"><RequestPartForm categories={options.categories} savedVehicles={options.savedVehicles} /></div>
      </div>
    </section>
  );
}