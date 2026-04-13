# Automated Briefing Email (Vercel Cron)

The morning briefing email is sent automatically at **7:44 AM New York time, Monday through Friday** via Vercel Cron.

## How it works

1. Vercel fires a GET request to `/api/cron/send-briefing` on schedule
2. The route authenticates the request using the `CRON_SECRET` env var
3. It checks the current time in America/New_York and skips if before 7:44 AM
4. It checks `email_send_log` to prevent duplicate sends for the same briefing date
5. It fetches all submitted entries for today's briefing date (8 AM cutoff window)
6. It converts image references to data URLs server-side via blob storage
7. It generates a DOCX file using the shared `briefing-docx` module
8. It sends the email to all recipients (whitelist + additional recipients from settings)
9. It logs the result to `email_send_log` with `triggered_by = 'cron'`

## DST-safe dual-cron schedule

Vercel cron schedules are static UTC expressions with no timezone support. New York switches between EDT (UTC-4) and EST (UTC-5), so a single UTC schedule would drift by 1 hour across daylight saving transitions.

To always send at 7:44 AM ET year-round, two cron triggers are configured in `vercel.json`:

```
"44 11 * * 1-5"   →  11:44 UTC  →  7:44 AM EDT  /  6:44 AM EST
"44 12 * * 1-5"   →  12:44 UTC  →  8:44 AM EDT  /  7:44 AM EST
```

> **IMPORTANT:** The cron minute (`44`) and the time guard in `src/app/api/cron/send-briefing/route.ts` (`SEND_MINUTE_NYC = 44`) must match. If you change one, change the other.

The route has two guards that make this work:

- **Time check**: Skips if NYC wall-clock time is before 7:44 AM. This prevents the early cron (11:44 UTC) from sending during EST when it maps to 6:44 AM.
- **Duplicate guard**: Skips if a successful cron send for today's briefing date already exists in `email_send_log`. This prevents the late cron (12:44 UTC) from re-sending during EDT when the 11:44 UTC run already sent it.

### All scenarios

| Period | Cron 1 (11:44 UTC) | Cron 2 (12:44 UTC) |
|--------|--------------------|--------------------|
| **EDT** (Mar-Nov) | 7:44 AM ET — time check passes, **sends** | 8:44 AM ET — duplicate guard **skips** |
| **EST** (Nov-Mar) | 6:44 AM ET — time check fails, **skips** | 7:44 AM ET — time check passes, **sends** |

US DST transitions happen on Sundays. The cron schedule is weekdays only (`1-5`), so the cron never fires on a transition day. By Monday, NYC is fully in the new offset.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `CRON_SECRET` | Yes | Shared secret for authenticating cron requests. Vercel sends this as `Authorization: Bearer <secret>`. Set in Vercel project settings. |
| `CRON_TEST_EMAIL` | No | When set, the cron sends only to this email address instead of the full distribution list. Use for testing. Remove to go live. |

## Entry selection

The cron sends **all submitted entries** for the briefing date, regardless of discussion status. This matches the behavior of the manual Export dialog (which defaults to all entries selected).

The briefing date uses the 8 AM cutoff: entries from yesterday 8:00 AM to today 8:00 AM (New York time) are included in today's briefing.

## Testing

1. Set `CRON_SECRET` and `CRON_TEST_EMAIL` in `.env.local` (or Vercel env vars)
2. Start the dev server: `pnpm dev`
3. Trigger manually:
   ```bash
   curl -H "Authorization: Bearer <your-secret>" http://localhost:3000/api/cron/send-briefing
   ```
4. Check the response:
   - `{ success: true, ... }` — email sent
   - `{ skipped: true, reason: "already sent" }` — duplicate guard fired
   - `{ skipped: true, reason: "too early in NYC" }` — time check fired
   - `{ skipped: true, reason: "no entries" }` — no entries for today's briefing date

## Delivery log

Send history is recorded in the `email_send_log` table and viewable at `/health`. Cron sends are logged with `triggered_by = 'cron'`; manual sends from the Export dialog are logged with the sender's email.

## Files

- `vercel.json` — cron schedule configuration
- `src/app/api/cron/send-briefing/route.ts` — cron endpoint
- `src/lib/briefing-docx.ts` — shared DOCX generation (used by both cron and Export dialog)
- `src/lib/entry-queries.ts` — `fetchEntriesForBriefingDate()` query
