import { afterEach, describe, expect, it, vi } from "vitest";

import { getAuthCookieOptions } from "@/config/env";
import {
  isMarketplaceHostname,
  isVendorHostname,
  sellerPathToVendorPath,
  vendorPathToInternal,
} from "@/lib/routing/vendor";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("vendor hostname routing", () => {
  it("maps vendor URLs onto the existing private seller routes", () => {
    expect(vendorPathToInternal("/")).toBe("/seller/dashboard");
    expect(vendorPathToInternal("/products/new")).toBe("/seller/products/new");
    expect(vendorPathToInternal("/requests/example")).toBe("/seller/requests/example");
    expect(vendorPathToInternal("/store")).toBe("/seller/onboarding");
    expect(vendorPathToInternal("/settings")).toBe("/seller/onboarding");
    expect(vendorPathToInternal("/admin")).toBeNull();
  });

  it("creates canonical vendor paths without exposing internal seller prefixes", () => {
    expect(sellerPathToVendorPath("/seller/dashboard")).toBe("/dashboard");
    expect(sellerPathToVendorPath("/seller/products/example")).toBe("/products/example");
    expect(sellerPathToVendorPath("/seller/onboarding")).toBe("/settings");
  });

  it("matches only the configured marketplace and vendor hostnames", () => {
    expect(isMarketplaceHostname("twentytwoparts.com", "https://twentytwoparts.com")).toBe(true);
    expect(
      isVendorHostname("vendors.twentytwoparts.com", "https://vendors.twentytwoparts.com"),
    ).toBe(true);
    expect(isVendorHostname("preview.vercel.app", "https://vendors.twentytwoparts.com")).toBe(
      false,
    );
  });

  it("shares secure cookies only on canonical production hosts", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://twentytwoparts.com");
    vi.stubEnv("NEXT_PUBLIC_VENDOR_APP_URL", "https://vendors.twentytwoparts.com");

    expect(getAuthCookieOptions("twentytwoparts.com")).toMatchObject({
      domain: "twentytwoparts.com",
      path: "/",
      sameSite: "lax",
      secure: true,
    });
    expect(getAuthCookieOptions("vendors.twentytwoparts.com")).toMatchObject({
      domain: "twentytwoparts.com",
      secure: true,
    });
    expect(getAuthCookieOptions("preview.vercel.app")).toEqual({
      path: "/",
      sameSite: "lax",
      secure: false,
    });
  });
});
