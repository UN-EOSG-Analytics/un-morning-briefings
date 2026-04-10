# DOCX Backup to SharePoint via Power Automate

## How it works

1. A Vercel Cron job runs every 15 minutes on weekdays
2. It generates the current briefing as a DOCX and uploads it to Azure Blob Storage
3. A Power Automate flow detects the new/updated blob and copies it to SharePoint

The blob is stored at: `briefing-backup/<YYYY-MM-DD>.docx` (e.g. `briefing-backup/2026-04-10.docx`).
Each day gets its own blob, overwritten every 15 minutes as entries are updated.
The previous weekday's blob is automatically cleaned up.

## Prerequisites

- Access to Azure Blob Storage credentials (account name + key) — same ones used by the app for image storage
- A Microsoft 365 account with Power Automate access
- A SharePoint site/library where the DOCX should land

## Vercel Cron setup

Already configured in `vercel.json`. Requires:
- **Vercel Pro plan** (Hobby plan is limited to 2 cron jobs)
- `CRON_SECRET` environment variable set in Vercel project settings (same one used by the send-briefing cron)

Test manually:
```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://your-app.vercel.app/api/cron/backup-briefing
```

## Power Automate flow setup

### Step 1: Create a new flow

1. Go to [Power Automate](https://make.powerautomate.com/)
2. Click **Create** > **Automated cloud flow**
3. Name it "Briefing DOCX Backup to SharePoint"
4. Skip the trigger selection (we'll add it manually)

### Step 2: Add the trigger

1. Search for **Azure Blob Storage** connector
2. Select trigger: **When a blob is added or modified (V2)**
3. Configure the connection:
   - **Authentication type**: Access Key
   - **Azure Storage account name**: *(same as `AZURE_STORAGE_ACCOUNT` env var)*
   - **Azure Storage account key**: *(same as `AZURE_STORAGE_KEY` env var)*
4. Configure the trigger:
   - **Container**: `/morning-briefings` (or whatever `AZURE_STORAGE_CONTAINER` is set to)
   - **Folder path**: `/briefing-backup`
   - **Number of blobs to return**: 1
   - **How often do you want to check for items?**: Every 1 minute (or 5 minutes — this is how often Power Automate polls, independent of the cron interval)

### Step 3: Add the SharePoint action

1. Click **+ New step**
2. Search for **SharePoint** connector
3. Select action: **Create file**
4. Configure:
   - **Site Address**: pick your SharePoint site from the dropdown
   - **Folder Path**: pick the target document library/folder (e.g. `/Shared Documents/Morning Briefings`)
   - **File Name**: use the expression `last(split(triggerBody()?['Name'], '/'))` to extract just the filename (e.g. `2026-04-10.docx`), or use a fixed name like `Morning Briefing.docx` if you want the same file overwritten
   - **File Content**: select **File Content** from the trigger's dynamic content

### Step 4: Handle overwrites (important!)

The SharePoint "Create file" action will **fail** if the file already exists. Since the blob is updated every 15 minutes, you need to handle this:

**Option A — Update existing file (recommended):**
Replace "Create file" with these two steps:
1. **Get file metadata using path** — check if the file exists at the target path
2. **If yes → Update file** / **If no → Create file**

Or more simply:

**Option B — Delete then create:**
1. Add **Delete file** (SharePoint) before Create file, with the same path
2. Configure the Delete step to **not fail** if file doesn't exist: click `...` > **Configure run after** > check **has failed** and **is successful**

**Option C — Use "Create or Replace file" (simplest if available):**
Some SharePoint connector versions offer this. Search for "Update file" in the SharePoint connector actions — it overwrites by ID.

### Step 5: Test

1. Save the flow
2. Manually trigger the backup cron: `curl -H "Authorization: Bearer $CRON_SECRET" <app-url>/api/cron/backup-briefing`
3. Wait for Power Automate to poll (up to the interval you set in Step 2)
4. Check the SharePoint library for the file

## Transferring to another team

The political unit team needs to set up this flow in their own environment:

### Option A: Export and import (recommended)

1. In Power Automate, go to your flow > **Export** > **Package (.zip)**
2. Send the .zip to the other team
3. They go to Power Automate > **Import** > upload the .zip
4. They re-authenticate both connectors:
   - **Azure Blob Storage**: same account name + key (shared infra)
   - **SharePoint**: their own M365 account, pointing to their SharePoint site
5. Update the SharePoint folder path to their target library

### Option B: Recreate from this doc

The flow is only 2-3 steps, so recreating from these instructions takes ~10 minutes.

## Blob storage details

| Property | Value |
|----------|-------|
| Container | `morning-briefings` (default, configurable via `AZURE_STORAGE_CONTAINER`) |
| Blob path | `briefing-backup/YYYY-MM-DD.docx` |
| Updated | Every 15 min, every day (UTC) |
| Cleanup | Yesterday's blob is auto-deleted |
| Auth | Storage account key (same as image storage) |
