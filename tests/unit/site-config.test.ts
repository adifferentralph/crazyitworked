import { describe, expect, it } from "vitest";

import { siteConfig } from "@/config/site";
import { categories } from "@/lib/marketplace/taxonomy";

describe("public marketplace content", () => {
  it("uses the approved Twenty-Two Parts brand", () => {
    expect(siteConfig.name).toBe("Twenty-Two Parts");
    expect(siteConfig.description).toMatch(/automotive spare parts marketplace/i);
  });

  it("keeps category slugs unique and descriptions useful", () => {
    const slugs = categories.map((category) => category.slug);

    expect(new Set(slugs).size).toBe(categories.length);
    expect(categories.every((category) => category.description.length >= 20)).toBe(true);
  });

  it("links to the public marketplace discovery routes", () => {
    expect(siteConfig.navigation).toEqual([
      { href: "/", label: "Marketplace" },
      { href: "/categories", label: "Categories" },
      { href: "/find-a-part", label: "Find a part" },
    ]);
  });

  it("separates buyer and supplier authentication entry points", () => {
    expect(siteConfig.auth.buyers).toBe("/signup/buyer");
    expect(siteConfig.auth.suppliers).toBe("/signup/seller");
  });
});
