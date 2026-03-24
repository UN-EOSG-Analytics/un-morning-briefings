# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

**When starting work on a Next.js project, ALWAYS call the `init` tool from
next-devtools-mcp FIRST to set up proper context and establish documentation
requirements. Do this automatically without being asked.**

## Project Overview

UN Morning Briefings - internal web app for the United Nations Political Unit (EOSG) to create, manage, and export daily morning briefing entries. Users submit news entries with metadata (category, region, priority, country), which get reviewed and compiled into daily briefings for UN leadership.

## Commands

```bash
pnpm dev              # Start dev server (port 3000)
pnpm build            # Production build
pnpm lint             # ESLint
```

Package manager is **pnpm** (v10.30.3) - do not use npm or yarn.

No test suite exists in this project.

## Architecture

### Stack
- **Next.js 16** canary (App Router) with **React 19**, **TypeScript**
- **Tailwind CSS v4.1** with `@theme inline` directive in `globals.css` for custom tokens
- **shadcn/ui** components in `src/components/ui/` (Radix primitives + CVA)
- **PostgreSQL** via `pg` (raw SQL, no ORM) - all tables in `pu_morning_briefings` schema
- **NextAuth.js v4** with credentials provider (email/password, `@un.org` domain only, whitelist-gated)
- **Azure Blob Storage** for images (with local filesystem fallback via `BLOB_STORAGE_TYPE`)
- **Azure OpenAI** (GPT-4o) via Vercel AI SDK for auto-fill, summarize, reformulate features
- **Tiptap v3** rich text editor
- **DOCX** generation (`docx` library) for briefing export
- **Nodemailer** for sending briefings via email

### Core Domain Concept: Briefing Date & 8AM Cutoff
Entries are grouped into daily briefings using an 8AM local time cutoff:
- Entry submitted >= 8AM belongs to **next day's** briefing
- Entry submitted < 8AM belongs to **same day's** briefing
- Weekends are skipped (Friday 8AM+ goes to Monday)
- This logic lives in `src/lib/useEntriesFilter.ts` (`getCurrentBriefingDate`, `getBriefingDate`, `isWithinCutoffRange`)

### Database Layer
- `src/lib/db.ts` - Connection pool singleton + `query()` helper that auto-sets `search_path` to `pu_morning_briefings`
- `src/lib/entry-queries.ts` - Shared SQL for entries (SELECT with JOINs to users/images, country serialization)
- `sql/init.sql` - Full schema: `users`, `entries`, `images`, `user_whitelist`, `password_resets` tables
- All entry queries use `pu_morning_briefings.` explicit schema prefix in SQL

### Image Pipeline
Images go through a specific pipeline:
1. Client: base64 data URLs in Tiptap HTML are extracted by `src/lib/storage.ts` (`extractImagesFromHtml`)
2. Client replaces them with `image-ref://img-{position}` references
3. API: receives refs + base64 data, uploads to blob storage, stores blob URLs in `images` table
4. On read: `src/lib/image-conversion.ts` converts `image-ref://` back to data URLs (server-side via blob download or client-side via `/api/images/{id}`)

### Client-Side Data Layer
`src/lib/storage.ts` is the **client-side** API wrapper (not server-side storage):
- `saveEntry()`, `updateEntry()`, `deleteEntry()`, `getAllEntries()`, `getEntryById()`
- `getDraftEntries()`, `getSubmittedEntries()`, `toggleApproval()`
- Handles image extraction before POST/PUT and image reference conversion after GET

### Authentication
- `src/app/api/auth/[...nextauth]/route.ts` - NextAuth config with JWT strategy (24h sessions)
- `src/lib/auth-helper.ts` - `checkAuth()` helper used by all API routes
- `src/proxy.ts` - middleware config (protects all pages except `/login`, `/api`, static files)
- Registration requires `@un.org` email + whitelist approval + email verification
- Auth flows: register, verify-email, forgot-password, reset-password

### Labels & Constants
`src/lib/labels.json` is a centralized i18n-style file with ALL UI strings, error messages, form labels, categories, regions, countries, and priorities. Components and API routes import from this file - don't hardcode UI strings.

### Key Directories
- `src/app/` - Pages and API routes (App Router, no middleware.ts - uses proxy.ts instead)
- `src/components/` - React components (domain components at root, shadcn primitives in `ui/`)
- `src/lib/` - Utilities, DB queries, services, contexts, hooks
- `src/types/` - TypeScript interfaces (`MorningMeetingEntry`, NextAuth augmentations)

### Context Providers (in layout.tsx)
- `AuthProvider` - NextAuth SessionProvider wrapper
- `PopupProvider` + `PopupContainer` - Global toast/notification system
- `UnsavedChangesProvider` - Warns before navigating away from dirty forms

### AI Features (all via Azure OpenAI GPT-4o)
- **Auto-fill** (`/api/auto-fill`) - Pastes article text, AI extracts category/region/country/headline and formats the HTML
- **Summarize** (`/api/summarize`) - Generates 3-5 bullet executive summary
- **Reformulate** (`/api/reformulate`) - Rewrites selected text or full entry for UN diplomatic tone
- AI service in `src/lib/ai-service.ts`

## Code Conventions

- **Tailwind CSS v4.1** - use current v4 syntax (`@theme inline`, `@import "tailwindcss"`)
- **shadcn/ui** in `src/components/ui/` - never edit directly; compose custom components on top
- Add shadcn: `npx shadcn@latest add <component>`
- `@/` path alias maps to `src/`
- PascalCase for component files, kebab-case for directories
- Server Components by default; `"use client"` only for interactive parts
- Font: Roboto (loaded via `next/font/google`)
- Design: left-aligned, minimal, clear hierarchy, UN color palette (`un-blue`), Lucide icons
- All error messages come from `labels.json`, not hardcoded strings
- API routes use `checkAuth()` guard and return `NextResponse.json()`
- DB queries use parameterized SQL (`$1`, `$2`, etc.) - never string interpolation

## Environment Variables

Required in `.env.local`:
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL` - Auth config
- `BLOB_STORAGE_TYPE` - `local` or `azure`
- `AZURE_STORAGE_ACCOUNT`, `AZURE_STORAGE_KEY`, `AZURE_STORAGE_CONTAINER` - Blob storage (when azure)
- `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_ENDPOINT` - AI features
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` - Email sending
