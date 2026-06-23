# O$P$

Mobile-first finance processing platform for GOODSTUPH Indonesia.

## Stack

- Next.js
- Tailwind CSS
- Neon Postgres database target
- Auth.js Google authentication
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
AUTH_GOOGLE_ID
AUTH_GOOGLE_SECRET
AUTH_SECRET
AUTH_TRUST_HOST
NEXT_PUBLIC_ADMIN_EMAILS
NEXT_PUBLIC_REVIEWER_EMAILS
```

`DATABASE_URL` is the Neon Postgres connection string. Keep it server-side only.
Admin/reviewer values should be comma-separated GOODSTUPH email addresses.

## Auth

Internal access uses Auth.js Google OAuth. The app requests a GOODSTUPH Google account and the server verifies the Google profile is email-verified and ends with `@goodstuph.org` before creating a session.

## Database

The Neon starter schema is in [database/schema.sql](./database/schema.sql). It covers vendors, clients, estimates, estimate line items, payment requests, and internal user profiles.

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md).

## Notes

- Workflow records still use `localStorage`.
- KTP files are still metadata-only in the prototype.
- Xero export is still mocked.
- Production authorization should be enforced in server routes/actions before writing to Neon.
