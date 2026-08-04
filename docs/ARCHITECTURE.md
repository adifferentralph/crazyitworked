# Twenty-Two Parts Architecture

Twenty-Two Parts is a focused Next.js App Router application. The current production scope is the
public landing page. Supabase authentication will be added as the next isolated milestone after
environment setup is confirmed.

## Active Layers

- `src/app`: root layout, landing route, metadata routes, global styling, and generated social image.
- `src/components/landing`: focused sections composed by the homepage.
- `src/components/layout`: shared public header and footer.
- `src/components/ui`: small reusable design-system primitives.
- `src/components/brand`: the shared brand mark.
- `src/config`: centralized site name, description, and navigation.
- `src/lib/marketplace/taxonomy.ts`: landing-page category content.
- `tests/unit` and `tests/e2e`: configuration/content tests and browser-level landing checks.

## Architectural Boundaries

The current application does not include marketplace catalog APIs, dashboards, chat, payments,
uploads, RFQs, auctions, or vendor administration. Those domains must return as separately reviewed
milestones rather than dormant production code.

Authentication will use Supabase Auth. No custom password storage or authentication service will be
introduced.

## Security

The application sends a restrictive baseline Content Security Policy, frame protection, MIME
sniffing protection, a strict referrer policy, and a locked-down permissions policy. Authentication
security and session refresh rules will be documented when the Supabase milestone begins.
