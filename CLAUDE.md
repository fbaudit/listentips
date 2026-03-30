# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Listen** — a multi-tenant SaaS platform for anonymous whistleblowing/complaint reporting. Companies register, reporters submit complaints anonymously (password-based, no email), and company admins manage reports through a dashboard. AI-powered features validate and enhance reports using Google Gemini.

## Commands

```bash
npm run dev        # Dev server on port 9500
npm run build      # Production build
npm run lint       # ESLint
```

## Tech Stack

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript
- **Database**: Supabase (PostgreSQL) — service role client for server, anon key for client
- **Auth**: NextAuth v5 beta (JWT strategy, credentials provider)
- **AI**: Google Gemini (@google/genai) — report validation, enhancement, chatbot
- **Styling**: Tailwind CSS 4 + shadcn/ui components in `src/components/ui/`
- **i18n**: next-intl — 4 locales (ko default, en, ja, zh), messages in `/messages/*.json`
- **Forms**: React Hook Form + Zod 4
- **Payments**: Stripe + Toss Payments (Korean provider)
- **Rich Text**: Tiptap editor

## Architecture

### Dual Auth System

Two separate NextAuth instances with different session cookies:
- **Company admin**: `/api/auth/company/[...nextauth]` → cookie `authjs.company-session-token`
- **Super admin**: `/api/auth/admin/[...nextauth]` → cookie `authjs.admin-session-token`

Auth config lives in `src/lib/auth/` — `company-auth.ts` and `admin-auth.ts` are separate NextAuth instances sharing `auth-options.ts` for common logic. Route protection is done at the layout level using `companyAuth()` / `adminAuth()` calls (no middleware.ts).

### Route Groups (under `src/app/[locale]/`)

- `(auth)/` — login pages (`/company/login`, `/admin/login`)
- `(dashboard)/` — protected company admin routes (`/company/*`)
- `(superadmin)/` — protected platform admin routes (`/admin/*`)
- `(report)/` — public reporter flow (`/report/[companyCode]/submit`, `/report/[companyCode]/check`)
- `(marketing)/` — public pages (apply, terms, privacy)

### API Routes (`src/app/api/`)

- `/api/admin/*` — super admin endpoints (users, companies, stats, settings, audit-logs)
- `/api/company/*` — company admin endpoints (reports, staff, settings, report-types, report-statuses)
- `/api/ai/*` — AI endpoints (validate-report, enhance-report, chatbot)
- `/api/r/[reportNumber]/*` — reporter-facing endpoints (bearer token auth via reporter JWT)
- `/api/auth/*` — custom login flow with CAPTCHA + rate limiting + optional 2FA

### Data Encryption

Two-layer encryption system in `src/lib/utils/`:
- **Master encryption** (`encryption.ts`): encrypts API keys using `NEXTAUTH_SECRET`
- **Data encryption** (`data-encryption.ts`): AES-256-CBC for report content using per-company keys

### Key Directories

- `src/lib/auth/` — auth instances, guards (`requireAuth`, `requireRole`), permissions, report access
- `src/lib/ai/` — Gemini client, prompts (Korean), file upload handling
- `src/lib/supabase/` — `admin.ts` (service role), `server.ts` (SSR), `client.ts` (browser)
- `src/lib/validators/` — Zod schemas for auth, reports, companies, subscriptions
- `src/lib/utils/` — encryption, email (nodemailer), SMS (Aligo), audit logging, CAPTCHA, deidentification
- `src/types/` — database types, NextAuth type augmentation
- `supabase/migrations/` — 48+ SQL migration files (numbered 00001–00099)

### Multi-Tenancy

All data is scoped by `company_id`. Companies have their own report types, statuses, encryption keys, AI prompts, and security settings (2FA, rate limits, IP blocking, geo-blocking).

### Locale Routing

next-intl with `localePrefix: "as-needed"` — Korean URLs have no prefix, other locales get `/en/`, `/ja/`, `/zh/`. Config in `src/i18n/routing.ts` and `src/i18n/request.ts`.

## Conventions

- Path alias: `@/*` maps to `./src/*`
- UI components use shadcn/ui (config in `components.json`, components in `src/components/ui/`)
- All AI prompts are in Korean (see `src/lib/ai/prompts.ts`)
- Reporter auth uses JWT bearer tokens (not sessions) — see `src/lib/utils/reporter-token.ts`
- Audit logging via `src/lib/utils/audit-log.ts` — records action, entity, old/new values, IP hash
- Security headers configured in `next.config.ts` (CSP, X-Frame-Options)
- Deployed on Vercel with a daily cron job for subscription checks (`vercel.json`)
