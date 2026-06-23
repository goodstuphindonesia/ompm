# O$P$ Deployment Guide

## 1. Local Setup

```sh
npm install
cp .env.example .env.local
npm run dev
```

Public registration:

```text
http://localhost:3000
```

Internal app:

```text
http://localhost:3000/internal
```

## 2. Neon Database

1. Create a Neon project at `https://console.neon.tech`.
2. Open the project dashboard and use `Connect` to copy the pooled or standard Postgres connection string.
3. Add it to `.env.local`:

```text
DATABASE_URL="postgresql://USER:PASSWORD@HOST.neon.tech/DBNAME?sslmode=require&channel_binding=require"
```

4. Run the SQL in `database/schema.sql` in the Neon SQL Editor to create the starter tables.

Neon is Postgres database hosting only. KTP uploads should use a separate object storage provider later, with the file URL and metadata stored in Neon.

## 3. Google Authentication

1. In Google Cloud Console, create or select an OAuth app.
2. Add these authorized redirect URIs:

```text
http://localhost:3000/api/auth/callback/google
https://YOUR_NETLIFY_DOMAIN.netlify.app/api/auth/callback/google
```

3. Create an Auth.js secret:

```text
openssl rand -base64 32
```

4. Add these values to `.env.local` and Netlify:

```text
AUTH_GOOGLE_ID=your-google-oauth-client-id
AUTH_GOOGLE_SECRET=your-google-oauth-client-secret
AUTH_SECRET=your-generated-secret
AUTH_TRUST_HOST=true
```

The app sends Google a `goodstuph.org` hosted-domain hint and the Auth.js server verifies that the profile is email-verified and ends with `@goodstuph.org` before allowing access.

## 4. Role Configuration

Set comma-separated email lists:

```text
NEXT_PUBLIC_ADMIN_EMAILS=admin1@goodstuph.org,admin2@goodstuph.org
NEXT_PUBLIC_REVIEWER_EMAILS=reviewer1@goodstuph.org
```

Users not listed here are regular internal users.

For production-grade authorization, move roles into the Neon `profiles` table and enforce access in server routes/actions.

## 5. Git Setup

```sh
git init
git add .
git commit -m "Build OSP finance platform"
git branch -M main
git remote add origin YOUR_GIT_REMOTE_URL
git push -u origin main
```

## 6. Netlify Deployment

1. Push the repo to GitHub, GitLab, or Bitbucket.
2. In Netlify, choose Add new site > Import an existing project.
3. Select the repository.
4. Use:

```text
Build command: npm run build
Publish directory: .next
```

The project includes `netlify.toml`. Netlify supports modern Next.js apps through its OpenNext adapter without pinning `@netlify/plugin-nextjs`.

## 7. Netlify Environment Variables

Add these in Netlify Site configuration > Environment variables:

```text
DATABASE_URL
AUTH_GOOGLE_ID
AUTH_GOOGLE_SECRET
AUTH_SECRET
AUTH_TRUST_HOST
NEXT_PUBLIC_ADMIN_EMAILS
NEXT_PUBLIC_REVIEWER_EMAILS
```

Deploy again after setting the variables.

## 8. Current Backend Status

The frontend uses Auth.js Google authentication, Neon is the selected database provider, and workflow records still use browser `localStorage`.

Recommended next backend build:

1. Install the Neon serverless driver.
2. Add server routes/actions for vendors, estimates, and payment requests.
3. Move browser `localStorage` records into Neon.
4. Add a separate KTP file storage provider.
5. Move roles into the Neon `profiles` table.
6. Add email delivery for approved payment requests.
