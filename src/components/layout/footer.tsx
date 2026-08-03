import Link from "next/link";

const columns = [
  {
    title: "Marketplace",
    links: [
      { href: "/marketplace", label: "Browse parts" },
      { href: "/wholesale", label: "Wholesale RFQ" },
      { href: "/buyer", label: "Buyer dashboard" },
    ],
  },
  {
    title: "Vendors",
    links: [
      { href: "/vendor", label: "Vendor dashboard" },
      { href: "/vendor/products", label: "Inventory" },
      { href: "/vendor/ads", label: "Sponsored ads" },
    ],
  },
  {
    title: "Operations",
    links: [
      { href: "/admin", label: "Admin panel" },
      { href: "/admin/moderation", label: "Moderation" },
      { href: "/admin/revenue", label: "Revenue" },
    ],
  },
] as const;

export function Footer() {
  return (
    <footer className="border-t bg-white">
      <div className="container-page grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <p className="font-semibold">TorqueMart</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Retail and wholesale automotive sourcing with compatibility-first search, RFQs, chat,
            subscriptions, and sponsored placements.
          </p>
        </div>
        {columns.map((column) => (
          <div key={column.title} className="space-y-3">
            <p className="text-sm font-semibold">{column.title}</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="transition hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </footer>
  );
}
