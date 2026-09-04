export const siteConfig = {
  name: "Twenty-Two Parts",
  shortName: "22 Parts",
  url: "https://twentytwoparts.com",
  description:
    "A modern automotive spare parts marketplace connecting drivers, workshops, fleets, and verified suppliers.",
  navigation: [
    { href: "/", label: "Marketplace" },
    { href: "/categories", label: "Categories" },
    { href: "/find-a-part", label: "Find a part" },
  ],
  auth: {
    buyers: "/signup/buyer",
    suppliers: "/signup/seller",
  },
} as const;
