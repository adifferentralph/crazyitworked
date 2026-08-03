import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { searchCatalog } from "@/lib/search/algolia";
import { jsonError } from "@/lib/security/http";
import { catalogSearchSchema } from "@/lib/validation/marketplace";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const params = Object.fromEntries(request.nextUrl.searchParams);
    const input = catalogSearchSchema.parse(params);
    const result = await searchCatalog(input);

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "s-maxage=30, stale-while-revalidate=120",
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError("Invalid catalog search parameters.", 422, error.flatten());
    }

    return jsonError(error instanceof Error ? error.message : "Catalog search failed.", 500);
  }
}
