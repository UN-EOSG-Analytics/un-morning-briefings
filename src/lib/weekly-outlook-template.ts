import { WEEKDAY_NAMES, MONTH_NAMES_FULL } from "@/lib/format-date";

/**
 * Given a date string (YYYY-MM-DD or YYYY-MM-DDTHH:MM), returns an array of
 * { label, date } for Monday–Friday of that week, where date is a Date object.
 */
function getWeekDays(dateStr: string): string[] {
  const match = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return [];

  const year = parseInt(match[1]);
  const month = parseInt(match[2]) - 1; // JS months are 0-indexed
  const day = parseInt(match[3]);

  // Use UTC to avoid DST shifts when computing day offsets
  const d = new Date(Date.UTC(year, month, day));
  const dow = d.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const diffToMonday = dow === 0 ? -6 : 1 - dow;

  const days: string[] = [];
  for (let i = 0; i < 5; i++) {
    const wd = new Date(d);
    wd.setUTCDate(d.getUTCDate() + diffToMonday + i);
    days.push(`${WEEKDAY_NAMES[wd.getUTCDay()]} ${wd.getUTCDate()} ${MONTH_NAMES_FULL[wd.getUTCMonth()]}`);
  }
  return days;
}

/**
 * Generate Tiptap-compatible HTML for the Weekly Outlook entry body.
 * The outer headline "Weekly Outlook" is stored as entry.headline, not here.
 */
export function generateWeeklyOutlookHTML(dateStr: string): string {
  const days = getWeekDays(dateStr);

  const dayRows = days
    .map((label) => `<p><strong>${label}</strong></p><ul><li></li></ul>`)
    .join("");

  const sections = [
    { title: "Security Council", content: dayRows },
    { title: "General Assembly", content: dayRows },
    { title: "Other Key Events", content: dayRows },
    {
      title: "Reports",
      content: `<ul><li></li></ul>`,
    },
  ];

  return sections
    .map((s) => `<h2>${s.title}</h2>${s.content}`)
    .join("");
}
