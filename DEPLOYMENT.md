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

## 2. Supabase Project

1. Create a Supabase project.
2. Go to Project Settings > API.
3. Copy the Project URL and anon public key.
4. Add them to `.env.local`:

```text
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 3. Google Authentication

In Supabase:

1. Go to Authentication > Providers.
2. Enable Google.
3. Add the Google OAuth Client ID and Client Secret.
4. In Authentication > URL Configuration, add:

```text
http://localhost:3000/internal
https://YOUR_NETLIFY_DOMAIN.netlify.app/internal
```

In Google Cloud Console:

1. Create or select a Google OAuth app.
2. Add the authorized redirect URI shown in Supabase's Google provider screen.
3. Restrict the OAuth app to the GOODSTUPH organization where available.

The app sends this Google hosted-domain hint:

```text
hd=goodstuph.org
```

After login, the app verifies the signed-in email ends with:

```text
@goodstuph.org
```

Non-GOODSTUPH accounts are signed out immediately.

## 4. Role Configuration

Set comma-separated email lists:

```text
NEXT_PUBLIC_ADMIN_EMAILS=admin1@goodstuph.org,admin2@goodstuph.org
NEXT_PUBLIC_REVIEWER_EMAILS=reviewer1@goodstuph.org
```

Users not listed here are regular internal users.

For production-grade authorization, move roles into a Supabase `profiles` table and enforce access with Row Level Security policies.

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
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_ADMIN_EMAILS
NEXT_PUBLIC_REVIEWER_EMAILS
```

Deploy again after setting the variables.

## 8. Current Backend Status

The frontend is Supabase-authenticated, but workflow records still use browser `localStorage`.

Recommended next backend build:

1. Vendors table
2. Estimates table
3. Estimate line items table
4. Payment requests table
5. KTP file storage bucket
6. Profiles/roles table
7. Row Level Security policies
8. Email delivery for approved payment requests
