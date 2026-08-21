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

export const loginSchema = z.object({
  email,
  password: z.string({ required_error: "Enter your password." }).min(1, "Enter your password."),
  [authBotTrapField]: honeypot,
});

const signupBase = z
  .object({
    confirmPassword: z.string({ required_error: "Confirm your password." }),
    email,
    fullName: z
      .string({ required_error: "Enter your full name." })
      .trim()
      .min(2, "Full name must contain at least 2 characters.")
      .max(100, "Full name is too long."),
    password,
    terms: z.string().optional(),
    [authBotTrapField]: honeypot,
  })
  .superRefine(({ confirmPassword, password, terms }, context) => {
    if (terms !== "on") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Accept the Terms and Privacy Policy to continue.",
        path: ["terms"],
      });
    }

    if (confirmPassword !== password) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Passwords do not match.",
        path: ["confirmPassword"],
      });
    }
  });

export const buyerSignupSchema = signupBase;

export const sellerSignupSchema = signupBase.and(
  z.object({
    storeName: z
      .string({ required_error: "Enter your store or business name." })
      .trim()
      .min(2, "Store name must contain at least 2 characters.")
      .max(120, "Store name is too long."),
  }),
);

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
