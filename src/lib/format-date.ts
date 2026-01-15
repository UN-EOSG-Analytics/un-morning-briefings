/**
 * Format date responsively for desktop and mobile
 * Desktop: "Jan 14, 2026"
 * Mobile: "01/14"
 */
export function formatDateResponsive(date: string | Date): {
  desktop: string;
  mobile: string;
} {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  const desktop = dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/New_York',
  });

  const mobile = dateObj.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    timeZone: 'America/New_York',
  });

  return { desktop, mobile };
}

/**
 * Format date for desktop view only in Eastern Time: "Jan 14, 2026"
 */
export function formatDateDesktop(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/New_York',
  });
}

/**
 * Format time as HH:MM in Eastern Time (no seconds)
 */
export function formatTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/New_York',
  });
}
