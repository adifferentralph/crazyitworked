import { describe, expect, it } from "vitest";

import { siteConfig } from "@/config/site";
import { categories } from "@/lib/marketplace/taxonomy";

describe("public landing content", () => {
  it("uses the approved Twenty-Two Parts brand", () => {
    expect(siteConfig.name).toBe("Twenty-Two Parts");
    expect(siteConfig.description).toMatch(/automotive spare parts marketplace/i);
  });

  it("keeps category slugs unique and descriptions useful", () => {
    const slugs = categories.map((category) => category.slug);

    expect(new Set(slugs).size).toBe(categories.length);
    expect(categories.every((category) => category.description.length >= 20)).toBe(true);
  });

  it("keeps primary navigation on the one-page landing experience", () => {
    expect(siteConfig.navigation.every((item) => item.href.startsWith("#"))).toBe(true);
  });

  it("separates buyer and supplier authentication entry points", () => {
    expect(siteConfig.auth.buyers).toBe("/signup/buyer");
    expect(siteConfig.auth.suppliers).toBe("/signup/seller");
  });
});
