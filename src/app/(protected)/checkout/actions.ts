"use server";

import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/principal";
import { CheckoutError, createKoraCheckout } from "@/lib/commerce/orders";

export async function startKoraCheckoutAction() {
  const principal = await requireRole(["BUYER"], "/checkout");
  let checkoutUrl: string | null = null;

  try {
    const checkout = await createKoraCheckout({
      email: principal.email,
      fullName: principal.fullName,
      id: principal.id,
    });
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
