import { describe, expect, it } from "vitest";

import {
  normalizeMakeName,
  slugifyVehicleName,
} from "@/lib/vehicle/catalog-import";

describe("vehicle catalogue import normalization", () => {
  it("preserves known manufacturer casing", () => {
    expect(normalizeMakeName(" BMW ")).toBe("BMW");
    expect(normalizeMakeName("mercedes-benz")).toBe("Mercedes-Benz");
  });

  it("creates stable ASCII slugs", () => {
    expect(slugifyVehicleName("Citroen")).toBe("citroen");
    expect(slugifyVehicleName("Mercedes-Benz")).toBe("mercedes-benz");
  });
});
