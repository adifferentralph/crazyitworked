import { z } from "zod";

const email = z
  .string({ required_error: "Enter your email address." })
  .trim()
  .toLowerCase()
  .email("Enter a valid email address.")
  .max(254, "Email address is too long.");

const password = z
  .string({ required_error: "Enter your password." })
  .min(8, "Password must contain at least 8 characters.")
  .max(72, "Password must contain no more than 72 characters.");

export const authBotTrapField = "_gotcha" as const;

const honeypot = z.string().max(0, "Unable to submit this form.").optional().default("");

const optionalText = (maximum: number, message: string) =>
  z.preprocess(
    (value) => (value === null || value === undefined ? "" : value),
    z
      .string()
      .trim()
      .max(maximum, message)
      .transform((value) => value || undefined),
  );

const optionalCheckbox = z.preprocess(
  (value) => {
    if (value === true) return "on";
    if (value === false || value === null) return undefined;
    return value;
  },
  z.string().optional(),
);

export const loginSchema = z.object({
  email,
  password: z.string({ required_error: "Enter your password." }).min(1, "Enter your password."),
  [authBotTrapField]: honeypot,
});

function validateSignup(
  values: { confirmPassword: string; password: string; terms?: string },
  context: z.RefinementCtx,
) {
  if (values.terms !== "on") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Accept the Terms and Privacy Policy to continue.",
      path: ["terms"],
    });
  }

  if (values.confirmPassword !== values.password) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Passwords do not match.",
      path: ["confirmPassword"],
    });
  }
}

export const buyerSignupSchema = z
  .object({
    accountType: z
      .enum([
        "INDIVIDUAL",
        "MECHANIC_TECHNICIAN",
        "GARAGE_WORKSHOP",
        "FLEET_OPERATOR",
        "CORPORATE_BUYER",
      ])
      .default("INDIVIDUAL"),
    confirmPassword: z.string({ required_error: "Confirm your password." }),
    email,
    firstName: z
      .string({ required_error: "Enter your first name." })
      .trim()
      .min(1, "Enter your first name.")
      .max(50, "First name is too long."),
    lastName: z
      .string({ required_error: "Enter your last name." })
      .trim()
      .min(1, "Enter your last name.")
      .max(50, "Last name is too long."),
    marketingOptIn: optionalCheckbox,
    organizationName: optionalText(120, "Organisation name is too long."),
    password,
    phone: z.preprocess(
      (value) => (value === null || value === undefined ? "" : value),
      z
        .string()
        .trim()
        .max(30, "Phone number is too long.")
        .refine(
          (value) => !value || /^[+0-9().\s-]{7,30}$/.test(value),
          "Enter a valid phone number.",
        )
        .transform((value) => value || undefined),
    ),
    terms: z.string().optional(),
    [authBotTrapField]: honeypot,
  })
  .superRefine((values, context) => {
    validateSignup(values, context);

    if (
      ["GARAGE_WORKSHOP", "FLEET_OPERATOR", "CORPORATE_BUYER"].includes(values.accountType) &&
      !values.organizationName
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter your business or organisation name.",
        path: ["organizationName"],
      });
    }
  });

export const sellerSignupSchema = z
  .object({
    confirmPassword: z.string({ required_error: "Confirm your password." }),
    email,
    fullName: z
      .string({ required_error: "Enter your full name." })
      .trim()
      .min(2, "Full name must contain at least 2 characters.")
      .max(100, "Full name is too long."),
    password,
    storeName: z
      .string({ required_error: "Enter your store or business name." })
      .trim()
      .min(2, "Store name must contain at least 2 characters.")
      .max(120, "Store name is too long."),
    terms: z.string().optional(),
    [authBotTrapField]: honeypot,
  })
  .superRefine(validateSignup);

export const forgotPasswordSchema = z.object({
  email,
  [authBotTrapField]: honeypot,
});

export const resetPasswordSchema = z
  .object({
    confirmPassword: z.string({ required_error: "Confirm your new password." }),
    password,
    [authBotTrapField]: honeypot,
  })
  .superRefine(({ confirmPassword, password }, context) => {
    if (confirmPassword !== password) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Passwords do not match.",
        path: ["confirmPassword"],
      });
    }
  });

export function getFormValues(formData: FormData) {
  return Object.fromEntries(formData.entries());
}
