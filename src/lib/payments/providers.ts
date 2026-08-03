import Stripe from "stripe";

import type { checkoutRequestSchema } from "@/lib/validation/marketplace";
import type { z } from "zod";

export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;

export type CheckoutSession = {
  id: string;
  url: string;
};

export interface PaymentProvider {
  name: "stripe" | "paystack" | "flutterwave";
  createCheckoutSession(input: CheckoutRequest): Promise<CheckoutSession>;
}

export function getPaymentProvider(name: PaymentProvider["name"] = "stripe"): PaymentProvider {
  if (name === "stripe") {
    return new StripeProvider();
  }

  throw new Error(`${name} is not enabled for checkout in this deployment.`);
}

class StripeProvider implements PaymentProvider {
  name = "stripe" as const;

  private client() {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is required for Stripe checkout.");
    }

    return new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-02-24.acacia",
    });
  }

  async createCheckoutSession(input: CheckoutRequest) {
    const session = await this.client().checkout.sessions.create({
      mode: "payment",
      customer_email: input.buyerEmail,
      client_reference_id: input.orderId,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      metadata: {
        orderId: input.orderId,
      },
      line_items: input.lineItems.map((item) => ({
        quantity: item.quantity,
        price_data: {
          currency: item.currency.toLowerCase(),
          unit_amount: item.unitAmount,
          product_data: {
            name: item.name,
            metadata: {
              sku: item.sku,
            },
          },
        },
      })),
    });

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL.");
    }

    return {
      id: session.id,
      url: session.url,
    };
  }
}

export function constructStripeWebhookEvent(payload: string | Buffer, signature: string) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    throw new Error("Stripe webhook credentials are not configured.");
  }

  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-02-24.acacia",
  }).webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET);
}
