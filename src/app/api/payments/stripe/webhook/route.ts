import { NextRequest, NextResponse } from "next/server";

import { constructStripeWebhookEvent } from "@/lib/payments/providers";
import { jsonError } from "@/lib/security/http";

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return jsonError("Missing Stripe signature.", 400);
  }

  try {
    const rawBody = await request.text();
    const event = constructStripeWebhookEvent(rawBody, signature);

    if (!process.env.CONVEX_PAYMENT_WEBHOOK_URL) {
      return jsonError("CONVEX_PAYMENT_WEBHOOK_URL is required to persist payment events.", 503);
    }

    const response = await fetch(process.env.CONVEX_PAYMENT_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        id: event.id,
        type: event.type,
        created: event.created,
        data: event.data.object,
      }),
    });

    if (!response.ok) {
      return jsonError("Convex payment webhook rejected the event.", 502);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Stripe webhook failed.", 400);
  }
}
