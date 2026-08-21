import { describe, expect, it } from "vitest";

import { parseMarketplaceSearch } from "@/lib/marketplace/public-catalog";

describe("marketplace URL search parsing", () => {
  it("parses shareable filters and exact NGN minor units", () => {
    const result = parseMarketplaceSearch({
      availability: "in-stock",
      condition: "USED",
      delivery: "true",
      maxPrice: "50000.25",
      minPrice: "1200",
      q: " Toyota, Camry (04465) ",
      sort: "price-asc",
    });

    expect(result).toMatchObject({
      availability: "in-stock",
      condition: "USED",
      delivery: "true",
      maxPrice: 5_000_025,
      minPrice: 120_000,
      q: "Toyota Camry 04465",
      sort: "price-asc",
    });
  });

  it("drops malformed identifiers, money, and unsupported state", () => {
    const result = parseMarketplaceSearch({
      category: "1) or true",
      condition: "APPROVED",
      maxPrice: "1e9",
      page: "-2",
      seller: "not-a-uuid",
      sort: "rating",
      vehicle: "../../admin",
    });

    expect(result.category).toBeUndefined();
    expect(result.condition).toBeUndefined();
    expect(result.maxPrice).toBeUndefined();
    expect(result.page).toBe(1);
    expect(result.seller).toBeUndefined();
    expect(result.sort).toBe("relevance");
    expect(result.vehicle).toBeUndefined();
  });
});
