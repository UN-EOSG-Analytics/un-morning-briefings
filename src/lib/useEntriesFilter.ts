/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useMemo } from 'react';

/**
 * Get the 8AM cutoff range for a given date in Eastern Time
 * Returns UTC timestamps for entries from previous day 8AM ET to selected day 8AM ET
 * E.g., Jan 16 selected -> includes Jan 15 8AM ET to Jan 16 8AM ET
 */
export function getCutoffRange(dateStr: string): { start: Date; end: Date } {
  // Parse the date string (assumes YYYY-MM-DD format)
  const parts = dateStr.split('-');
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]) - 1; // Month is 0-indexed
  const day = parseInt(parts[2]);
  
  // Create the end date: selected day at 8AM ET
  const endDate = new Date(year, month, day, 8, 0, 0, 0);
  
  // Create the start date: previous day at 8AM ET
  const startDate = new Date(year, month, day - 1, 8, 0, 0, 0);
  
  // Get the offset between local time and ET
  // Create a test date and see the offset
  const testLocal = new Date(year, month, day, 12, 0, 0, 0);
  const testUTC = new Date(testLocal.toLocaleString('en-US', { timeZone: 'UTC' }));
  const testET = new Date(testLocal.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  
  // Calculate offset: difference between what UTC sees vs what ET sees
  const offsetMs = testUTC.getTime() - testET.getTime();
  
  return {
    start: new Date(startDate.getTime() + offsetMs),
    end: new Date(endDate.getTime() + offsetMs),
  };
}

/**
 * Get the briefing date for an entry based on 8AM cutoff
 * Returns the date string (YYYY-MM-DD) that this entry's briefing is for
 * E.g., an entry from Jan 14 at 10AM (after 8AM) belongs to briefing for Jan 15
 * But an entry from Jan 14 at 7AM (before 8AM) belongs to briefing for Jan 14
 */
export function getBriefingDate(entryDate: string | Date): string {
  const entry = new Date(entryDate);
  const year = entry.getFullYear();
  const month = String(entry.getMonth() + 1).padStart(2, '0');
  const day = String(entry.getDate()).padStart(2, '0');
  
  // Get ET time
  const etTime = new Date(entry.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const etHours = etTime.getHours();
  
  // If after 8AM ET, belongs to NEXT day's briefing
  // If before 8AM ET, belongs to CURRENT day's briefing
  if (etHours >= 8) {
    const nextDay = new Date(year, entry.getMonth(), entry.getDate() + 1);
    const nextYear = nextDay.getFullYear();
    const nextMonth = String(nextDay.getMonth() + 1).padStart(2, '0');
    const nextDayNum = String(nextDay.getDate()).padStart(2, '0');
    return `${nextYear}-${nextMonth}-${nextDayNum}`;
  }
  
  return `${year}-${month}-${day}`;
}

/**
 * Check if an entry date falls within the 8AM cutoff range for a given date
 */
export function isWithinCutoffRange(entryDate: string | Date, filterDate: string): boolean {
  const entryTime = new Date(entryDate).getTime();
  const { start, end } = getCutoffRange(filterDate);
  return entryTime >= start.getTime() && entryTime < end.getTime();
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
  const [filterDate, setFilterDate] = useState<string>(initialDateFilter || '');
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
