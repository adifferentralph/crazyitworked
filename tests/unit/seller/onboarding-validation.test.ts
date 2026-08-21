import { describe, expect, it } from "vitest";

import { sellerOnboardingSchema } from "@/lib/validation/seller";

const validProfile = {
  businessRegistrationNumber: "",
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