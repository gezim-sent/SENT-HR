# PeopleOS — HR Platform

A full-stack HR platform built with **Next.js 14 (App Router)** and **Supabase**.

## Features

- **Auth** — Magic link sign-in via Supabase Auth
- **Role-based access** — `admin`, `hr_manager`, `employee` with middleware + RLS
- **Employee directory** — Search, filter by department/status, detail view
- **Leave management** — Request flow + manager approval workflow
- **Onboarding** — Task checklists per new hire
- **Performance reviews** — Cycles, self-reviews, manager reviews
- **Document storage** — Secure uploads via Supabase Storage

## Project structure

```
app/
  auth/login/          ← Magic link login page
  auth/callback/       ← OAuth callback route
  dashboard/           ← Protected layout with sidebar
    employees/         ← Directory (admin/HR only)
    leave/             ← Leave requests + approvals
    onboarding/        ← New hire task management
    reviews/           ← Performance reviews
components/
  layout/              ← Sidebar, TopBar
  leave/               ← LeaveRequestForm, LeaveApprovalList
lib/
  supabase/
    client.ts          ← Browser Supabase client
    server.ts          ← Server Supabase client (RSC)
  validations/         ← Zod schemas for all forms
middleware.ts          ← Auth guard + role-based redirects
types/
  database.types.ts    ← Auto-generated Supabase types
supabase/migrations/
  001_initial_schema   ← All tables + triggers + indexes
  002_rls_policies     ← Row Level Security for every table
  003_seed_data        ← Dev seed data
  004_storage          ← Storage buckets + policies
```

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

Go to [supabase.com](https://supabase.com) and create a new project.

### 3. Configure environment

```bash
cp .env.local.example .env.local
# Fill in your SUPABASE_URL, ANON_KEY, and SERVICE_ROLE_KEY
```

### 4. Run migrations

```bash
# Link to your project
npx supabase link --project-ref YOUR_PROJECT_REF

# Push all migrations
npx supabase db push

# OR paste each migration file manually in Supabase SQL editor
```

### 5. Regenerate types (after any schema change)

```bash
npm run db:types
```

### 6. Start the dev server

```bash
npm run dev
```

## Auth flow

1. User enters their work email on `/auth/login`
2. Supabase sends a magic link to their email
3. User clicks the link → redirected to `/auth/callback`
4. Callback exchanges the code for a session and upserts a `profiles` row
5. Middleware on every request refreshes the session and enforces role-based access

## Role permissions matrix

| Action                    | employee | hr_manager | admin |
|---------------------------|----------|------------|-------|
| View employee directory   | ✗        | ✓          | ✓     |
| Add/edit employees        | ✗        | ✗          | ✓     |
| Request own leave         | ✓        | ✓          | ✓     |
| Approve leave requests    | ✗        | ✓          | ✓     |
| Manage onboarding tasks   | ✗        | ✓          | ✓     |
| Manage review cycles      | ✗        | ✓          | ✓     |
| Upload HR documents       | ✗        | ✓          | ✓     |

## Key patterns used

- **No waterfalls** — `Promise.all()` for all parallel data fetches
- **Server Components by default** — data fetching in RSC, `'use client'` only where needed
- **RLS as the security layer** — never trust client; policies enforce access at DB level
- **`React.cache()`** — deduplicate Supabase calls within the same request
- **Zod validation** — all form inputs validated before hitting Supabase

## Next steps

- [ ] Add Supabase Realtime for live leave approval notifications
- [ ] Add avatar upload UI (Supabase Storage)
- [ ] Build the `/dashboard/onboarding` page
- [ ] Build the `/dashboard/reviews` page
- [ ] Add email notifications via Supabase Edge Functions
- [ ] Add payroll overview (read-only, connect external payroll API)
