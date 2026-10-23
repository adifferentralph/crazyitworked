import { beforeEach, describe, expect, it, vi } from "vitest";

const cartByBuyer = vi.fn();
const visibleApproved = vi.fn();
const visibleByIds = vi.fn(() => ({ eq: visibleApproved }));
const from = vi.fn((table: string) => ({
  select: vi.fn(() =>
    table === "cart_items"
      ? { eq: cartByBuyer }
      : { in: visibleByIds },
  ),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ from })),
}));

import { getBuyerCartCount } from "@/lib/marketplace/buyer-data";

describe("buyer cart badge count", () => {
  beforeEach(() => {
    cartByBuyer.mockReset();
    visibleApproved.mockReset();
    visibleByIds.mockClear();
    from.mockClear();
  });

  it("counts distinct cart lines instead of summing product quantities", async () => {
    cartByBuyer.mockResolvedValue({
      data: [{ product_id: "product-1" }],
      error: null,
    });
    visibleApproved.mockResolvedValue({
      data: [{ id: "product-1" }],
      error: null,
    });

    await expect(getBuyerCartCount("buyer-1")).resolves.toBe(1);
    expect(cartByBuyer).toHaveBeenCalledWith("buyer_id", "buyer-1");
    expect(visibleByIds).toHaveBeenCalledWith("id", ["product-1"]);
    expect(visibleApproved).toHaveBeenCalledWith("status", "APPROVED");
  });

  it("does not count cart rows whose products are no longer visible", async () => {
    cartByBuyer.mockResolvedValue({
      data: [{ product_id: "hidden-product" }],
      error: null,
    });
    visibleApproved.mockResolvedValue({ data: [], error: null });
    await expect(getBuyerCartCount("buyer-1")).resolves.toBe(0);
  });

  it("uses zero when the cart query fails", async () => {
    cartByBuyer.mockResolvedValue({ data: null, error: { message: "failed" } });
    await expect(getBuyerCartCount("buyer-1")).resolves.toBe(0);
  });
});
