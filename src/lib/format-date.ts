/**
 * Parse a date string and extract components WITHOUT any timezone conversion.
 * Works with formats like:
 * - "2026-01-15T13:30:00.000Z"   (ISO with Z — Z is ignored)
 * - "2026-01-15T13:30:00"        (ISO without Z)
 * - "2026-01-15T13:30"           (ISO date-time)
 * - "2026-01-15 13:30:00.000"    (pg raw TIMESTAMP string, space separator)
 * Returns the literal values from the string, ignoring any timezone suffix.
 */
export function parseDateString(dateStr: string): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
} {
  const match = dateStr.match(/(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (!match) {
    const dateOnly = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (dateOnly) {
      return {
        year: parseInt(dateOnly[1]),
        month: parseInt(dateOnly[2]),
        day: parseInt(dateOnly[3]),
        hour: 0,
        minute: 0,
      };
    }
    return { year: 0, month: 0, day: 0, hour: 0, minute: 0 };
  }

  return {
    year: parseInt(match[1]),
    month: parseInt(match[2]),
    day: parseInt(match[3]),
    hour: parseInt(match[4]),
    minute: parseInt(match[5]),
  };
}

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
export const MONTH_NAMES_FULL = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
export const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/**
 * Format date responsively for desktop and mobile
 * Desktop: "Jan 14, 2026"
 * Mobile: "01/14"
 *
 * NO timezone conversion - uses literal string values
 */
export function formatDateResponsive(date: string | Date): {
  desktop: string;
  mobile: string;
} {
  const dateStr = typeof date === "string" ? date : date.toISOString();
  const { year, month, day } = parseDateString(dateStr);

  const desktop = `${MONTH_NAMES[month - 1]} ${day}, ${year}`;
  const mobile = `${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}`;

  return { desktop, mobile };
}

/**
 * Format date for desktop view: "Jan 14, 2026"
 * NO timezone conversion - uses literal string values
 */
export function formatDateDesktop(date: string | Date): string {
  const dateStr = typeof date === "string" ? date : date.toISOString();
  const { year, month, day } = parseDateString(dateStr);
  return `${MONTH_NAMES[month - 1]} ${day}, ${year}`;
}

/**
 * Format date with weekday: "Monday, Jan 14, 2026"
 * NO timezone conversion - uses literal string values
 */
export function formatDateWithWeekday(date: string | Date): string {
  const dateStr = typeof date === "string" ? date : date.toISOString();
  const { year, month, day } = parseDateString(dateStr);

  // Create a Date object to get the day of the week
  const dateObj = new Date(year, month - 1, day);
  const weekday = WEEKDAY_NAMES[dateObj.getDay()];

  return `${weekday}, ${MONTH_NAMES[month - 1]} ${day}, ${year}`;
}

/**
 * Format time as HH:MM (no seconds)
 * NO timezone conversion - entry.date stores NYC local time as a naive
 * timestamp (no tz offset), so we read the literal hour/minute from the string.
 */
export function formatTime(date: string | Date): string {
  const dateStr = typeof date === "string" ? date : date.toISOString();
  const { hour, minute } = parseDateString(dateStr);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/**
 * Format a UTC timestamp (created_at / updated_at) as HH:MM in New York time.
 * These columns store UTC time; we convert to America/New_York for display.
 */
export function formatTimeNYC(date: string | Date): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dateObj.toLocaleTimeString("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * Format date with full month name: "January 14, 2026"
 * Used in documents, emails, and source date display.
 * NO timezone conversion.
 */
export function formatDateFull(date: string | Date): string {
  const dateStr = typeof date === "string" ? date : date.toISOString();
  const { year, month, day } = parseDateString(dateStr);
  if (!year || !month) return dateStr.toString();
  return `${MONTH_NAMES_FULL[month - 1]} ${day}, ${year}`;
}

/**
 * Format date with weekday and full month: "Wednesday, January 14, 2026"
 * Used in document headers and briefing titles.
 * NO timezone conversion.
 */
export function formatDateLong(date: string | Date): string {
  const dateStr = typeof date === "string" ? date : date.toISOString();
  const { year, month, day } = parseDateString(dateStr);
  if (!year || !month) return dateStr.toString();
  const dateObj = new Date(year, month - 1, day);
  const weekday = WEEKDAY_NAMES[dateObj.getDay()];
  return `${weekday}, ${MONTH_NAMES_FULL[month - 1]} ${day}, ${year}`;
}

/**
 * Get current date/time components in America/New_York timezone.
 * Uses Intl.DateTimeFormat so it works correctly regardless of the
 * browser's or server's local timezone setting.
 */
export function getNycNow(): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
} {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  }).formatToParts(now);

  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  const hour = parseInt(get("hour"));

  return {
    year: parseInt(get("year")),
    month: parseInt(get("month")),
    day: parseInt(get("day")),
    hour: hour === 24 ? 0 : hour,
    minute: parseInt(get("minute")),
    dayOfWeek: new Date(
      parseInt(get("year")),
      parseInt(get("month")) - 1,
      parseInt(get("day")),
    ).getDay(),
  };
}

/**
 * Format current date/time as localized string: "1/15/2026, 3:45 PM ET"
 * Always uses America/New_York timezone for consistency between
 * client-side and server-side (Vercel/UTC) document generation.
 */
export function getCurrentDateTime(): string {
  return new Date().toLocaleString("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }) + " ET";
}
