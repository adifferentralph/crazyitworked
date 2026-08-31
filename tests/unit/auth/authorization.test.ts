import { describe, expect, it } from "vitest";

import {
  canAccessRole,
  getHomeForRole,
  getPostAuthDestination,
} from "@/lib/auth/authorization";

describe("role authorization", () => {
  it("does not allow a seller into an admin-only boundary", () => {
    expect(canAccessRole("SELLER", ["ADMIN"])).toBe(false);
  });

  it("does not allow a buyer into a seller-only boundary", () => {
    expect(canAccessRole("BUYER", ["SELLER"])).toBe(false);
  });

  it("allows the explicitly assigned role", () => {
    expect(canAccessRole("ADMIN", ["ADMIN"])).toBe(true);
  });

  it.each([
    ["BUYER", "/marketplace"],
    ["SELLER", "/seller/dashboard"],
    ["ADMIN", "/admin"],
  ] as const)("maps %s to its protected home", (role, expected) => {
    expect(getHomeForRole(role)).toBe(expected);
  });

  it("preserves a buyer destination that does not cross a role boundary", () => {
    expect(
      getPostAuthDestination("BUYER", "/account/requests/new?source=search"),
    ).toBe("/account/requests/new?source=search");
  });

  it.each([
    ["BUYER", "/seller/dashboard", "/marketplace"],
    ["BUYER", "/admin", "/marketplace"],
    ["SELLER", "/account", "/seller/dashboard"],
    ["ADMIN", "/seller/dashboard", "/admin"],
  ] as const)(
    "routes %s away from incompatible destination %s",
    (role, requested, expected) => {
      expect(getPostAuthDestination(role, requested)).toBe(expected);
    },
  );

  it.each(["BUYER", "SELLER", "ADMIN"] as const)(
    "allows %s to complete a password recovery callback",
    (role) => {
      expect(getPostAuthDestination(role, "/reset-password")).toBe(
        "/reset-password",
      );
    },
  );
});
