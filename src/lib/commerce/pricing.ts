export type CheckoutPricingItem = {
  deliveryFeeMinor: number;
  priceMinor: number;
  quantity: number;
};

export function calculateCheckoutTotals(
  items: CheckoutPricingItem[],
  fulfillmentMethod: "PICKUP" | "DELIVERY",
) {
  const productSubtotalMinor = items.reduce(
    (sum, item) => sum + item.priceMinor * item.quantity,
    0,
  );
  const actualDeliveryCostMinor = fulfillmentMethod === "DELIVERY"
    ? items.reduce((sum, item) => sum + item.deliveryFeeMinor, 0)
    : 0;
  const platformServiceComponentMinor = 0;
  const deliveryTotalMinor = actualDeliveryCostMinor + platformServiceComponentMinor;
  const totalMinor = productSubtotalMinor + deliveryTotalMinor;

  return {
    actualDeliveryCostMinor,
    deliveryTotalMinor,
    platformServiceComponentMinor,
    productSubtotalMinor,
    totalMinor,
  };
}
