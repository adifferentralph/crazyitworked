# Production Deployment Guide

## 1. Install

```bash
npm install
npm run typecheck
npm run test
```

## 2. Clerk

Create a Clerk application, enable email/password or social providers, then set:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_JWT_ISSUER_DOMAIN=
```

Configure the Clerk JWT template for Convex with application ID `convex`.

## 3. Convex

```bash
npx convex dev
npx convex deploy
```

Set `NEXT_PUBLIC_CONVEX_URL` from the deployed Convex dashboard. Configure Convex environment
variables for Clerk and any webhook endpoints used by payment persistence.

## 4. Cloudflare R2

Create an R2 bucket and API token with object read/write scope:

```bash
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_PUBLIC_BASE_URL=
```

R2 uploads are signed through `/api/uploads/presign`.

## 5. Algolia

Create the products index and replicas:

- `products`
- `products_price_asc`
- `products_price_desc`
- `products_rating_desc`
- `products_newest`

Set searchable attributes for title, SKU, OEM numbers, aftermarket references, vendor, category,
and location. Set facets for category, vendor, location, availability, and fitment fields.

```bash
ALGOLIA_APP_ID=
ALGOLIA_SEARCH_API_KEY=
ALGOLIA_ADMIN_API_KEY=
ALGOLIA_PRODUCTS_INDEX=products
```

## 6. Stripe

Create a Stripe account and set:

```bash
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

Point Stripe webhooks at `/api/payments/stripe/webhook`. Forward verified events to Convex by
setting `CONVEX_PAYMENT_WEBHOOK_URL` or by calling the Convex `payments.recordStripeCheckoutCompleted`
mutation from your webhook worker.

## 7. Vercel

Connect the repository to Vercel, set all environment variables, and deploy:

```bash
npm run build
```

Recommended Vercel settings:

- Framework preset: Next.js
- Node.js runtime: 22 or newer
- Build command: `npm run build`
- Install command: `npm install`

## 8. Operations

- Run Playwright against staging before promoting production.
- Review Convex audit logs for admin actions.
- Rotate R2 and payment credentials quarterly.
- Monitor Algolia indexing lag for product moderation and inventory changes.
