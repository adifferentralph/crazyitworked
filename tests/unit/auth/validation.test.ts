import { describe, expect, it } from "vitest";

import {
  buyerSignupSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  sellerSignupSchema,
} from "@/lib/validation/auth";

const validBuyer = {
  accountType: "INDIVIDUAL",
  confirmPassword: "strong-password",
  email: "buyer@example.com",
  firstName: "Ada",
  lastName: "Driver",
  organizationName: "",
  password: "strong-password",
  phone: "+234 800 000 0000",
  terms: "on",
  _gotcha: "",
};

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
      ...validBuyer,
      confirmPassword: "different-password",
      terms: undefined,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.confirmPassword).toContain(
        "Passwords do not match.",
      );
      expect(result.error.flatten().fieldErrors.terms).toBeDefined();
    }
  });

  it("accepts buyer names, optional phone, and marketing consent", () => {
    const result = buyerSignupSchema.parse({
      ...validBuyer,
      email: "  ADA@EXAMPLE.COM ",
      marketingOptIn: "on",
    });

    expect(result.firstName).toBe("Ada");
    expect(result.lastName).toBe("Driver");
    expect(result.email).toBe("ada@example.com");
    expect(result.marketingOptIn).toBe("on");
  });

  it("creates an individual buyer when every optional field is blank or omitted", () => {
    const result = buyerSignupSchema.safeParse({
      ...validBuyer,
      marketingOptIn: null,
      organizationName: null,
      phone: null,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.marketingOptIn).toBeUndefined();
      expect(result.data.organizationName).toBeUndefined();
      expect(result.data.phone).toBeUndefined();
    }
  });
  it("supports professional buyer types and requires organisation details where appropriate", () => {
    const missingOrganisation = buyerSignupSchema.safeParse({
      ...validBuyer,
      accountType: "FLEET_OPERATOR",
      organizationName: "",
    });
    expect(missingOrganisation.success).toBe(false);

    const independentMechanic = buyerSignupSchema.safeParse({
      ...validBuyer,
      accountType: "MECHANIC_TECHNICIAN",
      organizationName: "",
    });
    expect(independentMechanic.success).toBe(true);
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
      ...validBuyer,
      _gotcha: "filled-by-a-bot",
      website: "https://example.com",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors._gotcha).toBeDefined();
      expect("website" in result.error.flatten().fieldErrors).toBe(false);
    }
  });
});
