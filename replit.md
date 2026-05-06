# Offercome — Job Application Tracker

## Overview

**Offercome** is a job search tracking web application. Slogan: "Offer favours people with prepared mind." Users can track daily application counts, rejections, detailed application entries, interview scheduling, and view analytics.

Key features:
- Dashboard with custom calendar (sticky-note styled cells, DM Sans font)
- Daily stats: Total Applied and Rejected are manual inputs per day
- Ghosted = Total Applied - Rejected - Interview (auto-calculated)
- Application entries with status: applied, interview, rejected, ghosted, offer
- Status-change emoji animations (confetti for offer)
- Reporting section with date filter and print export
- Sankey funnel visualization
- Anonymous usage (no login required to save data), optional Sign In via Replit Auth

## User Preferences

- Communication: Simple, everyday language (Chinese/English mix)
- App name: "Offercome" (capital O)
- Font: Playfair Display (headings) + Inter (body) + DM Sans (calendar numbers)
- Color palette: #827db8 (purple), #9ca3af (gray), #fca5a5 (red), #c4b5fd (light purple), #4ade80 (green)

## System Architecture

### Frontend

- **Framework**: React 18 + TypeScript, Vite
- **Routing**: `wouter` — single page: `/` → Dashboard
- **Data Fetching**: TanStack React Query v5
- **UI**: shadcn/ui + Tailwind CSS v4
- **Auth**: `useAuth` hook from `client/src/hooks/use-auth.ts`
- **Anonymous ID**: Generated in `client/src/lib/queryClient.ts`, stored in localStorage as `offercome_anon_id`, sent via `X-Anon-Id` header

### Backend

- **Runtime**: Node.js + Express + TypeScript (tsx)
- **Auth**: Replit Auth (OpenID Connect) via `server/replit_integrations/auth/`
- **User ID**: Authenticated user's `sub` claim, or `anon_{X-Anon-Id}` for anonymous users
- **API routes** (`server/routes.ts`):
  - `GET/POST /api/applications` — list/create
  - `GET /api/applications/date/:date` — by date
  - `PATCH/DELETE /api/applications/:id` — update/delete
  - `GET /api/applications/stats` — overview stats
  - `GET /api/applications/calendar` — calendar data
  - `GET /api/applications/report?start=&end=` — filtered report
  - `GET/PUT /api/daily-stats/:date` — daily totals
  - Auth routes: `/api/login`, `/api/logout`, `/api/callback`, `/api/auth/user`

### Database

- **PostgreSQL** (Neon serverless) via Drizzle ORM
- **Schema** (`shared/schema.ts`):
  - `applications`: id, userId, company, position, status, appliedDate, interviewDate, interviewTime, notes
  - `dailyStats`: id, userId, date, totalApplied, totalRejected
  - `users`: id, email, firstName, lastName, profileImageUrl (from auth)
  - `sessions`: sid, sess, expire (for auth sessions)
- **Migrations**: `npm run db:push`

### Build

- Dev: `npm run dev` (Vite HMR + tsx)
- Prod: `npm run build` → `dist/public/` + `dist/index.cjs`

## Key Files

- `client/src/pages/dashboard.tsx` — main UI
- `client/src/hooks/use-auth.ts` — auth hook
- `client/src/lib/queryClient.ts` — API client with anon ID
- `shared/schema.ts` — DB schema + auth re-export
- `shared/models/auth.ts` — auth tables
- `server/routes.ts` — API routes
- `server/storage.ts` — DB operations
- `server/replit_integrations/auth/` — Replit Auth module
- `client/src/index.css` — animations (checkPop, pumpUp, cryFade, ghostFloat, mjMoonwalk, etc.)
