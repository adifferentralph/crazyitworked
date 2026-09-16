import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

function normalizeQuery(value: string | null) {
  return value
    ?.replace(/[%_(),]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 50);
}

export async function GET(request: Request) {
  const query = normalizeQuery(new URL(request.url).searchParams.get("q"));
  if (!query || query.length < 2) {
    return NextResponse.json({ makes: [] });
  }

  const supabase = await createClient();
  const [prefixResult, containsResult] = await Promise.all([
    supabase
      .from("vehicle_makes")
      .select("id, name, is_discontinued, origin_country")
      .eq("is_active", true)
      .ilike("name", query + "%")
      .order("name")
      .limit(20),
    supabase
      .from("vehicle_makes")
      .select("id, name, is_discontinued, origin_country")
      .eq("is_active", true)
      .ilike("name", "%" + query + "%")
      .order("name")
      .limit(60),
  ]);
  const error = prefixResult.error ?? containsResult.error;

  if (error) {
    return NextResponse.json(
      { message: "Vehicle makes could not be searched." },
      { status: 500 },
    );
  }

  const prioritizedMakes = [
    ...new Map(
      [...(prefixResult.data ?? []), ...(containsResult.data ?? [])].map(
        (make) => [make.id, make],
      ),
    ).values(),
  ].slice(0, 20);

  return NextResponse.json(
    {
      makes: prioritizedMakes.map((make) => ({
        id: make.id,
        isDiscontinued: make.is_discontinued,
        label: make.name,
        originCountry: make.origin_country,
      })),
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}
