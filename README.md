# Personal Dashboard

A consolidated personal life operating system — health, training, finance, habits, time, knowledge, social, goals, and journal, with an embedded AI engine for daily scoring and pattern detection.

Built with **Next.js 14 (App Router) · TypeScript · Tailwind · Supabase · Vercel · OpenRouter**.

Design language: dark mode only, Apple Liquid Glass aesthetic, gold / silver / bronze accents.

## Phase 1 (this commit)

- [x] Next.js 14 + TypeScript + Tailwind scaffold
- [x] Supabase project provisioned and full schema (38 tables) applied with owner-only RLS
- [x] Supabase Auth (email/password) + middleware route protection
- [x] App shell: collapsible sidebar (desktop), bottom tab bar (mobile)
- [x] All 11 nav routes wired with Liquid Glass Coming Soon pages
- [x] NASDAQ-style ticker (mock data, color-coded, scrolling)
- [x] Settings page: profile CRUD, units, accent tone, API key storage
- [x] Auto-create profile + water_profile + default AI prompt on signup

## Getting started

```bash
npm install
cp .env.example .env.local   # or use the .env.local that already has Supabase values
npm run dev
```

Open <http://localhost:3000> and create the first account on the login page.

## Environment

Required for Phase 1:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Used in later phases:

- `OPENROUTER_API_KEY` (+ optional `OPENROUTER_MODEL`)
- `WHOOP_CLIENT_ID`, `WHOOP_CLIENT_SECRET`, `WHOOP_REDIRECT_URI`
- `CRON_SECRET` (Vercel cron authorization)

## Deploy to Vercel

1. Push to a fresh GitHub repo.
2. Import the repo in Vercel.
3. Add the env vars above (copy from `.env.local`).
4. Deploy. Subsequent pushes auto-deploy.

## Project layout

```
src/
  app/
    (app)/              protected app routes (sidebar + ticker)
      layout.tsx        AppShell wrapper
      page.tsx          Home dashboard
      health/.../...    one folder per module
      settings/         profile + API keys
    login/              public login / signup
    auth/signout/       POST route to clear session
  components/
    AppShell, Sidebar, BottomTabs, Ticker, GlassCard, ComingSoon
  lib/
    supabase/{client,server,middleware}.ts
    nav.ts, ticker-mock.ts, utils.ts
middleware.ts           Supabase session refresh + route protection
```

## Database

Schema lives in Supabase migration `initial_schema_phase1_full` (all 38 tables from Section 15 of the spec). Every table has owner-only RLS. On signup, a trigger creates the profile, water profile, and the default daily-scoring AI prompt.
