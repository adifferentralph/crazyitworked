import { NextResponse } from "next/server";

import { searchMarketplaceStores } from "@/lib/marketplace/public-catalog";
import { createClient } from "@/lib/supabase/server";

function normalizeQuery(value: string | null) {
  return value
    ?.replace(/[%_(),]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

export async function GET(request: Request) {
  const query = normalizeQuery(new URL(request.url).searchParams.get("q"));
  if (!query || query.length < 2) {
    return NextResponse.json({ categories: [], products: [], stores: [], vehicles: [] });
  }

  const supabase = await createClient();
  const pattern = `%${query.split(" ").filter(Boolean).join("%")}%`;
  const [stores, productSearchResult, categoriesResult, modelsResult] =
    await Promise.all([
      searchMarketplaceStores(query, 3),
      supabase
        .from("marketplace_product_search")
        .select("product_id")
        .ilike("search_text", pattern)
        .limit(4),
      supabase
        .from("product_categories")
        .select("id, name, slug")
        .eq("is_active", true)
        .ilike("name", `%${query}%`)
        .order("name")
        .limit(3),
      supabase
        .from("vehicle_models")
        .select("id, name, make_id")
        .eq("is_active", true)
        .ilike("name", `%${query}%`)
        .order("name")
        .limit(4),
    ]);

  const productIds = (productSearchResult.data ?? []).map((row) => row.product_id);
  const makeIds = [...new Set((modelsResult.data ?? []).map((row) => row.make_id))];
  const [productsResult, makesResult] = await Promise.all([
    productIds.length
      ? supabase
          .from("products")
          .select("id, name, slug")
          .in("id", productIds)
          .eq("status", "APPROVED")
      : Promise.resolve({ data: [] }),
    makeIds.length
      ? supabase.from("vehicle_makes").select("id, name").in("id", makeIds)
      : Promise.resolve({ data: [] }),
  ]);
  const makes = new Map((makesResult.data ?? []).map((make) => [make.id, make.name]));

  return NextResponse.json(
    {
      categories: categoriesResult.data ?? [],
      products: productsResult.data ?? [],
      stores,
      vehicles: (modelsResult.data ?? []).map((model) => ({
        id: model.id,
        label: [makes.get(model.make_id), model.name].filter(Boolean).join(" "),
      })),
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}
