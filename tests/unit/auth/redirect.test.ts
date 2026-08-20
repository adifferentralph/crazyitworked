import { describe, expect, it } from "vitest";

import { getSafeRedirect } from "@/lib/auth/redirect";

describe("getSafeRedirect", () => {
  it("allows an internal path with query parameters", () => {
    expect(getSafeRedirect("/seller/dashboard?tab=inventory")).toBe(
      "/seller/dashboard?tab=inventory",
    );
  });

  it.each(["https://attacker.test", "//attacker.test", "/\\attacker.test", " seller/dashboard "])(
    "rejects unsafe target %s",
    (target) => {
      expect(getSafeRedirect(target, "/account")).toBe("/account");
    },
  );

  it("uses the fallback for an absent value", () => {
    expect(getSafeRedirect(undefined, "/login")).toBe("/login");
  });
});
