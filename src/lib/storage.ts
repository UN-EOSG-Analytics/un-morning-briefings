import { MorningMeetingEntry } from '@/types/morning-meeting';

const STORAGE_KEY = 'morning-meeting-entries';

export function saveEntry(entry: MorningMeetingEntry): void {
  const entries = getAllEntries();
  const entryWithId = {
    ...entry,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
  };
  entries.unshift(entryWithId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function getAllEntries(): any[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

export function deleteEntry(id: string): void {
  const entries = getAllEntries();
  const filtered = entries.filter(entry => entry.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export function updateEntry(id: string, updatedEntry: Partial<MorningMeetingEntry>): void {
  const entries = getAllEntries();
  const index = entries.findIndex(entry => entry.id === id);
  if (index !== -1) {
    entries[index] = { ...entries[index], ...updatedEntry };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }
}
