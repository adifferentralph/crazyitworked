# Twenty-Two Parts Deployment

This document covers the landing-page milestone only. Authentication deployment instructions will
be added after Supabase project configuration is confirmed.

## Local validation

```bash
npm install
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

## Optional public URL

The application runs locally without environment variables. For deployed sitemap and robots URLs,
set `NEXT_PUBLIC_APP_URL` to the canonical HTTPS origin.

Example:

```bash
NEXT_PUBLIC_APP_URL=https://example.com
```

Do not commit `.env.local` or production credentials.

## Deployment

Use a Node.js host that supports Next.js 15. Run `npm run build` as the production build command
and `npm start` as the start command. The deployment must pass lint, type checking, unit tests,
the production build, and the browser smoke test before promotion.
