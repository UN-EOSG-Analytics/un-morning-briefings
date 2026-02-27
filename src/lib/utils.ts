import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Shared Utilities ────────────────────────────────────────────────────────

/**
 * Normalize a country field (string, JSON string, or array) into a string[].
 * Handles all the formats that country data can appear in across the app.
 */
export function parseCountryField(country: unknown): string[] {
  if (!country) return [];
  if (Array.isArray(country)) return country;
  if (typeof country === "string") {
    if (country.startsWith("[")) {
      try {
        const parsed = JSON.parse(country);
        return Array.isArray(parsed) ? parsed : [country];
      } catch {
        return [country];
      }
    }
    return [country];
  }
  return [];
}

/**
 * Extract a user-friendly error message from an unknown error.
 * Used in catch blocks across the app to avoid `any` casts.
 */
export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return fallback;
}

/**
 * Trigger a JSON file download in the browser.
 * Creates a temporary blob URL and clicks a hidden link.
 */
export function downloadJsonBlob(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Get a display name from a NextAuth session.
 * Tries firstName + lastName first, then name, then a fallback.
 */
export function getUserDisplayName(
  session: { user?: { firstName?: string; lastName?: string; name?: string | null } } | null,
  fallback = "User"
): string {
  if (session?.user?.firstName && session?.user?.lastName) {
    return `${session.user.firstName} ${session.user.lastName}`;
  }
  return session?.user?.name || fallback;
}
