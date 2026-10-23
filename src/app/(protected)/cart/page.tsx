import { ShoppingCart } from "lucide-react";

import { AccountSectionPage } from "@/components/account/account-section-page";
import { CartContents } from "@/components/commerce/cart-contents";
import { requireRole } from "@/lib/auth/principal";
import { getBuyerCart } from "@/lib/marketplace/buyer-data";

export default async function CartPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const principal = await requireRole(["BUYER"], "/cart");
  const [cart, query] = await Promise.all([
    getBuyerCart(principal.id),
    searchParams,
  ]);

  if (!cart.length) {
    return (
      <AccountSectionPage
        action="Browse parts"
        description="Review selected parts and live stock before placing an order."
        emptyDescription="Add an approved marketplace part when you are ready to purchase."
        emptyTitle="Your cart is empty"
        icon={ShoppingCart}
        title="Cart"
      />
    );
  }

  return (
    <AccountSectionPage
      description="Review selected parts and live stock before placing an order."
      icon={ShoppingCart}
      title="Cart"
    >
      {query.message === "added" ? (
        <p
          className="mb-5 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-900"
          role="status"
        >
          Part added to your cart.
        </p>
      ) : null}
      <CartContents initialItems={cart} />
    </AccountSectionPage>
  );
}
