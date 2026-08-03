import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { getPaymentProvider } from "@/lib/payments/providers";
import { jsonError, requireSameOrigin } from "@/lib/security/http";
import { checkoutRequestSchema } from "@/lib/validation/marketplace";

export async function POST(request: NextRequest) {
  try {
    requireSameOrigin(request);
    const { userId } = await auth();

    if (!userId) {
      return jsonError("Authentication is required.", 401);
    }

    const body = checkoutRequestSchema.parse(await request.json());
    const session = await getPaymentProvider("stripe").createCheckoutSession(body);

    return NextResponse.json(session);
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError("Invalid checkout request.", 422, error.flatten());
    }

    return jsonError(error instanceof Error ? error.message : "Checkout failed.", 500);
  }
}
