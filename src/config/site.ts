export const siteConfig = {
  name: "Twenty-Two Parts",
  shortName: "22 Parts",
  description:
    "A modern automotive spare parts marketplace connecting drivers, workshops, fleets, and verified suppliers.",
  navigation: [
    { href: "/find-a-part", label: "Marketplace" },
    { href: "/#categories", label: "Categories" },
    { href: "/#how-it-works", label: "How it works" },
    { href: "/#why-us", label: "Why us" },
    { href: "/#features", label: "Features" },
    { href: "/#faq", label: "FAQ" },
  ],
  auth: {
    buyers: "/signup/buyer",
    suppliers: "/signup/seller",
  },
} as const;
