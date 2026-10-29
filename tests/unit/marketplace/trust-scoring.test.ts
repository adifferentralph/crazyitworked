import { describe, expect, it } from "vitest";

import {
  clampTrustScore,
  complaintAdjustment,
  displayTrustScore,
  TRUST_SCORE,
} from "@/lib/trust/scoring";

describe("marketplace trust scoring", () => {
  it("starts products at an explicitly bounded 3.5 score", () => {
    expect(displayTrustScore(undefined)).toBe(3.5);
    expect(TRUST_SCORE.initialHundredths).toBe(350);
  });

  it("uses the centralized complaint adjustments", () => {
    expect(complaintAdjustment("MINOR")).toBe(-25);
    expect(complaintAdjustment("MODERATE")).toBe(-50);
    expect(complaintAdjustment("SERIOUS")).toBe(-75);
    expect(TRUST_SCORE.adjustments.verifiedPositivePurchase).toBe(25);
  });

  it("keeps every score between one and five", () => {
    expect(clampTrustScore(-100)).toBe(100);
    expect(clampTrustScore(275)).toBe(275);
    expect(clampTrustScore(900)).toBe(500);
  });

  it("restores a deduction by applying its inverse once", () => {
    const deduction = complaintAdjustment("SERIOUS");
    const reduced = clampTrustScore(TRUST_SCORE.initialHundredths + deduction);
    expect(clampTrustScore(reduced - deduction)).toBe(TRUST_SCORE.initialHundredths);
  });
});
