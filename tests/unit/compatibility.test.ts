import { describe, expect, it } from "vitest";

import {
  buildAlgoliaFitmentFilter,
  filterCompatibleProducts,
  productFitsVehicle,
} from "@/lib/compatibility";
import type { CatalogHit } from "@/lib/marketplace/types";

const product: CatalogHit = {
  objectID: "p1",
  slug: "toyota-camry-hybrid-inverter-pump",
  title: "Toyota Camry Hybrid Inverter Pump",
  sku: "TM-CAM-IP-2020",
  vendorId: "v1",
  vendorName: "Prime Auto Parts",
  categorySlug: "engine",
  categoryName: "Engine",
  price: 45000,
  currency: "NGN",
  ratingAverage: 4.7,
  ratingCount: 28,
  locationCity: "Lagos",
  locationState: "Lagos",
  availability: "in_stock",
  oemNumbers: ["G9020-33010"],
  aftermarketReferences: ["AIP-33010"],
  fitmentYears: [2019, 2020, 2021],
  fitmentMakes: ["Toyota"],
  fitmentModels: ["Camry"],
  fitmentVariants: ["2.5L Hybrid"],
  isSponsored: false,
};

describe("vehicle compatibility", () => {
  it("matches a selected year, make, model, and variant", () => {
    expect(
      productFitsVehicle(product, {
        year: 2020,
        make: "toyota",
        model: "camry",
        variant: "2.5l hybrid",
      }),
    ).toBe(true);
  });

  it("filters out incompatible model selections", () => {
    expect(
      filterCompatibleProducts([product], {
        year: 2020,
        make: "Toyota",
        model: "Corolla",
      }),
    ).toHaveLength(0);
  });

  it("creates an Algolia filter expression for complete fitment", () => {
    expect(
      buildAlgoliaFitmentFilter({
        year: 2020,
        make: "Toyota",
        model: "Camry",
        variant: '2.5L "Hybrid"',
      }),
    ).toBe(
      'fitmentYears:2020 AND fitmentMakes:"Toyota" AND fitmentModels:"Camry" AND fitmentVariants:"2.5L \\"Hybrid\\""',
    );
  });
});
