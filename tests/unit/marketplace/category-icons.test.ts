import { describe, expect, it } from "vitest";

import { getCategoryIconKey } from "@/lib/marketplace/category-icons";

describe("marketplace category icons", () => {
  it("assigns distinct semantic icons to major automotive categories", () => {
    const keys = [
      getCategoryIconKey("Brakes"),
      getCategoryIconKey("Engine"),
      getCategoryIconKey("Steering"),
      getCategoryIconKey("Suspension"),
      getCategoryIconKey("Fuel System"),
      getCategoryIconKey("Interior"),
    ];

    expect(keys).toEqual([
      "brakes",
      "engine",
      "steering",
      "suspension",
      "fuel",
      "interior",
    ]);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("uses a neutral fallback for unknown categories", () => {
    expect(getCategoryIconKey("Specialist components")).toBe("fallback");
  });
});
