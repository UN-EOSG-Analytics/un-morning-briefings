# DOCX Backup to SharePoint via Azure Logic App

## How it works

1. A Vercel Cron job runs every 15 minutes (every day, including weekends)
2. It generates the current briefing as a DOCX and uploads it to Azure Blob Storage, overwriting the previous version for that day
3. An Azure Logic App detects the new/updated blob and copies it to SharePoint — creating the file on the first run of the day, and updating it on subsequent runs

The blob is stored at: `briefing-backup/<YYYY-MM-DD>.docx` (e.g. `briefing-backup/2026-04-10.docx`).
Old blobs are kept indefinitely (storage cost is negligible: ~2MB/day → ~$0.16/year).

## Why Azure Logic App, not Power Automate

Power Automate was blocked by the UN's M365 DLP policy (`DLP-ENV-DEFAULT`), which disallows the Azure Blob Storage connector in Power Platform. Azure Logic Apps runs in the Azure subscription instead of M365, so it's governed by Azure RBAC and bypasses that policy.

## Prerequisites

- Access to the Azure subscription where `un80analyticsstg` lives (you need Contributor access to create Logic App resources)
- The `AZURE_STORAGE_KEY` value from `.env.local`
- A Microsoft 365 account with access to the target SharePoint site

## Vercel Cron setup

Already configured in `vercel.json` as `*/15 * * * *`. Requires:
- **Vercel Pro plan** (Hobby plan is limited to 2 cron jobs)
- `CRON_SECRET` environment variable set in Vercel project settings

Test manually:
```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://your-app.vercel.app/api/cron/backup-briefing
```

If there are no submitted entries for today the route returns `"skipped": true` and no blob is uploaded (so the Logic App won't trigger). Submit at least one entry first if you need a test blob.

## Azure Logic App setup

### Step 1: Find an allowed region

The UN Azure subscription has a `DenyNotAllowedLocations` policy. Before creating the Logic App, find out which regions are allowed:

**Via the Azure Portal:**
Go to **Azure Portal → Policy → Assignments**, find the `DenyNotAllowedLocations` policy, click into it, and check the **Parameters** tab for the list of allowed locations.

**Via Azure CLI:**
```bash
az policy assignment list --query "[?displayName=='DenyNotAllowedLocations Policy link'].parameters" -o json
```

Create the Logic App in one of the allowed regions.

### Step 2: Create the Logic App

1. Go to **Azure Portal → Create a resource → Logic App**
2. Choose **Consumption** plan (pay-per-execution, cheapest — costs under $0.15/month for this use case)
3. Pick an allowed region from Step 1
4. Once created, open the Logic App and go to **Logic App Designer**

### Step 3: Add the blob trigger

1. Search for **Azure Blob Storage**
2. Select trigger: **When a blob is added or modified (V2)**
3. Create a new connection:
   - **Connection name**: e.g. `morning-briefings-blob`
   - **Authentication type**: Access Key
   - **Azure Storage account name**: `un80analyticsstg`
   - **Azure Storage account key**: your `AZURE_STORAGE_KEY` value
4. Configure the trigger:
   - **Container**: `/pu-morning-briefing-images` (or whatever `AZURE_STORAGE_CONTAINER` is set to)
   - **Folder path**: `/briefing-backup`
   - **Number of blobs to return**: leave at default (10)
   - **How often do you want to check for items?**: Every 5 minutes (this is the Logic App's polling interval, independent of the Vercel cron)

> **Note:** The V2 trigger returns **metadata only**, not the file content. You need a separate step to get the actual blob content (Step 4 below).

### Step 4: Add "Get blob content (V2)"

1. Click **+ New step**
2. Search for **Azure Blob Storage**, select action: **Get blob content (V2)**
3. Use the same connection you created in Step 3
4. Configure:
   - **Container**: `/pu-morning-briefing-images`
   - **Blob**: click the field → **Dynamic content** → select **List of Files Path** from the trigger outputs

This step fetches the actual DOCX bytes that you'll write to SharePoint.

### Step 5: Add "Create file" (SharePoint)

1. Click **+ New step**
2. Search for **SharePoint**, select action: **Create file**
3. Sign in with your M365 account when prompted
4. Configure:
   - **Site Address**: pick your SharePoint site from the dropdown (e.g. `EOSG Strategic Planning and Monitoring Unit`)
   - **Folder Path**: pick or type the target document library/folder (e.g. `/Shared Documents/PU Morning Briefings`)
   - **File Name**: click the field → **Dynamic content** → select **List of Files Name** from the trigger outputs (this gives you `briefing-backup/2026-04-10.docx`). If that includes the full path prefix, switch to the **Expression** tab and use: `last(split(triggerBody()?['List of Files']?[0]?['Name'], '/'))`
   - **File Content**: click the field → **Dynamic content** → select **File Content** from the "Get blob content (V2)" step

> **Note:** "Create file" **fails** if the file already exists. This is expected after the first run of each day. Steps 6–7 handle that case.

### Step 6: Add "Get file metadata using path" (SharePoint)

This step runs **only when "Create file" fails** (i.e. the file already exists) so it can look up the file ID needed to update it.

1. Click **+ New step**
2. Search for **SharePoint**, select action: **Get file metadata using path**
3. Use the **same SharePoint connection** you authenticated in Step 5 (important: make sure it's not using an Azure Files connection — click "Change connection" if needed)
4. Configure:
   - **Site Address**: same SharePoint site
   - **File Path**: type the folder path + `/` then insert **List of Files Name** from dynamic content (e.g. `/Shared Documents/PU Morning Briefings/2026-04-10.docx`)
5. Configure "run after": click on this step → **Settings** tab → find **Run After** → expand → uncheck **is successful** → check **has failed**. This makes the step run only when "Create file" failed.

### Step 7: Add "Update file" (SharePoint)

1. Click **+ New step**
2. Search for **SharePoint**, select action: **Update file**
3. Use the same SharePoint connection
4. Configure:
   - **Site Address**: same SharePoint site
   - **File**: click the field → **Dynamic content** → select **Id** from the "Get file metadata using path" step
   - **File Content**: click the field → **Dynamic content** → select **File Content** from the "Get blob content (V2)" step
5. The "run after" for this step stays at the default (runs when "Get file metadata using path" succeeds)

### The resulting flow

```
Trigger: blob modified
  → Get blob content (V2)
    → Create file (SharePoint)
        ↓ succeeds: done (first run of the day)
        ↓ fails (file exists):
          → Get file metadata using path
            → Update file (SharePoint)
```

No deletion — the file is always present in SharePoint.

### Step 8: Test

1. Make sure there are submitted entries for today in the app
2. Trigger the backup cron manually:
   ```bash
   curl -H "Authorization: Bearer $CRON_SECRET" https://your-app.vercel.app/api/cron/backup-briefing
   ```
3. In the Logic App designer, click **Run** to force an immediate poll (instead of waiting up to 5 minutes)
4. Check the **Run history** tab to see if it succeeded
5. Check your SharePoint folder for the file

For the second test (to verify the update path works), run the curl command again and then trigger again — this time "Create file" should fail and "Update file" should take over.

## Transferring to another team

The Logic App is only a few steps, so the easiest handover is to recreate it from this doc (~15 minutes). They will need:

- Access to the Azure subscription (or you export the Logic App from Azure Portal → **Export** and share the ARM template)
- The Azure storage account name + key (shared infra)
- Their own M365 account to authenticate the SharePoint connector (this step can't be pre-done — it's their permissions, pointing to their SharePoint site)

## Blob storage details

| Property | Value |
|----------|-------|
| Container | `pu-morning-briefing-images` (configurable via `AZURE_STORAGE_CONTAINER`) |
| Blob path | `briefing-backup/YYYY-MM-DD.docx` |
| Updated | Every 15 min, every day (UTC) |
| Retention | Kept indefinitely (no cleanup) |
| Auth | Storage account key (same as image storage) |
