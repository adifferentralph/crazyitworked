import { describe, expect, it } from "vitest";

import {
  getOAuthProvider,
  getOAuthSignupIntent,
} from "@/lib/auth/oauth-role";

describe("OAuth role inputs", () => {
  it.each([
    ["google", "google"],
    ["apple", "apple"],
    ["email", null],
    ["../../google", null],
    [undefined, null],
  ])("normalizes provider %s", (value, expected) => {
    expect(getOAuthProvider(value)).toBe(expected);
  });

  it("accepts seller intent and defaults every other value to buyer", () => {
    expect(getOAuthSignupIntent("SELLER")).toBe("SELLER");
    expect(getOAuthSignupIntent("ADMIN")).toBe("BUYER");
    expect(getOAuthSignupIntent("../../seller")).toBe("BUYER");
    expect(getOAuthSignupIntent(undefined)).toBe("BUYER");
  });
});
