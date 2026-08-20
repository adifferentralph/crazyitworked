# Twenty-Two Parts Architecture

Twenty-Two Parts is a Next.js App Router marketplace. The current completed foundation covers the public landing experience, Supabase authentication entry points, application identities, role boundaries, and the initial PostgreSQL schema. Marketplace domains are added in isolated phases on top of these boundaries.

## Runtime stack

- Next.js 15 App Router and React 19
- TypeScript in strict mode
- Tailwind CSS with shared UI primitives
- Supabase Auth for credentials, email verification, OAuth, recovery, and sessions
- Supabase PostgreSQL with row-level security
- Drizzle ORM and Drizzle Kit for typed server access and migrations
- Zod for server-side form and environment validation
- Vitest and Playwright for unit and browser verification

## Application layers

- `src/app/(auth)`: login, account registration, recovery, reset, and verification pages plus server actions.
- `src/app/(protected)`: authenticated buyer, supplier, and admin route boundaries.
- `src/app/auth/callback`: PKCE code exchange for email and OAuth callbacks.
- `src/components/auth`: shared, accessible auth and protected-account UI.
- `src/components/landing`: public landing sections.
- `src/components/layout`: shared header and footer.
- `src/components/ui`: small reusable design-system primitives.
- `src/config`: validated environment access and public site configuration.
- `src/db`: Drizzle client and PostgreSQL schemas.
- `src/lib/auth`: principal resolution, authorization, and redirect safety.
- `src/lib/supabase`: browser, server, middleware, and generated-style database types.
- `src/lib/validation`: trusted server-side input schemas.
- `drizzle`: versioned SQL migrations and Drizzle metadata.
- `scripts`: explicit migration and idempotent seed entry points.

## Authentication and authorization

Supabase Auth owns passwords and session lifecycle; the application does not store passwords, reset tokens, or custom sessions. An `auth.users` trigger creates one `profiles` row and either a buyer or seller profile. Client metadata may request only `BUYER` or `SELLER`; it can never create an `ADMIN` profile.

Middleware refreshes signed cookies and redirects unauthenticated requests from `/account`, `/seller`, and `/admin`. Server Components then load the RLS-protected profile and enforce the application role. Browser metadata and URL paths are never treated as authority.

## Data security

Every public-schema identity table has RLS enabled. The migration revokes default `anon` and `authenticated` table privileges, then grants only required columns and operations. Users can read only their own identity records. Self-service updates exclude role, account status, seller review status, slugs, timestamps, and email. Audit logs have no client policy or grant.

The browser receives only the Supabase publishable key. `DATABASE_URL` is server-only and used by migration/seed scripts. No service-role key is required by this foundation.

## Initial identity model

The first migration creates profiles, buyer profiles, seller profiles, addresses, admin roles, permissions, admin role-permission assignments, admin profiles, and append-only audit-log storage. Supabase Auth remains the source of truth for authentication identities.
