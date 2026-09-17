import { describe, expect, it } from "vitest";

import { sellerOnboardingSchema } from "@/lib/validation/seller";

const validProfile = {
  businessRegistrationNumber: "",
  categoryIds: ["c4769a8e-469b-4fde-a0cd-c3f796269f27"],
  city: "Ikeja",
  contactPhone: "+234 801 234 5678",
  country: "Nigeria",
  description: "",
  state: "Lagos",
  storeName: "Ajala Auto Parts",
  websiteUrl: "",
};

describe("seller onboarding", () => {
  it("allows a legitimate small supplier to complete the basic profile without CAC", () => {
    const result = sellerOnboardingSchema.safeParse(validProfile);

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.businessRegistrationNumber).toBeNull();
  });

  it("accepts omitted or null optional business details", () => {
    const requiredProfile = {
      categoryIds: validProfile.categoryIds,
      city: validProfile.city,
      contactPhone: validProfile.contactPhone,
      country: validProfile.country,
      state: validProfile.state,
      storeName: validProfile.storeName,
    };
    const omitted = sellerOnboardingSchema.safeParse(requiredProfile);
    const nullable = sellerOnboardingSchema.safeParse({
      ...requiredProfile,
      businessRegistrationNumber: null,
      description: null,
      websiteUrl: null,
    });

    expect(omitted.success).toBe(true);
    expect(nullable.success).toBe(true);
    if (nullable.success) {
      expect(nullable.data.businessRegistrationNumber).toBeNull();
      expect(nullable.data.description).toBeNull();
      expect(nullable.data.websiteUrl).toBeNull();
    }
  });
  it("accepts every category in the current 56-category catalogue", () => {
    const categoryIds = Array.from(
      { length: 56 },
      (_, index) => `00000000-0000-4000-8000-${index.toString().padStart(12, "0")}`,
    );

    expect(
      sellerOnboardingSchema.safeParse({ ...validProfile, categoryIds }).success,
    ).toBe(true);
  });
  it("accepts a registration number when the supplier provides one", () => {
    const result = sellerOnboardingSchema.safeParse({
      ...validProfile,
      businessRegistrationNumber: "RC 1234567",
    });

    expect(result.success).toBe(true);
  });

  it("still validates a supplied registration number", () => {
    const result = sellerOnboardingSchema.safeParse({
      ...validProfile,
      businessRegistrationNumber: "<script>",
    });

    expect(result.success).toBe(false);
  });
});
