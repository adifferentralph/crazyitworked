import { describe, expect, it } from "vitest";

import {
  buyerSignupSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  sellerSignupSchema,
} from "@/lib/validation/auth";

describe("auth validation", () => {
  it("normalizes email before authentication", () => {
    const result = loginSchema.parse({
      email: "  DRIVER@Example.COM ",
      password: "correct horse battery staple",
      _gotcha: "",
    });

    expect(result.email).toBe("driver@example.com");
  });

  it("requires buyer terms and matching passwords", () => {
    const result = buyerSignupSchema.safeParse({
      confirmPassword: "different-password",
      email: "buyer@example.com",
      fullName: "Ada Driver",
      password: "strong-password",
      _gotcha: "",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.confirmPassword).toContain(
        "Passwords do not match.",
      );
      expect(result.error.flatten().fieldErrors.terms).toBeDefined();
    }
  });

  it("requires a supplier business name", () => {
    const result = sellerSignupSchema.safeParse({
      confirmPassword: "strong-password",
      email: "seller@example.com",
      fullName: "Tomi Seller",
      password: "strong-password",
      storeName: " ",
      terms: "on",
      _gotcha: "",
    });

    expect(result.success).toBe(false);
  });

  it("returns the same valid recovery shape for normalized email", () => {
    expect(forgotPasswordSchema.parse({ email: " OWNER@example.com ", _gotcha: "" }).email).toBe(
      "owner@example.com",
    );
  });

  it("rejects reset password mismatch", () => {
    const result = resetPasswordSchema.safeParse({
      confirmPassword: "another-password",
      password: "strong-password",
      _gotcha: "",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.confirmPassword).toContain(
        "Passwords do not match.",
      );
    }
  });
  it("rejects a populated bot trap without treating a normal website autofill name as a field", () => {
    const result = buyerSignupSchema.safeParse({
      _gotcha: "filled-by-a-bot",
      confirmPassword: "strong-password",
      email: "buyer@example.com",
      fullName: "Ada Driver",
      password: "strong-password",
      terms: "on",
      website: "https://example.com",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors._gotcha).toBeDefined();
      expect("website" in result.error.flatten().fieldErrors).toBe(false);
    }
  });
});
