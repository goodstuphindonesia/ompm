# O$P$

Mobile-first finance processing platform for GOODSTUPH Indonesia.

## Stack

- Next.js
- Tailwind CSS
- Neon Postgres database target
- Supabase Google authentication, temporary
- Netlify deployment target

## Current Prototype Scope

- Public vendor registration
- Public vendor registration confirmation before submission
- Internal Google login at `/internal`
- Protected internal vendor list
- Cost estimate generator
- Vendor payment requests
- Admin-only payment request approval/rejection
- Local browser storage as the temporary database

## Local Development

```sh
npm install
cp .env.example .env.local
npm run dev
```

Public vendor registration:

```text
http://localhost:3000
```

Internal login and finance tools:

```text
http://localhost:3000/internal
```

## Environment Variables

```text
DATABASE_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_ADMIN_EMAILS
NEXT_PUBLIC_REVIEWER_EMAILS
```

`DATABASE_URL` is the Neon Postgres connection string. Keep it server-side only.
Admin/reviewer values should be comma-separated GOODSTUPH email addresses.

## Auth

Internal access currently uses Supabase Google OAuth. The app requests Google login with the hosted-domain hint `goodstuph.org`, then verifies the returned email ends with `@goodstuph.org`. Non-GOODSTUPH accounts are signed out.

Neon is the selected database provider. The next auth build can replace Supabase with Auth.js/Google OAuth and store profiles/roles in Neon.

## Database

The Neon starter schema is in [database/schema.sql](./database/schema.sql). It covers vendors, clients, estimates, estimate line items, payment requests, and internal user profiles.

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md).

## Notes

- Workflow records still use `localStorage`.
- KTP files are still metadata-only in the prototype.
- Xero export is still mocked.
- Production authorization should be enforced in server routes/actions before writing to Neon.
