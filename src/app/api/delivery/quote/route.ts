import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentPrincipal } from "@/lib/auth/principal";
import { ANAMBRA_LGAS } from "@/lib/delivery/anambra";
import {
  createDeliveryQuote,
  DeliveryQuoteError,
} from "@/lib/delivery/engine";

const nullableCoordinate = z.union([z.number(), z.null()]);
const quoteRequestSchema = z.object({
  landmark: z.string().trim().max(200).nullable(),
  latitude: nullableCoordinate,
  lga: z.enum(ANAMBRA_LGAS),
  longitude: nullableCoordinate,
  phone: z.string().trim().min(8).max(20),
  recipientName: z.string().trim().min(2).max(120),
  state: z.literal("Anambra"),
  streetAddress: z.string().trim().min(5).max(200),
  town: z.string().trim().min(2).max(100),
});

export async function POST(request: Request) {
  const principal = await getCurrentPrincipal();
  if (!principal || principal.role !== "BUYER" || principal.status !== "ACTIVE") {
    return NextResponse.json({ error: "Sign in as a buyer to calculate delivery." }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Enter a valid delivery address." }, { status: 400 });
  }
  const parsed = quoteRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter the recipient, phone number, town, LGA, and street address." },
      { status: 400 },
    );
  }

  try {
    const quote = await createDeliveryQuote(principal.id, parsed.data);
    return NextResponse.json({
      deliveryTotalMinor: quote.deliveryTotalMinor,
      expiresAt: quote.expiresAt.toISOString(),
      productSubtotalMinor: quote.productSubtotalMinor,
      quoteId: quote.id,
      totalMinor: quote.totalMinor,
    });
  } catch (error) {
    if (error instanceof DeliveryQuoteError) {
      return NextResponse.json({ code: error.code, error: error.message }, { status: 422 });
    }
    console.error("Delivery quote generation failed.");
    return NextResponse.json(
      { error: "We could not calculate delivery right now. Try again shortly." },
      { status: 500 },
    );
  }
}
