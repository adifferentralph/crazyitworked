export const TRUST_SCORE = {
  initialHundredths: 350,
  maximumHundredths: 500,
  minimumHundredths: 100,
  adjustments: {
    minorComplaint: -25,
    moderateComplaint: -50,
    seriousComplaint: -75,
    verifiedPositivePurchase: 25,
  },
} as const;

export type ComplaintSeverity = "MINOR" | "MODERATE" | "SERIOUS";

export function clampTrustScore(scoreHundredths: number) {
  return Math.min(
    TRUST_SCORE.maximumHundredths,
    Math.max(TRUST_SCORE.minimumHundredths, Math.round(scoreHundredths)),
  );
}

export function complaintAdjustment(severity: ComplaintSeverity) {
  if (severity === "SERIOUS") return TRUST_SCORE.adjustments.seriousComplaint;
  if (severity === "MODERATE") return TRUST_SCORE.adjustments.moderateComplaint;
  return TRUST_SCORE.adjustments.minorComplaint;
}

export function displayTrustScore(scoreHundredths: number | null | undefined) {
  return clampTrustScore(scoreHundredths ?? TRUST_SCORE.initialHundredths) / 100;
}
