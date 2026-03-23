# UN Morning Briefings

An internal content management system for creating, reviewing, and exporting daily briefing entries. Built with Next.js 16, React 19, TypeScript, and Tailwind CSS.

## Features

- **Entry Management** - Create, edit, and organize briefing entries with rich metadata
- **Rich Text Editor** - Tiptap-based editor with formatting, links, and image support
- **Review Workflow** - Draft, submit, and review entries before export
- **Search & Filter** - Filter entries by region, category, priority, date, and full-text search
- **Export** - Generate Word documents from daily briefings
- **AI Assistance** - Auto-fill entry fields, generate summaries, and reformulate text
- **Responsive Design** - Mobile-first interface with adaptive editor modes
- **Image Management** - Upload and embed images within entries
- **Analytics Dashboard** - Visual overview of entry data

## Tech Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS v4.1, shadcn/ui components
- **Database**: PostgreSQL
- **Authentication**: NextAuth.js (credentials provider)
- **Rich Text**: Tiptap v3 editor
- **AI**: Vercel AI SDK with Azure OpenAI
- **Export**: DOCX generation
- **Storage**: Azure Blob Storage (with local fallback for development)

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- PostgreSQL database

### Setup

1. Clone the repository
2. Install dependencies:

```bash
pnpm install
```

3. Copy `.env.example` to `.env.local` and configure your environment variables
4. Initialize the database:

```bash
psql -f sql/init.sql
```

5. Start the development server:

```bash
pnpm dev
```

## Scripts

```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint
pnpm format       # Format code with Prettier
```

## Project Structure

```
src/
├── app/           # Pages and API routes (App Router)
├── components/    # React components (domain + shadcn/ui primitives)
├── lib/           # Utilities, services, database queries, hooks
└── types/         # TypeScript interfaces
```

## Development

- Use `@/` path alias for imports
- shadcn/ui components live in `components/ui/` - compose on top, don't edit directly
- Add new shadcn components: `npx shadcn@latest add <component>`
- Server Components by default; use `"use client"` only for interactive parts
- Tailwind CSS v4.1 syntax

## Contributing

1. Create a feature branch
2. Commit changes
3. Open a pull request

## License

Proprietary - United Nations
