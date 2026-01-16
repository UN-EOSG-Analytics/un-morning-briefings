/**
 * Parse a date string and extract components WITHOUT any timezone conversion.
 * Returns the literal values from the string.
 */
function parseDateString(dateStr: string): { year: number; month: number; day: number; hour: number; minute: number } {
  const match = dateStr.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
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

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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
  const dateStr = typeof date === 'string' ? date : date.toISOString();
  const { year, month, day } = parseDateString(dateStr);

  const desktop = `${MONTH_NAMES[month - 1]} ${day}, ${year}`;
  const mobile = `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;

  return { desktop, mobile };
}

/**
 * Format date for desktop view: "Jan 14, 2026"
 * NO timezone conversion - uses literal string values
 */
export function formatDateDesktop(date: string | Date): string {
  const dateStr = typeof date === 'string' ? date : date.toISOString();
  const { year, month, day } = parseDateString(dateStr);
  return `${MONTH_NAMES[month - 1]} ${day}, ${year}`;
}

/**
 * Format date with weekday: "Monday, Jan 14, 2026"
 * NO timezone conversion - uses literal string values
 */
export function formatDateWithWeekday(date: string | Date): string {
  const dateStr = typeof date === 'string' ? date : date.toISOString();
  const { year, month, day } = parseDateString(dateStr);
  
  // Create a Date object to get the day of the week
  const dateObj = new Date(year, month - 1, day);
  const weekday = WEEKDAY_NAMES[dateObj.getDay()];
  
  return `${weekday}, ${MONTH_NAMES[month - 1]} ${day}, ${year}`;
}

/**
 * Format time as HH:MM (no seconds)
 * NO timezone conversion - uses literal string values
 */
export function formatTime(date: string | Date): string {
  const dateStr = typeof date === 'string' ? date : date.toISOString();
  const { hour, minute } = parseDateString(dateStr);
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}
