import type { MorningMeetingEntry } from "@/types/morning-meeting";

export type GroupedEntries = Record<
  string,
  Record<string, MorningMeetingEntry[]>
>;

/**
 * Group entries by region and country.
 * Returns the grouped structure and the sorted region keys.
 *
 * Used by: briefing-docx.ts (TOC + body), EntriesTable.tsx (agenda dialog).
 */
export function groupEntriesByRegionAndCountry(
  entries: MorningMeetingEntry[],
): { grouped: GroupedEntries; sortedRegions: string[] } {
  const grouped = entries.reduce<GroupedEntries>((acc, entry) => {
    if (!acc[entry.region]) {
      acc[entry.region] = {};
    }

    if (
      !entry.country ||
      entry.country === "" ||
      (Array.isArray(entry.country) && entry.country.length === 0)
    ) {
      if (!acc[entry.region][""]) {
        acc[entry.region][""] = [];
      }
      acc[entry.region][""].push(entry);
    } else {
      const countries = Array.isArray(entry.country)
        ? entry.country
        : [entry.country];
      const countryKey = countries.join(" / ");
      if (!acc[entry.region][countryKey]) {
        acc[entry.region][countryKey] = [];
      }
      acc[entry.region][countryKey].push(entry);
    }
    return acc;
  }, {});

  const sortedRegions = Object.keys(grouped).sort();

  return { grouped, sortedRegions };
}

/** Sort country keys within a region: alphabetical, empty string last */
export function sortCountryKeys(keys: string[]): string[] {
  return [...keys].sort((a, b) => {
    if (a === "") return 1;
    if (b === "") return -1;
    return a.localeCompare(b);
  });
}
