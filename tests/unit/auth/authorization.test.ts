import { describe, expect, it } from "vitest";

import { canAccessRole, getHomeForRole } from "@/lib/auth/authorization";

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
});
