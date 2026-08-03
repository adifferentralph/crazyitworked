import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { getFitmentFacetOptions } from "@/lib/search/algolia";
import { jsonError } from "@/lib/security/http";
import { vehicleSelectionSchema } from "@/lib/validation/marketplace";

const fitmentOptionsSchema = vehicleSelectionSchema.extend({
  facet: z.enum(["fitmentYears", "fitmentMakes", "fitmentModels", "fitmentVariants"]),
});

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const input = fitmentOptionsSchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const result = await getFitmentFacetOptions(
      {
        year: input.year,
        make: input.make,
        model: input.model,
        variant: input.variant,
      },
      input.facet,
    );

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "s-maxage=120, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError("Invalid fitment request.", 422, error.flatten());
    }

    return jsonError(error instanceof Error ? error.message : "Fitment lookup failed.", 500);
  }
}
