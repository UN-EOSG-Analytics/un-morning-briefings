/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useMemo } from 'react';

/**
 * Parse a date string and extract components WITHOUT any timezone conversion.
 * Works with formats like:
 * - "2026-01-15T13:30:00.000Z"
 * - "2026-01-15T13:30:00"
 * - "2026-01-15T13:30"
 * 
 * Returns the literal values from the string, ignoring any Z suffix.
 */
function parseDateString(dateStr: string): { year: number; month: number; day: number; hour: number; minute: number } {
  // Extract YYYY-MM-DD and HH:MM from the string
  const match = dateStr.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) {
    // Fallback for date-only strings
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

/**
 * Convert date components to a comparable number (minutes since epoch-ish)
 * Used for comparing dates without timezone issues
 */
function dateToMinutes(year: number, month: number, day: number, hour: number, minute: number): number {
  // Simple calculation for comparison purposes
  return year * 525600 + month * 43800 + day * 1440 + hour * 60 + minute;
}

/**
 * Get the current briefing date based on local time
 * 
 * Logic: If current time is >= 8AM, we're working on tomorrow's briefing
 *        If current time is < 8AM, we're working on today's briefing
 */
export function getCurrentBriefingDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const hour = now.getHours();
  
  let briefingDay = day;
  let briefingMonth = month;
  let briefingYear = year;
  
  // If >= 8AM, working on tomorrow's briefing
  if (hour >= 8) {
    briefingDay += 1;
    // Handle month overflow
    const daysInMonth = new Date(year, month, 0).getDate();
    if (briefingDay > daysInMonth) {
      briefingDay = 1;
      briefingMonth += 1;
      if (briefingMonth > 12) {
        briefingMonth = 1;
        briefingYear += 1;
      }
    }
  }
  
  return `${briefingYear}-${String(briefingMonth).padStart(2, '0')}-${String(briefingDay).padStart(2, '0')}`;
}

/**
 * Get the briefing date for an entry based on 8AM cutoff.
 * Uses the literal date/time from the string - NO timezone conversion.
 * 
 * Logic:
 *   - If entry time >= 8:00 AM: belongs to next day's briefing
 *   - If entry time < 8:00 AM: belongs to same day's briefing
 * 
 * Example: Entry "2026-01-15T13:30" → 13:30 >= 8:00 → briefing for Jan 16
 * Example: Entry "2026-01-15T05:00" → 05:00 < 8:00 → briefing for Jan 15
 */
export function getBriefingDate(entryDate: string | Date): string {
  // Convert Date to string if needed
  const dateStr = typeof entryDate === 'string' ? entryDate : entryDate.toISOString();
  
  const { year, month, day, hour } = parseDateString(dateStr);
  
  let briefingDay = day;
  let briefingMonth = month;
  let briefingYear = year;
  
  // If >= 8AM, belongs to next day's briefing
  if (hour >= 8) {
    briefingDay += 1;
    // Handle month overflow
    const daysInMonth = new Date(year, month, 0).getDate();
    if (briefingDay > daysInMonth) {
      briefingDay = 1;
      briefingMonth += 1;
      if (briefingMonth > 12) {
        briefingMonth = 1;
        briefingYear += 1;
      }
    }
  }
  
  return `${briefingYear}-${String(briefingMonth).padStart(2, '0')}-${String(briefingDay).padStart(2, '0')}`;
}

/**
 * Check if an entry date falls within the 8AM cutoff range for a given briefing date.
 * NO timezone conversion - uses literal string values.
 * 
 * Briefing for day X includes entries from:
 *   - Day X-1 at 08:00 (inclusive) to Day X at 08:00 (exclusive)
 * 
 * Example: isWithinCutoffRange("2026-01-15T13:30", "2026-01-16") 
 *   → checks if 13:30 on Jan 15 is between Jan 15 8AM and Jan 16 8AM
 *   → 13:30 >= 8:00 on Jan 15, so YES it's in Jan 16's briefing
 */
export function isWithinCutoffRange(entryDate: string | Date, briefingDateStr: string): boolean {
  // Simply check if the entry's calculated briefing date matches
  const entryBriefingDate = getBriefingDate(entryDate);
  return entryBriefingDate === briefingDateStr;
}

/**
 * Get the 8AM cutoff range for a given briefing date (for reference)
 * Returns the start and end times as strings
 */
export function getCutoffRange(briefingDateStr: string): { start: string; end: string } {
  const [year, month, day] = briefingDateStr.split('-').map(Number);
  
  // Start: previous day at 8:00 AM
  let startDay = day - 1;
  let startMonth = month;
  let startYear = year;
  
  if (startDay < 1) {
    startMonth -= 1;
    if (startMonth < 1) {
      startMonth = 12;
      startYear -= 1;
    }
    startDay = new Date(startYear, startMonth, 0).getDate();
  }
  
  const start = `${startYear}-${String(startMonth).padStart(2, '0')}-${String(startDay).padStart(2, '0')}T08:00`;
  const end = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T08:00`;
  
  return { start, end };
}

/**
 * Shared filtering and sorting state for entry lists
 * Used by both MorningMeetingList and DraftsPage to avoid code duplication
 * 
 * @param entries - Array of entries to filter and sort
 * @returns Object with filter state, handlers, and filtered/sorted entries
 */
export function useEntriesFilter(entries: any[], initialDateFilter?: string) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRegion, setFilterRegion] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  
  // Convert initialDateFilter to briefing date format if provided
  let briefingDateFilter = '';
  if (initialDateFilter) {
    // If it's already in YYYY-MM-DD format, use it as is
    // If it's a full datetime, extract the date part
    const dateStr = initialDateFilter.includes('T') 
      ? initialDateFilter.split('T')[0]
      : initialDateFilter;
    briefingDateFilter = dateStr;
  }
  
  const [filterDate, setFilterDate] = useState<string>(briefingDateFilter);
  const [sortField, setSortField] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  /**
   * Filter entries based on search term and filter criteria
   */
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const matchesSearch =
        searchTerm === '' ||
        entry.headline?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.country?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.entry?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRegion = filterRegion === 'all' || entry.region === filterRegion;
      const matchesCategory = filterCategory === 'all' || entry.category === filterCategory;
      const matchesPriority = filterPriority === 'all' || entry.priority === filterPriority;
      
      let matchesDate = true;
      if (filterDate) {
        matchesDate = isWithinCutoffRange(entry.date, filterDate);
      }

      return matchesSearch && matchesRegion && matchesCategory && matchesPriority && matchesDate;
    });
  }, [entries, searchTerm, filterRegion, filterCategory, filterPriority, filterDate]);

  /**
   * Sort filtered entries by specified field and direction
   */
  const sortedEntries = useMemo(() => {
    const sorted = [...filteredEntries];
    sorted.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === 'date') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredEntries, sortField, sortDirection]);

  /**
   * Handle sort field click - toggle direction if same field, else set new field
   */
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  /**
   * Reset all filters to their default values
   */
  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterRegion('all');
    setFilterCategory('all');
    setFilterPriority('all');
    setFilterDate('');
  };

  return {
    // State
    searchTerm,
    filterRegion,
    filterCategory,
    filterPriority,
    filterDate,
    sortField,
    sortDirection,
    // Setters
    setSearchTerm,
    setFilterRegion,
    setFilterCategory,
    setFilterPriority,
    setFilterDate,
    setSortField,
    setSortDirection,
    // Handlers
    handleSort,
    handleResetFilters,
    // Results
    filteredEntries,
    sortedEntries,
  };
}

/**
 * Common badge styling functions for entries
 */
export function getPriorityBadgeClass(priority: string): string {
  if (priority === 'sg-attention') return 'bg-red-100 text-red-800';
  return 'bg-blue-100 text-blue-800';
}

export function getRegionBadgeClass(region: string): string {
  const regionColors: Record<string, string> = {
    'Africa': 'bg-gray-100 text-gray-800',
    'Americas': 'bg-gray-100 text-gray-800',
    'Asia and the Pacific': 'bg-gray-100 text-gray-800',
    'Europe': 'bg-gray-100 text-gray-800',
    'Middle East': 'bg-gray-100 text-gray-800',
  };
  return regionColors[region] || 'bg-gray-100 text-gray-800';
}

export function formatCategoryForDisplay(category: string): string {
  const categoryMap: Record<string, string> = {
    'Meeting Note/Summary': 'Meeting Note',
  };
  return categoryMap[category] || category;
}
