import { describe, expect, it } from "vitest";

import { getMarketplaceNavigationKey } from "@/lib/marketplace/navigation";

describe("mobile marketplace navigation", () => {
  it.each([
    ["/", "home"],
    ["/marketplace", "home"],
    ["/find-a-part", "home"],
    ["/parts/brake-pad", "home"],
    ["/categories", "categories"],
    ["/categories/brakes", "categories"],
    ["/request-a-part", "requests"],
    ["/account/requests", "requests"],
    ["/account/requests/request-id", "requests"],
    ["/cart", "cart"],
    ["/account", "account"],
    ["/account/orders", "account"],
  ] as const)("maps %s to %s", (pathname, expected) => {
    expect(getMarketplaceNavigationKey(pathname)).toBe(expected);
  });
});
