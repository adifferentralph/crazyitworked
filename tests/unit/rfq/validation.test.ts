import { describe, expect, it } from "vitest";

import { partRequestSchema } from "@/lib/validation/rfq";

describe("part request optional fields", () => {
  it("submits when optional budget, part numbers, condition, and vehicle are empty", () => {
    const result = partRequestSchema.safeParse({
      budgetMaxMinor: undefined,
      budgetMinMinor: null,
      categoryId: "11111111-1111-4111-8111-111111111111",
      conditionPreferences: [],
      deliveryCity: "Ikeja",
      deliveryState: "Lagos",
      description: "I need the front brake pads for this vehicle.",
      manufacturerPartNumber: undefined,
      oemPartNumber: null,
      partName: "Front brake pads",
      quantity: 1,
      savedVehicleId: undefined,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.budgetMaxMinor).toBeNull();
      expect(result.data.budgetMinMinor).toBeNull();
      expect(result.data.manufacturerPartNumber).toBeNull();
      expect(result.data.oemPartNumber).toBeNull();
      expect(result.data.savedVehicleId).toBeNull();
    }
  });
});
