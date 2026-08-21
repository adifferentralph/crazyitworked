import { ShoppingCart } from "lucide-react";

import { AccountSectionPage } from "@/components/account/account-section-page";
import { requireRole } from "@/lib/auth/principal";

export default async function CartPage() {
  await requireRole(["BUYER"], "/cart");

  return (
    <AccountSectionPage
      action="Browse parts"
      description="Review selected parts before checkout. Stock and fitment will be revalidated server-side before purchase."
      emptyDescription="Add a marketplace part when you are ready to purchase."
      emptyTitle="Your cart is empty"
      icon={ShoppingCart}
      title="Cart"
    />
  );
}