import { describe, expect, it } from "vitest";

import {
  buyerProfileSchema,
  fitmentOutcomeSchema,
  savedVehicleSchema,
} from "@/lib/validation/buyer";

describe("buyer account optional fields", () => {
  it("saves an individual profile without optional organisation details", () => {
    const result = buyerProfileSchema.safeParse({
      accountType: "INDIVIDUAL",
      businessRegistrationNumber: undefined,
      organizationName: null,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.businessRegistrationNumber).toBeNull();
      expect(result.data.organizationName).toBeNull();
    }
  });

  it("saves a vehicle without an optional label or registration number", () => {
    const result = savedVehicleSchema.safeParse({
      fitmentId: "11111111-1111-4111-8111-111111111111",
      isDefault: undefined,
      label: undefined,
      registrationNumber: null,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.label).toBeNull();
      expect(result.data.registrationNumber).toBeNull();
    }
  });

  it("accepts fitment feedback without an optional note", () => {
    expect(
      fitmentOutcomeSchema.safeParse({
        snapshotId: "11111111-1111-4111-8111-111111111111",
        outcome: "FIT_CONFIRMED",
      }).success,
    ).toBe(true);
  });
});
