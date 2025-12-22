# Database Setup Guide

This application uses PostgreSQL with the `pg` client for data persistence.

## Prerequisites

- PostgreSQL installed locally or access to a PostgreSQL database (Railway, Supabase, etc.)
- Node.js and npm installed

## Setup Steps

### 1. Install Dependencies

```bash
npm install pg @types/pg
```

### 2. Configure Database Connection

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` and set your PostgreSQL connection string:

```
DATABASE_URL="postgresql://user:password@localhost:5432/database_name"
```

### 3. Initialize Database Schema

Run the SQL initialization script to create the schema and tables:

```bash
psql $DATABASE_URL -f sql/init.sql
```

Or connect to your database and run the contents of `sql/init.sql` manually.

This will:
- Create the `pu_morning_briefings` schema
- Create the `entries` and `images` tables
- Set up foreign key relationships and cascading deletes

### 4. Run the Application

```bash
npm run dev
```

## Database Schema

The application uses the `pu_morning_briefings` schema with two main tables:

### entries Table
- Stores all morning briefing entries
- Fields: id, category, priority, region, country, headline, date, entry (TEXT), source_url, pu_note, author, status, created_at, updated_at

### images Table
- Stores image metadata and references to blob storage
- Fields: id, entry_id, filename, mime_type, blob_url, width, height, position, created_at
- Images are stored in blob storage (not in database)
- Foreign key constraint with CASCADE delete when parent entry is deleted

## API Endpoints

The application exposes these API routes (server-side only):

- `GET /api/entries` - Get all entries (optionally filter by date)
- `POST /api/entries` - Create new entry with images
- `GET /api/entries/[id]` - Get single entry with images
- `PUT /api/entries/[id]` - Update entry and images
- `DELETE /api/entries/[id]` - Delete entry (cascades to images)
- `POST /api/images` - Upload image (returns base64 data URL for preview)
- `GET /api/images?id=[id]` - Redirect to blob storage URL

## Database Management

To view and manage your database, you can use:

- **pgAdmin** - Desktop GUI for PostgreSQL
- **psql** - Command-line interface
- **DBeaver** - Universal database tool
- **TablePlus** - Modern database GUI

Connect using your `DATABASE_URL`.

## Common Commands

```bash
# Connect to database
psql $DATABASE_URL

# Run schema updates
psql $DATABASE_URL -f sql/init.sql

# View tables in pu_morning_briefings schema
psql $DATABASE_URL -c "\dt pu_morning_briefings.*"

# Query entries
psql $DATABASE_URL -c "SELECT * FROM pu_morning_briefings.entries LIMIT 10;"
```

## Production Deployment

For production:

1. Set `DATABASE_URL` in your hosting environment variables
2. Run `sql/init.sql` to initialize the database schema
3. Ensure the database connection pool settings in `lib/db.ts` are appropriate for your environment

## Troubleshooting

### Connection Issues
- Verify PostgreSQL is running: `pg_isready`
- Check DATABASE_URL format: `postgresql://user:password@host:port/database`
- Ensure database exists: `psql $DATABASE_URL -c "SELECT 1"`
- Check firewall/network settings
- Verify connection pool settings in `lib/db.ts`

### Schema Issues
- Re-run `sql/init.sql` to reset schema
- Check search_path is set correctly (should default to `pu_morning_briefings`)
- Use `\dt pu_morning_briefings.*` in psql to list tables

### Query Issues
- All queries automatically use the `pu_morning_briefings` schema
- The `query()` helper in `lib/db.ts` sets the search_path automatically
- Check logs for SQL errors and query execution details

### Data Reset
To start fresh (WARNING: deletes all data):
```bash
psql $DATABASE_URL -c "DROP SCHEMA pu_morning_briefings CASCADE;"
psql $DATABASE_URL -f sql/init.sql
```
