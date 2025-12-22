# Database Setup Guide

This application now uses PostgreSQL for data persistence instead of localStorage.

## Prerequisites

- PostgreSQL installed locally or access to a PostgreSQL database (Railway, Supabase, etc.)
- Node.js and npm installed

## Setup Steps

### 1. Install Dependencies

```bash
npm install @prisma/client
npm install -D prisma
```

### 2. Configure Database Connection

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` and set your PostgreSQL connection string:

```
DATABASE_URL="postgresql://user:password@localhost:5432/un_morning_briefings?schema=public"
```

### 3. Initialize Prisma

```bash
npx prisma generate
npx prisma db push
```

This will:
- Generate the Prisma Client
- Create the database tables based on the schema

### 4. (Optional) Seed Initial Data

If you have existing data in localStorage, you can migrate it manually or start fresh.

### 5. Run the Application

```bash
npm run dev
```

## Database Schema

The application uses two main tables:

### Entry Table
- Stores all morning briefing entries
- Fields: id, category, priority, region, country, headline, date, entry (HTML), sourceUrl, puNote, author, status, timestamps

### Image Table
- Stores images embedded in entries
- Fields: id, entryId, filename, mimeType, data (binary), width, height, position, timestamp
- Images are stored as BYTEA (binary) in PostgreSQL
- Automatically deleted when parent entry is deleted (CASCADE)

## API Endpoints

The application exposes these API routes:

- `GET /api/entries` - Get all entries (optionally filter by date)
- `POST /api/entries` - Create new entry with images
- `GET /api/entries/[id]` - Get single entry with images
- `PUT /api/entries/[id]` - Update entry and images
- `DELETE /api/entries/[id]` - Delete entry (cascades to images)
- `POST /api/images` - Upload image (returns base64 data URL)
- `GET /api/images?id=[id]` - Get image binary data

## Prisma Studio (Database GUI)

To view and manage your database visually:

```bash
npx prisma studio
```

This opens a web interface at http://localhost:5555

## Common Commands

```bash
# Generate Prisma Client after schema changes
npx prisma generate

# Apply schema changes to database
npx prisma db push

# Create a migration
npx prisma migrate dev --name description

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# View database in browser
npx prisma studio
```

## Production Deployment

For production:

1. Set `DATABASE_URL` in your hosting environment variables
2. Run `npx prisma generate` during build
3. Run `npx prisma db push` or `npx prisma migrate deploy`

## Troubleshooting

### Connection Issues
- Verify PostgreSQL is running
- Check DATABASE_URL format
- Ensure database exists
- Check firewall/network settings

### Schema Issues
- Run `npx prisma generate` after schema changes
- Run `npx prisma db push` to sync database

### Migration Issues
- Use `npx prisma migrate reset` to start fresh (loses data)
- Use `npx prisma db push` for development
- Use `npx prisma migrate deploy` for production
