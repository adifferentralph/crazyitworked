import Link from "next/link";
import { ShieldCheck, Truck, Users } from "lucide-react";

import { ProductSearchResults } from "@/components/catalog/product-search-results";
import { MarketplaceHero } from "@/components/home/marketplace-hero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { categories } from "@/lib/marketplace/taxonomy";

export default function HomePage() {
  return (
    <>
      <MarketplaceHero />
      <section className="bg-white py-10">
        <div className="container-page grid gap-4 md:grid-cols-3">
          <TrustItem
            icon={ShieldCheck}
            title="Verified vendors"
            text="Admin-reviewed businesses and audit-backed moderation."
          />
          <TrustItem
            icon={Truck}
            title="Flexible fulfillment"
            text="Pickup, delivery, and interstate shipping per vendor."
          />
          <TrustItem
            icon={Users}
            title="Retail and B2B"
            text="Single-unit checkout, chat negotiation, and wholesale RFQs."
          />
        </div>
      </section>

      <section className="py-12">
        <div className="container-page space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Badge variant="accent">Sponsored</Badge>
              <h2 className="mt-3 text-2xl font-semibold">Featured Marketplace Listings</h2>
            </div>
            <Button asChild variant="outline">
              <Link href="/marketplace?sponsored=true">View sponsored parts</Link>
            </Button>
          </div>
          <ProductSearchResults searchParams={{ sponsored: "true" }} />
        </div>
      </section>

      <section className="bg-white py-12">
        <div className="container-page space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Categories</h2>
              <p className="text-sm text-muted-foreground">
                Browse by automotive system and part family.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/marketplace">All parts</Link>
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/marketplace?category=${category.slug}`}
                className="rounded-lg border bg-background p-4 transition hover:border-primary hover:bg-white"
              >
                <h3 className="font-semibold">{category.name}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{category.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="container-page grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <Badge variant="accent" className="w-fit">
                Wholesale
              </Badge>
              <CardTitle>Alibaba-style RFQs for bulk buyers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>
                Submit quantities, destinations, target dates, and documents. Vendors reply with
                quotations that can be negotiated and converted to orders.
              </p>
              <Button asChild>
                <Link href="/wholesale">Create RFQ</Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Badge variant="secondary" className="w-fit">
                Retail
              </Badge>
              <CardTitle>Compatibility-first single-part purchases</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>
                Search by SKU, OEM reference, category, location, vendor rating, availability, and
                selected vehicle before contacting a seller or checking out.
              </p>
              <Button asChild variant="outline">
                <Link href="/marketplace">Browse retail parts</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  );
}

function TrustItem({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof ShieldCheck;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-3 rounded-lg border bg-background p-4">
      <div className="grid size-10 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}
