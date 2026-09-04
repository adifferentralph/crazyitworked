import { createClient } from "@/lib/supabase/server";

export async function getBuyerCart(buyerId: string) {
  const supabase = await createClient();
  const { data: cartItems } = await supabase
    .from("cart_items")
    .select("id, product_id, quantity, updated_at")
    .eq("buyer_id", buyerId)
    .order("updated_at", { ascending: false });
  if (!cartItems?.length) return [];

  const productIds = cartItems.map((item) => item.product_id);
  const { data: products } = await supabase
    .from("products")
    .select(
      "id, slug, name, price_minor, quantity, reserved_quantity, seller_id, city, state, pickup_available, delivery_available",
    )
    .in("id", productIds)
    .eq("status", "APPROVED");
  if (!products?.length) return [];

  const sellerIds = [...new Set(products.map((product) => product.seller_id))];
  const [{ data: images }, { data: sellers }] = await Promise.all([
    supabase
      .from("product_images")
      .select("product_id, storage_path")
      .in("product_id", productIds)
      .eq("is_active", true)
      .eq("is_primary", true),
    supabase
      .from("marketplace_sellers")
      .select("seller_id, store_name")
      .in("seller_id", sellerIds),
  ]);
  const paths = (images ?? []).map((image) => image.storage_path);
  const { data: signed } = paths.length
    ? await supabase.storage.from("product-media").createSignedUrls(paths, 3600)
    : { data: [] };
  const signedByPath = new Map(
    (signed ?? []).map((image, index) => [paths[index], image.signedUrl ?? null]),
  );
  const imageByProduct = new Map(
    (images ?? []).map((image) => [
      image.product_id,
      signedByPath.get(image.storage_path) ?? null,
    ]),
  );
  const sellerById = new Map(
    (sellers ?? []).map((seller) => [seller.seller_id, seller.store_name]),
  );
  const productById = new Map(products.map((product) => [product.id, product]));

  return cartItems.flatMap((item) => {
    const product = productById.get(item.product_id);
    if (!product) return [];
    const available = Math.max(0, product.quantity - product.reserved_quantity);

    return [
      {
        ...item,
        available,
        imageUrl: imageByProduct.get(product.id) ?? null,
        product,
        sellerName: sellerById.get(product.seller_id) ?? "Marketplace supplier",
      },
    ];
  });
}

export async function getBuyerCartCount(buyerId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("cart_items")
    .select("quantity")
    .eq("buyer_id", buyerId);
  return (data ?? []).reduce((sum, item) => sum + item.quantity, 0);
}

export async function getBuyerSavedProducts(buyerId: string) {
  const supabase = await createClient();
  const { data: saved } = await supabase
    .from("saved_parts")
    .select("product_id, created_at")
    .eq("buyer_id", buyerId)
    .order("created_at", { ascending: false });
  if (!saved?.length) return [];
  const productIds = saved.map((item) => item.product_id);
  const { data: products } = await supabase
    .from("products")
    .select("id, slug, name, price_minor, quantity, seller_id, city, state")
    .in("id", productIds)
    .eq("status", "APPROVED");
  if (!products?.length) return [];
  const productById = new Map(products.map((product) => [product.id, product]));
  return saved.flatMap((item) => {
    const product = productById.get(item.product_id);
    return product ? [{ ...item, product }] : [];
  });
}

export async function getDefaultBuyerVehicleId(buyerId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("saved_vehicles")
    .select("fitment_id")
    .eq("buyer_id", buyerId)
    .eq("is_default", true)
    .maybeSingle();
  return data?.fitment_id;
}
