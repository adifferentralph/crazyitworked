import { createClient } from "@/lib/supabase/server";
import { getMarketplaceOptions } from "@/lib/marketplace/public-catalog";

export async function getPartRequestFormOptions(buyerId: string) {
  const supabase = await createClient();
  const [marketplace, savedResult] = await Promise.all([
    getMarketplaceOptions(),
    supabase
      .from("saved_vehicles")
      .select("id, fitment_id, label, registration_number, is_default")
      .eq("buyer_id", buyerId)
      .order("is_default", { ascending: false }),
  ]);
  const vehiclesById = new Map(marketplace.vehicles.map((vehicle) => [vehicle.id, vehicle]));
  return {
    categories: marketplace.categories,
    savedVehicles: (savedResult.data ?? []).map((saved) => ({
      ...saved,
      vehicle: vehiclesById.get(saved.fitment_id) ?? null,
    })),
  };
}

export async function getBuyerPartRequests(buyerId: string) {
  const supabase = await createClient();
  const { data: requests } = await supabase
    .from("part_requests")
    .select("*")
    .eq("buyer_id", buyerId)
    .order("updated_at", { ascending: false });
  if (!requests?.length) return [];
  const requestIds = requests.map((request) => request.id);
  const { data: quotes } = await supabase
    .from("part_request_quotes")
    .select("request_id, status")
    .in("request_id", requestIds);
  const quoteCount = new Map<string, number>();
  for (const quote of quotes ?? []) {
    if (quote.status !== "WITHDRAWN") quoteCount.set(quote.request_id, (quoteCount.get(quote.request_id) ?? 0) + 1);
  }
  return requests.map((request) => ({ ...request, quoteCount: quoteCount.get(request.id) ?? 0 }));
}

export async function getBuyerPartRequest(requestId: string, buyerId: string) {
  const supabase = await createClient();
  const { data: request } = await supabase
    .from("part_requests")
    .select("*")
    .eq("id", requestId)
    .eq("buyer_id", buyerId)
    .single();
  if (!request) return null;
  const [quotesResult, imagesResult, eventsResult, categoriesResult, marketplace] = await Promise.all([
    supabase.from("part_request_quotes").select("*").eq("request_id", request.id).order("created_at"),
    supabase.from("part_request_images").select("*").eq("request_id", request.id).order("created_at"),
    supabase.from("part_request_events").select("*").eq("request_id", request.id).order("created_at"),
    supabase.from("product_categories").select("id, name").eq("id", request.category_id ?? "00000000-0000-0000-0000-000000000000").maybeSingle(),
    getMarketplaceOptions(),
  ]);
  const paths = (imagesResult.data ?? []).map((image) => image.storage_path);
  const { data: signed } = paths.length
    ? await supabase.storage.from("request-media").createSignedUrls(paths, 3600)
    : { data: [] };
  const quoteSellerIds = [...new Set((quotesResult.data ?? []).map((quote) => quote.seller_id))];
  const { data: sellers } = quoteSellerIds.length
    ? await supabase.from("marketplace_sellers").select("seller_id, store_name, state, city").in("seller_id", quoteSellerIds)
    : { data: [] };
  const sellerById = new Map((sellers ?? []).map((seller) => [seller.seller_id, seller]));
  return {
    categoryName: categoriesResult.data?.name ?? "Automotive part",
    events: eventsResult.data ?? [],
    images: (imagesResult.data ?? []).map((image, index) => ({ ...image, signedUrl: signed?.[index]?.signedUrl ?? null })),
    quotes: (quotesResult.data ?? []).map((quote) => ({ ...quote, seller: sellerById.get(quote.seller_id) ?? null })),
    request,
    vehicle: marketplace.vehicles.find((vehicle) => vehicle.id === request.fitment_id) ?? null,
  };
}

export async function getSellerMatchedRequests(sellerId: string) {
  const supabase = await createClient();
  const { data: matches } = await supabase
    .from("seller_request_matches")
    .select("*")
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false });
  if (!matches?.length) return [];
  const requestIds = matches.map((match) => match.request_id);
  const [{ data: requests }, { data: quotes }] = await Promise.all([
    supabase.from("part_requests").select("*").in("id", requestIds),
    supabase.from("part_request_quotes").select("request_id, status").eq("seller_id", sellerId).in("request_id", requestIds),
  ]);
  const requestById = new Map((requests ?? []).map((request) => [request.id, request]));
  const quoteByRequest = new Map((quotes ?? []).map((quote) => [quote.request_id, quote.status]));
  return matches.flatMap((match) => {
    const request = requestById.get(match.request_id);
    return request ? [{ ...match, quoteStatus: quoteByRequest.get(match.request_id) ?? null, request }] : [];
  });
}

export async function getSellerMatchedRequest(requestId: string, sellerId: string) {
  const supabase = await createClient();
  const [{ data: match }, { data: request }, { data: quote }, { data: products }, marketplace] = await Promise.all([
    supabase.from("seller_request_matches").select("*").eq("request_id", requestId).eq("seller_id", sellerId).single(),
    supabase.from("part_requests").select("*").eq("id", requestId).single(),
    supabase.from("part_request_quotes").select("*").eq("request_id", requestId).eq("seller_id", sellerId).maybeSingle(),
    supabase.from("products").select("id, name, sku, status, price_minor, quantity").eq("seller_id", sellerId).order("name"),
    getMarketplaceOptions(),
  ]);
  if (!match || !request) return null;
  const { data: images } = await supabase.from("part_request_images").select("*").eq("request_id", request.id);
  const paths = (images ?? []).map((image) => image.storage_path);
  const { data: signed } = paths.length
    ? await supabase.storage.from("request-media").createSignedUrls(paths, 3600)
    : { data: [] };
  return {
    images: (images ?? []).map((image, index) => ({ ...image, signedUrl: signed?.[index]?.signedUrl ?? null })),
    match,
    products: products ?? [],
    quote,
    request,
    vehicle: marketplace.vehicles.find((vehicle) => vehicle.id === request.fitment_id) ?? null,
  };
}