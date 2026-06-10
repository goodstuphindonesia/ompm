# O$P$

Mobile-first finance processing platform for GOODSTUPH Indonesia.

## Stack

- Next.js
- Tailwind CSS
- Supabase Google authentication
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
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_ADMIN_EMAILS
NEXT_PUBLIC_REVIEWER_EMAILS
```

Admin/reviewer values should be comma-separated GOODSTUPH email addresses.

## Auth

Internal access uses Supabase Google OAuth. The app requests Google login with the hosted-domain hint `goodstuph.org`, then verifies the returned email ends with `@goodstuph.org`. Non-GOODSTUPH accounts are signed out.

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md).

## Notes

- Workflow records still use `localStorage`.
- KTP files are still metadata-only in the prototype.
- Xero export is still mocked.
- Production authorization should also be enforced with Supabase Row Level Security once database tables are added.
