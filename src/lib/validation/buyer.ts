import { z } from "zod";

const optionalText = (maximum: number) =>
  z
    .string()
    .trim()
    .max(maximum)
    .transform((value) => value || null);

const optionalRegistrationNumber = z
  .string()
  .trim()
  .max(100, "Registration number must be 100 characters or fewer.")
  .refine(
    (value) => !value || /^[A-Za-z0-9][A-Za-z0-9./ -]+$/.test(value),
    "Enter a valid registration number.",
  )
  .transform((value) => value || null);

export const buyerProfileSchema = z
  .object({
    accountType: z.enum([
      "INDIVIDUAL",
      "MECHANIC_TECHNICIAN",
      "GARAGE_WORKSHOP",
      "FLEET_OPERATOR",
      "CORPORATE_BUYER",
    ]),
    businessRegistrationNumber: optionalRegistrationNumber,
    organizationName: optionalText(120),
  })
  .superRefine(({ accountType, organizationName }, context) => {
    if (
      ["GARAGE_WORKSHOP", "FLEET_OPERATOR", "CORPORATE_BUYER"].includes(accountType) &&
      !organizationName
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter your business or organisation name.",
        path: ["organizationName"],
      });
    }
  });

export const savedVehicleSchema = z.object({
  fitmentId: z.string().uuid("Choose a valid vehicle."),
  isDefault: z.preprocess((value) => value === "on" || value === "true", z.boolean()),
  label: optionalText(80),
  registrationNumber: optionalText(30),
});

export const savedVehicleIdSchema = z.object({
  vehicleId: z.string().uuid("Choose a valid saved vehicle."),
});
export const fitmentOutcomeSchema = z.object({
  snapshotId: z.string().uuid("Choose a valid fitment check."),
  outcome: z.enum(["FIT_CONFIRMED", "FIT_PROBLEM_REPORTED", "UNCONFIRMED"]),
  note: optionalText(1000),
});
