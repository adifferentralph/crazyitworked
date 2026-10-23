import { describe, expect, it } from "vitest";

import { calculateCheckoutTotals } from "@/lib/commerce/pricing";

const items = [
  { deliveryFeeMinor: 250_000, priceMinor: 4_500_000, quantity: 2 },
  { deliveryFeeMinor: 100_000, priceMinor: 1_000_000, quantity: 1 },
];

describe("checkout pricing", () => {
  it("keeps pickup delivery totals at zero", () => {
    expect(calculateCheckoutTotals(items, "PICKUP")).toEqual({
      actualDeliveryCostMinor: 0,
      deliveryTotalMinor: 0,
      platformServiceComponentMinor: 0,
      productSubtotalMinor: 10_000_000,
      totalMinor: 10_000_000,
    });
  });

  it("adds each listing flat delivery fee exactly once", () => {
    expect(calculateCheckoutTotals(items, "DELIVERY")).toEqual({
      actualDeliveryCostMinor: 350_000,
      deliveryTotalMinor: 350_000,
      platformServiceComponentMinor: 0,
      productSubtotalMinor: 10_000_000,
      totalMinor: 10_350_000,
    });
  });
});
