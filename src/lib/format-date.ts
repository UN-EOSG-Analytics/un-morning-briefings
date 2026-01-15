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
  });

  const mobile = dateObj.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
  });

  return { desktop, mobile };
}

/**
 * Format date for desktop view only: "Jan 14, 2026"
 */
export function formatDateDesktop(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format date for mobile view only: "01/14"
 */
export function formatDateMobile(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
  });
}
