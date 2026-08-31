# Twenty-Two Parts project rules

- Twenty-Two Parts is an automotive marketplace. The public marketplace is the buyer experience; `/account` is management, not a buyer dashboard.
- Browsing is public. Require identity only for persistent/personal/private actions such as checkout, orders, saved data, RFQs, seller work, and admin work.
- Use one universal `/login`; keep `/signup/buyer` and `/signup/seller`. Authoritative server-side role determines destination and access.
- Keep seller private operations separate from public seller stores. CAC/business registration is optional during initial seller onboarding.
- NGN minor units are canonical. Display currency never rewrites canonical prices or seller entitlement.
- Buyer checkout shows Product Price, Delivery, and Total. Delivery internally separates actual cost from the platform service component.
- No emojis. Use the existing icon libraries. Animate hover only on buttons. Keep commerce text and money highly readable.
- Seller products require vehicle fitment and at least five genuine images before submission. Preserve seller originals and media history.
- Sponsored placement must be labelled. Paid verification processing never guarantees a verification badge.
- Do not build subscriptions or a logistics marketplace in V1.
- Never weaken RLS, server authorization, financial invariants, or audit history to simplify UI work.
- Never add fake data, dead buttons, duplicate components, duplicate auth paths, or parallel business logic.
- Prefer the smallest change that preserves working behavior. Use Drizzle migrations for schema changes and verify live RLS after security-sensitive work.