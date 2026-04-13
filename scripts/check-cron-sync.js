#!/usr/bin/env node

/**
 * Verify that the cron minute in vercel.json matches SEND_MINUTE_NYC in the
 * send-briefing route handler.  Run as part of `pnpm lint` / CI so a mismatch
 * is caught before deploy.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

// 1. Extract minutes from vercel.json cron schedules for send-briefing
const vercelJson = JSON.parse(
  fs.readFileSync(path.join(ROOT, "vercel.json"), "utf-8"),
);
const sendCrons = vercelJson.crons.filter((c) =>
  c.path.includes("send-briefing"),
);

if (sendCrons.length === 0) {
  console.error("ERROR: No send-briefing cron entries found in vercel.json");
  process.exit(1);
}

const cronMinutes = new Set(
  sendCrons.map((c) => {
    const minute = parseInt(c.schedule.split(" ")[0], 10);
    if (isNaN(minute)) {
      console.error(`ERROR: Cannot parse minute from schedule "${c.schedule}"`);
      process.exit(1);
    }
    return minute;
  }),
);

if (cronMinutes.size !== 1) {
  console.error(
    `ERROR: send-briefing crons in vercel.json have different minutes: ${[...cronMinutes].join(", ")}`,
  );
  process.exit(1);
}

const cronMinute = [...cronMinutes][0];

// 2. Extract SEND_MINUTE_NYC from the route handler
const routePath = path.join(
  ROOT,
  "src/app/api/cron/send-briefing/route.ts",
);
const routeSrc = fs.readFileSync(routePath, "utf-8");
const match = routeSrc.match(/SEND_MINUTE_NYC\s*=\s*(\d+)/);

if (!match) {
  console.error(
    "ERROR: Could not find SEND_MINUTE_NYC constant in send-briefing/route.ts",
  );
  process.exit(1);
}

const codeMinute = parseInt(match[1], 10);

// 3. Compare
if (cronMinute !== codeMinute) {
  console.error(
    `ERROR: Cron schedule minute (${cronMinute}) in vercel.json does not match SEND_MINUTE_NYC (${codeMinute}) in route.ts. These must be the same.`,
  );
  process.exit(1);
}

console.log(
  `✓ Cron schedule and SEND_MINUTE_NYC both use minute ${cronMinute}`,
);
