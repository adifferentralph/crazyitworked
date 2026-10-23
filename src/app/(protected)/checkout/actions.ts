"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { requireRole } from "@/lib/auth/principal";
import { CheckoutError, createKoraCheckout } from "@/lib/commerce/orders";

const deliveryCheckoutSchema = z.discriminatedUnion("fulfillmentMethod", [
  z.object({ fulfillmentMethod: z.literal("PICKUP") }),
  z.object({
    deliveryAddressLine1: z.string().trim().min(5).max(200),
    deliveryAddressLine2: z.string().trim().max(200).transform((value) => value || null),
    deliveryCity: z.string().trim().min(2).max(100),
    deliveryPhone: z.string().trim().regex(/^\+?[0-9][0-9\s-]{7,18}$/),
    deliveryRecipientName: z.string().trim().min(2).max(120),
    deliveryState: z.string().trim().min(2).max(100),
    fulfillmentMethod: z.literal("DELIVERY"),
  }),
]);

export async function startCheckoutAction(formData: FormData) {
  const principal = await requireRole(["BUYER"], "/checkout");
  const parsed = deliveryCheckoutSchema.safeParse({
    deliveryAddressLine1: formData.get("deliveryAddressLine1") ?? "",
    deliveryAddressLine2: formData.get("deliveryAddressLine2") ?? "",
    deliveryCity: formData.get("deliveryCity") ?? "",
    deliveryPhone: formData.get("deliveryPhone") ?? "",
    deliveryRecipientName: formData.get("deliveryRecipientName") ?? "",
    deliveryState: formData.get("deliveryState") ?? "",
    fulfillmentMethod: formData.get("fulfillmentMethod") ?? "PICKUP",
  });
  if (!parsed.success) redirect("/checkout?error=DELIVERY_DETAILS_REQUIRED");
  let checkoutUrl: string | null = null;

  try {
    const checkout = await createKoraCheckout(
      {
        email: principal.email,
        fullName: principal.fullName,
        id: principal.id,
      },
      parsed.data,
    );
    checkoutUrl = checkout.checkoutUrl;
  } catch (error) {
    const code =
      error instanceof CheckoutError ? error.code : "PAYMENT_INITIALIZATION_FAILED";
    redirect(`/checkout?error=${encodeURIComponent(code)}`);
  }

  if (!checkoutUrl) {
    redirect("/checkout?error=PAYMENT_INITIALIZATION_FAILED");
  }

  redirect(checkoutUrl);
}
