import type { Metadata } from "next";
import { FileUp, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const metadata: Metadata = {
  title: "Wholesale RFQ",
  description: "Submit bulk automotive parts requests and collect vendor quotations.",
};

export default function WholesalePage() {
  return (
    <section className="container-page grid gap-6 py-8 lg:grid-cols-[1fr_360px]">
      <div className="grid gap-4">
        <h1 className="text-3xl font-semibold">Wholesale RFQ</h1>
        <form className="grid gap-4 rounded-lg border bg-white p-5 shadow-soft">
          <label className="grid gap-1 text-sm font-medium">
            Request title
            <Input name="title" placeholder="Toyota Hilux brake pads, 500 units" />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Details
            <Textarea
              name="description"
              placeholder="OEM numbers, quality expectations, delivery terms"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium">
              Quantity
              <Input name="quantity" inputMode="numeric" />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Needed by
              <Input name="neededBy" type="date" />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium">
              Destination city
              <Input name="destinationCity" />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Destination country
              <Input name="destinationCountry" defaultValue="Nigeria" />
            </label>
          </div>
          <Button type="button" variant="outline" className="w-fit">
            <FileUp className="size-4" aria-hidden="true" />
            Attach documents
          </Button>
          <Button type="submit" className="w-fit">
            <Send className="size-4" aria-hidden="true" />
            Submit RFQ
          </Button>
        </form>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Quotation Pipeline</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-muted-foreground">
          <p>Open RFQs are visible to approved vendors with matching inventory categories.</p>
          <p>Accepted quotations become escrow-ready orders with payment records and audit logs.</p>
        </CardContent>
      </Card>
    </section>
  );
}
