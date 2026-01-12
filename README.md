# UN Morning Briefings

A web application for the United Nations Political Unit (EOSG) to manage and create daily morning briefing entries. Built with Next.js 16, React 19, TypeScript, and Tailwind CSS.

## Features

- **Entry Management**: Create, edit, view, and delete morning briefing entries
- **Rich Text Editor**: Tiptap-based editor with formatting, links, images, and more
- **Mobile-First Design**: Fully responsive interface optimized for mobile and desktop
- **Smart Editor Mode**: Auto-detects device and defaults to plain text on mobile, rich text on desktop
- **Draft Functionality**: Save drafts and continue editing later
- **Filter & Search**: Advanced filtering by region, category, priority, and text search
- **Approval Workflow**: Mark entries as approved for export
- **Export Options**: Export daily briefings as Word documents or JSON
- **Authentication**: NextAuth.js with password-based authentication
- **Database**: PostgreSQL with Azure support
- **Image Storage**: Azure Blob Storage integration for image management

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Styling**: Tailwind CSS v4.1, shadcn/ui components
- **Database**: PostgreSQL
- **Authentication**: NextAuth.js
- **Rich Text**: Tiptap editor
- **File Storage**: Azure Blob Storage
- **Export**: DOCX generation and JSON

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Azure Blob Storage account (optional, for image storage)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/UN-EOSG-Analytics/un-morning-briefings.git
cd un-morning-briefings
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/database"

# Authentication
NEXTAUTH_SECRET=<generate-with: openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000
SITE_PASSWORD=your-secure-password

# Azure Blob Storage
BLOB_STORAGE_TYPE=azure
AZURE_STORAGE_ACCOUNT=your-account
AZURE_STORAGE_KEY=your-key
AZURE_STORAGE_CONTAINER=container-name
```

4. Initialize the database:
```bash
npx ts-node sql/init.sql
```

5. Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Setup

### PostgreSQL Schema

The application uses a `pu_morning_briefings` schema. Initialize with:

```bash
psql -U username -d database_name -f sql/init.sql
```

Key tables:
- `entries` - Morning briefing entries
- `images` - Associated images

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm start            # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript type checking
```

## Project Structure

```
src/
├── app/
│   ├── api/              # API routes (entries, auth, images)
│   ├── form/            # Form page for creating/editing entries
│   ├── list/            # List page to view entries
│   ├── drafts/          # Drafts page
│   ├── login/           # Login page
│   └── page.tsx         # Homepage
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── MorningMeetingForm.tsx
│   ├── MorningMeetingList.tsx
│   ├── RichTextEditor.tsx
│   ├── EntriesTable.tsx
│   ├── Navbar.tsx
│   └── ...other components
├── lib/
│   ├── db.ts            # Database queries
│   ├── storage.ts       # Entry management
│   ├── auth-helper.ts   # Authentication utilities
│   └── ...other utilities
└── types/
    └── morning-meeting.ts  # TypeScript interfaces
```

## Authentication

The application uses NextAuth.js with a single shared password:

- **Login Page**: `/login`
- **Site Password**: Configure `SITE_PASSWORD` in `.env.local`
- **Session Duration**: 30 days

For details, see [AUTHENTICATION.md](./AUTHENTICATION.md)

## Mobile Optimization

The application is fully responsive with mobile-first design:

- **Editor Mode**: Automatically switches between plain text (mobile) and rich text (desktop)
- **Navigation**: Hamburger menu on mobile
- **Layout**: Responsive grid layout that stacks on small screens
- **Touch Targets**: Optimized for mobile interaction

## API Endpoints

### GET /api/entries
Fetch morning briefing entries with optional filters

**Query Parameters:**
- `date` - Filter by date (YYYY-MM-DD)
- `status` - Filter by status (draft/submitted)
- `author` - Filter by author

**Response:**
```json
[
  {
    "id": "uuid",
    "headline": "Entry headline",
    "entry": "Entry content",
    "date": "2026-01-12",
    "category": "category-name",
    "priority": "sg-attention|situational-awareness",
    "region": "region-name",
    "country": "country-name",
    "sourceUrl": "https://...",
    "puNote": "Political unit note",
    "status": "draft|submitted",
    "approved": false,
    "images": [],
    "createdAt": "2026-01-12T00:00:00Z",
    "updatedAt": "2026-01-12T00:00:00Z"
  }
]
```

### POST /api/entries
Create a new morning briefing entry

### GET /api/entries/[id]
Get a specific entry by ID

### PUT /api/entries/[id]
Update an entry

### DELETE /api/entries/[id]
Delete an entry

### POST /api/images
Upload an image (multipart form)

## Development Guidelines

### Code Style

- Use TypeScript for type safety
- Follow ESLint configuration
- Use Prettier for formatting
- Component names in PascalCase
- Use shadcn/ui components for consistency

### Adding shadcn/ui Components

```bash
npx shadcn@latest add component-name
```

### Environment Setup

Ensure your environment variables are set:

```bash
npm run check-env
```

## Performance Optimization

- Server Components for SSR where possible
- Client Components only for interactive elements
- Image optimization with Next.js Image component
- Code splitting and lazy loading
- Tailwind CSS purging unused styles

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Commit changes: `git commit -am 'Add feature'`
3. Push to branch: `git push origin feature/your-feature`
4. Open a pull request

## License

Proprietary - United Nations

## Support

For issues or questions, contact the Political Unit (EOSG).
