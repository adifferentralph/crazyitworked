# TorqueMart Architecture

TorqueMart is a Next.js 15 App Router application backed by Convex, Clerk, Cloudflare R2,
Algolia, and a payment-provider abstraction that currently enables Stripe and reserves the same
contract for Paystack and Flutterwave.

## Application Layers

- `src/app`: App Router pages, API routes, SEO routes, and protected dashboard surfaces.
- `src/components`: Shadcn-style UI primitives, layout, catalog, vehicle fitment, and dashboards.
- `src/lib`: Compatibility engine, validation schemas, search, uploads, payments, RBAC, and HTTP security helpers.
- `convex`: Normalized database schema and functions for users, vendors, products, orders, chat, RFQs, ads, payments, notifications, and admin workflows.

## Backend Domains

- Identity: Clerk identity is synced into `users`; marketplace roles are stored on Convex users.
- Vendors: Vendor applications create `vendors` and `vendorVerification`; admin review writes audit logs.
- Catalog: Products are vendor-owned, moderated, image-backed, SKU/OEM indexed, and connected to vehicle compatibility rows.
- Compatibility: `Year -> Make -> Model -> Variant` is normalized across vehicle tables and product compatibility rows. Search filters are also projected to Algolia facets.
- Commerce: Cart items become single-vendor orders with order items, totals, escrow status, and payment records.
- Chat: Conversations can be product-linked or RFQ-linked, include product snapshots, attachments, read receipts, typing indicators, and negotiation payloads.
- RFQ: Buyers submit RFQs, vendors quote, and accepted quotations convert into escrow-ready orders.
- Ads: Campaigns, vendor ads, budget metadata, placement status, and impression/click/conversion events are tracked internally.
- Administration: Vendor approval, product moderation, user suspension, campaign review, and audit logs are role-gated.

## Security

- Clerk middleware protects buyer, vendor, admin, messages, and checkout routes.
- Convex functions enforce ownership and RBAC through `requireUser`, `requireRole`, and `requireVendorOwner`.
- Mutating API routes validate payloads with Zod and reject cross-origin browser posts.
- Uploads are presigned for Cloudflare R2 with content-type and size constraints.
- Convex rate-limit storage is available through `enforceRateLimit` for mutation-level throttling.
- Audit logs capture sensitive state transitions.

## Search

Algolia is the storefront search plane. Product records should be projected with:

- Product identity: `objectID`, `slug`, `title`, `sku`.
- Vendor fields: `vendorId`, `vendorName`, location.
- Commerce fields: `price`, `currency`, `availability`, rating.
- Compatibility facets: `fitmentYears`, `fitmentMakes`, `fitmentModels`, `fitmentVariants`.
- Advertising fields: `isSponsored`, `sponsoredRank`.

Replicas are expected for `products_price_asc`, `products_price_desc`, `products_rating_desc`, and
`products_newest`.

## Payments

`src/lib/payments/providers.ts` defines the checkout interface. Stripe implements it with Checkout
Sessions. Payment webhooks are verified in Next.js and can forward normalized events to Convex
payment mutations or an HTTP action endpoint in a deployed Convex environment.
