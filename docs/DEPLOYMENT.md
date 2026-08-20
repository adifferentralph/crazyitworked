# Twenty-Two Parts Deployment

## Required environment variables

Copy `.env.example` to `.env.local` for local development. Never commit `.env.local` or paste credentials into source files.

| Variable                               | Exposure    | Purpose                                                                                  |
| -------------------------------------- | ----------- | ---------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_APP_URL`                  | Public      | Canonical application origin used for metadata and auth callbacks.                       |
| `NEXT_PUBLIC_SUPABASE_URL`             | Public      | Supabase project URL.                                                                    |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public      | Supabase browser-safe publishable key.                                                   |
| `DATABASE_URL`                         | Server only | PostgreSQL transaction-pooler URL for migrations, seeds, and trusted server data access. |

Do not add a Supabase service-role key to any `NEXT_PUBLIC_` variable. This foundation does not require one.

## Database setup

After the environment has been configured and reviewed:

```bash
npm run db:migrate
npm run db:seed
```

The migration creates the identity tables, indexes, RLS policies, grants, and auth synchronization triggers. The seed is idempotent and creates the approved admin roles and permission matrix. It does not create an admin user or assign elevated access.

## Supabase auth URLs

Configure the Supabase Site URL as the production application origin. Add local and deployed callback URLs ending in `/auth/callback` to the redirect allow list. Email verification, recovery, and Google OAuth return through that single PKCE exchange route.

## Validation

```bash
npm install
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Promote only a build that passes static analysis, unit tests, the production build, database migration review, and browser smoke tests.

## Hosting

Use a Node.js host compatible with Next.js 15. Run `npm run build` during deployment and `npm start` for the production process. Set all public values and the server-only database URL in the host's environment settings; do not upload `.env.local`.
