import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BadgeCheck, Box, CarFront, CircleAlert, Heart, MapPin, PackageCheck, ScanLine, ShieldCheck, Star, Truck } from "lucide-react";
import { notFound } from "next/navigation";

import { toggleSavedPartAction } from "@/app/(protected)/commerce-actions";
import { AddToCartControl } from "@/components/commerce/add-to-cart-control";
import { ProductImageGallery } from "@/components/marketplace/product-image-gallery";
import { SellerRecognitionBadges } from "@/components/marketplace/seller-recognition-badges";
import { TrustRating } from "@/components/marketplace/trust-rating";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentPrincipal } from "@/lib/auth/principal";
import { getPublicDeliveryPolicy } from "@/lib/delivery/settings";
import { formatNgn } from "@/lib/marketplace/products";
import { getMarketplaceProduct } from "@/lib/marketplace/public-catalog";
import { JsonLd } from "@/lib/seo/json-ld";
import { createPublicMetadata, getCanonicalUrl } from "@/lib/seo/metadata";
import { createClient } from "@/lib/supabase/server";

function getFitmentEvidence(evidence: string) {
  switch (evidence) {
    case "OEM_MATCHED":
      return { label: "OEM-number evidence", detail: "The listed OEM number has been matched to this vehicle configuration.", strong: true };
    case "PLATFORM_VERIFIED":
      return { label: "Platform-reviewed compatibility", detail: "Marketplace operations reviewed the compatibility evidence.", strong: true };
    case "PURCHASE_VERIFIED":
      return { label: "Purchase-supported compatibility", detail: "Completed-purchase evidence supports this compatibility.", strong: true };
    case "BUYER_CONFIRMED":
      return { label: "Buyer-confirmed compatibility", detail: "An eligible buyer confirmed fit after fulfilment.", strong: true };
    default:
      return { label: "Seller-stated compatibility", detail: "This fitment was entered by the supplier and has not yet received independent marketplace evidence.", strong: false };
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const detail = await getMarketplaceProduct(slug);
  if (!detail) return { title: "Part not found" };
  const primary = detail.images.find((image) => image.is_primary) ?? detail.images[0];
  return createPublicMetadata({
    description: detail.product.description.slice(0, 155),
    image: primary ? getCanonicalUrl(`/product-images/${primary.id}`) : undefined,
    path: `/parts/${detail.product.slug}`,
    title: detail.product.name,
  });
}

export default async function PartDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const detail = await getMarketplaceProduct(slug);
  if (!detail) notFound();
  const { product, seller, images, fitments, crossReferences, reviewSummary, sellerRecognition, trustScore } = detail;
  const productUrl = getCanonicalUrl(`/parts/${product.slug}`);
  const imageUrls = images.map((image) => getCanonicalUrl(`/product-images/${image.id}`));
  const primary = images.find((image) => image.is_primary) ?? images[0];
  const [principal, deliveryPolicy] = await Promise.all([getCurrentPrincipal(), getPublicDeliveryPolicy()]);
  const canPurchase = principal?.role === "BUYER" && principal.status === "ACTIVE";
  let isSaved = false;
  let cartQuantity = 0;
  if (canPurchase) {
    const supabase = await createClient();
    const [{ data: saved }, { data: cartItem }] = await Promise.all([
      supabase
        .from("saved_parts")
        .select("product_id")
        .eq("buyer_id", principal.id)
        .eq("product_id", product.id)
        .maybeSingle(),
      supabase
        .from("cart_items")
        .select("quantity")
        .eq("buyer_id", principal.id)
        .eq("product_id", product.id)
        .maybeSingle(),
    ]);
    isSaved = Boolean(saved);
    cartQuantity = cartItem?.quantity ?? 0;
  }

  return (
    <section className="min-h-[70vh] bg-white py-10 sm:py-14">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Product",
            brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
            category: detail.categoryName,
            description: product.description,
            itemCondition: product.condition === "NEW"
              ? "https://schema.org/NewCondition"
              : product.condition === "USED" || product.condition === "OEM_TAKE_OFF"
                ? "https://schema.org/UsedCondition"
                : "https://schema.org/RefurbishedCondition",
            mpn: product.manufacturer_part_number ?? product.oem_part_number ?? undefined,
            name: product.name,
            image: imageUrls.length ? imageUrls : undefined,
            aggregateRating: reviewSummary.ratingCount > 0 && reviewSummary.ratingValue !== null ? {
              "@type": "AggregateRating",
              ratingCount: reviewSummary.ratingCount,
              ratingValue: Number(reviewSummary.ratingValue.toFixed(2)),
            } : undefined,
            review: reviewSummary.reviews.length ? reviewSummary.reviews.map((review) => ({
              "@type": "Review",
              author: { "@type": "Person", name: review.reviewerName },
              datePublished: review.createdAt.toISOString(),
              name: review.title ?? undefined,
              reviewBody: review.body ?? undefined,
              reviewRating: { "@type": "Rating", bestRating: 5, ratingValue: review.rating, worstRating: 1 },
            })) : undefined,
            offers: {
              "@type": "Offer",
              availability: product.quantity > 0
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
              price: (product.price_minor / 100).toFixed(2),
              priceCurrency: "NGN",
              hasMerchantReturnPolicy: deliveryPolicy?.returnPolicyActive && deliveryPolicy.returnWindowDays && deliveryPolicy.returnMethod && deliveryPolicy.returnFees ? {
                "@type": "MerchantReturnPolicy",
                applicableCountry: "NG",
                merchantReturnDays: deliveryPolicy.returnWindowDays,
                returnFees: deliveryPolicy.returnFees === "FREE_RETURN" ? "https://schema.org/FreeReturn" : "https://schema.org/ReturnShippingFees",
                returnMethod: deliveryPolicy.returnMethod === "RETURN_BY_MAIL" ? "https://schema.org/ReturnByMail" : "https://schema.org/ReturnInStore",
                returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
              } : undefined,
              seller: seller
                ? { "@type": "Organization", name: seller.store_name, url: getCanonicalUrl(`/store/${seller.slug}`) }
                : undefined,
              shippingDetails: product.delivery_available && deliveryPolicy ? {
                "@type": "OfferShippingDetails",
                deliveryTime: {
                  "@type": "ShippingDeliveryTime",
                  handlingTime: { "@type": "QuantitativeValue", maxValue: deliveryPolicy.handlingMaxDays, minValue: deliveryPolicy.handlingMinDays, unitCode: "DAY" },
                  transitTime: { "@type": "QuantitativeValue", maxValue: deliveryPolicy.transitMaxDays, minValue: deliveryPolicy.transitMinDays, unitCode: "DAY" },
                },
                shippingDestination: { "@type": "DefinedRegion", addressCountry: "NG", addressRegion: "Anambra" },
                shippingRate: { "@type": "MonetaryAmount", currency: "NGN", maxValue: (deliveryPolicy.maximumAutomaticFeeMinor / 100).toFixed(2), minValue: (deliveryPolicy.minimumChargeMinor / 100).toFixed(2) },
              } : undefined,
              url: productUrl,
            },
            sku: product.sku,
            url: productUrl,
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", item: getCanonicalUrl("/"), name: "Marketplace", position: 1 },
              ...(detail.categorySlug
                ? [{ "@type": "ListItem", item: getCanonicalUrl(`/categories/${detail.categorySlug}`), name: detail.categoryName, position: 2 }]
                : []),
              { "@type": "ListItem", item: productUrl, name: product.name, position: detail.categorySlug ? 3 : 2 },
            ],
          },
        ]}
      />
      <div className="container-page">
        <Button asChild size="sm" variant="ghost"><Link href={canPurchase ? "/marketplace" : "/find-a-part"}><ArrowLeft className="size-4" aria-hidden="true" />Back to marketplace</Link></Button>

        <div className="mt-6 grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <ProductImageGallery
              images={images}
              initialImageId={primary?.id}
              productName={product.name}
            />
          </div>

          <aside>
            <div className="flex flex-wrap gap-2"><Badge variant="outline" className="capitalize">{product.condition.replaceAll("_", " ").toLowerCase()}</Badge><Badge variant={product.quantity > 0 ? "default" : "muted"}>{product.quantity > 0 ? "In stock" : "Out of stock"}</Badge></div>
            <p className="mt-5 text-sm font-semibold uppercase tracking-[0.12em] text-primary">{detail.categoryName}</p>
            <h1 className="mt-2 text-4xl font-semibold leading-tight text-stone-950 sm:text-5xl">{product.name}</h1>
            <p className="mt-5 text-3xl font-semibold text-stone-950">{formatNgn(product.price_minor)}</p>
            <TrustRating score={trustScore} />
            <SellerRecognitionBadges recognition={sellerRecognition} />
            <div className="mt-6 grid gap-3 rounded-lg border border-stone-200 bg-[#fffdf9] p-5 text-sm text-stone-700">
              <p className="flex items-center gap-2"><PackageCheck className="size-4 text-primary" aria-hidden="true" />{seller ? <Link className="font-semibold text-stone-950 underline-offset-4 hover:underline" href={`/store/${seller.slug}`}>{seller.store_name}</Link> : <span className="font-semibold text-stone-950">Marketplace supplier</span>}</p>
              <p className="flex items-center gap-2"><ShieldCheck className="size-4 text-primary" aria-hidden="true" />Business review: {(seller?.verification_status ?? "submitted").replaceAll("_", " ").toLowerCase()}</p>
              <p className="flex items-center gap-2"><Star className="size-4 text-primary" aria-hidden="true" />{reviewSummary.ratingCount && reviewSummary.ratingValue !== null ? `${reviewSummary.ratingValue.toFixed(1)} from ${reviewSummary.ratingCount} verified purchase${reviewSummary.ratingCount === 1 ? "" : "s"}` : "No reviews yet"}</p>
              <p className="flex items-center gap-2"><MapPin className="size-4 text-primary" aria-hidden="true" />{product.city}, {product.state}, Nigeria</p>
              <p className="flex items-center gap-2"><Truck className="size-4 text-primary" aria-hidden="true" />{[product.pickup_available ? "Pickup" : null, product.delivery_available ? "Delivery" : null].filter(Boolean).join(" and ")} available</p>
              {product.pickup_available ? <p className="flex items-center justify-between gap-4"><span>Pickup fee</span><strong>{formatNgn(0)}</strong></p> : null}
              {product.delivery_available ? <p className="flex items-center justify-between gap-4"><span>Delivery fee</span><strong>Calculated at checkout</strong></p> : null}
            </div>
            <dl className="mt-6 grid gap-3 border-y border-stone-200 py-5 text-sm">
              {product.brand ? <div className="flex justify-between gap-4"><dt className="text-stone-500">Brand</dt><dd className="font-semibold">{product.brand}</dd></div> : null}
              <div className="flex justify-between gap-4"><dt className="text-stone-500">Quantity available</dt><dd className="font-semibold">{product.quantity}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-stone-500">OEM number</dt><dd className="font-mono">{product.oem_part_number ?? "Not provided"}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-stone-500">Manufacturer number</dt><dd className="font-mono">{product.manufacturer_part_number ?? "Not provided"}</dd></div>
            </dl>
            {canPurchase ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <AddToCartControl
                  available={product.quantity}
                  initialQuantity={cartQuantity}
                  productId={product.id}
                />
                <form action={toggleSavedPartAction}>
                  <input name="productId" type="hidden" value={product.id} />
                  <Button className="w-full" size="lg" type="submit" variant="outline">
                    <Heart className="size-5" fill={isSaved ? "currentColor" : "none"} aria-hidden="true" />
                    {isSaved ? "Remove saved part" : "Save part"}
                  </Button>
                </form>
              </div>
            ) : principal ? null : (
              <Button asChild className="mt-5 w-full" size="lg">
                <Link href={`/login?next=${encodeURIComponent(`/parts/${product.slug}`)}`}>Sign in to buy</Link>
              </Button>
            )}
          </aside>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <section className="rounded-lg border border-stone-200 bg-white p-6"><div className="flex items-center gap-2"><Box className="size-5 text-primary" aria-hidden="true" /><h2 className="text-2xl font-semibold">Part description</h2></div><p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-stone-700">{product.description}</p>{crossReferences.length ? <div className="mt-5 border-t border-stone-200 pt-4"><p className="flex items-center gap-2 text-sm font-semibold"><ScanLine className="size-4 text-primary" aria-hidden="true" />Cross-reference numbers</p><p className="mt-2 font-mono text-sm text-stone-600">{crossReferences.join(" · ")}</p></div> : null}</section>
          <section className="rounded-lg border border-stone-200 bg-[#fffdf9] p-6">
            <div className="flex items-center gap-2"><CarFront className="size-5 text-primary" aria-hidden="true" /><h2 className="text-2xl font-semibold">Vehicle compatibility evidence</h2></div>
            {fitments.length ? (
              <ul className="mt-4 grid gap-3">
                {fitments.map((fitment) => {
                  const evidence = getFitmentEvidence(fitment.evidenceType);
                  const EvidenceIcon = evidence.strong ? BadgeCheck : CircleAlert;
                  return (
                    <li className="rounded-md border border-stone-200 bg-white p-4" key={fitment.id}>
                      <div className="flex items-start gap-3">
                        <EvidenceIcon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                        <div><p className="text-sm font-semibold text-stone-950">{fitment.label}</p><p className="mt-1 text-xs font-semibold text-primary">{evidence.label}</p><p className="mt-1 text-xs leading-5 text-stone-600">{evidence.detail}</p></div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : <p className="mt-4 text-sm leading-6 text-stone-600">No vehicle compatibility has been attached to this listing. Match by exact part number and confirm with the supplier before ordering.</p>}
          </section>
        </div>

        <section className="mt-6 rounded-lg border border-stone-200 bg-white p-6"><div className="flex items-center gap-2"><Star className="size-5 text-primary" aria-hidden="true" /><h2 className="text-2xl font-semibold">Buyer reviews</h2></div>{reviewSummary.reviews.length ? <div className="mt-4 grid gap-4">{reviewSummary.reviews.map((review) => <article className="rounded-md border border-stone-200 p-4" key={review.id}><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-bold text-stone-950">{review.reviewerName}</p><p className="text-sm font-semibold text-primary">{review.rating} / 5</p></div>{review.title ? <h3 className="mt-2 font-bold text-stone-900">{review.title}</h3> : null}{review.body ? <p className="mt-2 text-sm leading-6 text-stone-600">{review.body}</p> : null}<time className="mt-3 block text-xs text-stone-500" dateTime={review.createdAt.toISOString()}>{new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" }).format(review.createdAt)}</time></article>)}</div> : <p className="mt-3 text-sm text-stone-600">No verified-purchase reviews have been submitted for this part yet.</p>}</section>
      </div>
    </section>
  );
}
