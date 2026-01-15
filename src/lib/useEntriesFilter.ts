/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useMemo } from 'react';

/**
 * Get the current briefing date based on the current time in ET
 * 
 * Logic: If current time is >= 8AM ET, we're working on tomorrow's briefing
 *        If current time is < 8AM ET, we're working on today's briefing
 * 
 * Example: Jan 15 at 12:36 PM ET → working on Jan 16 briefing (since 12:36 >= 8AM)
 * Example: Jan 15 at 7:00 AM ET → working on Jan 15 briefing (since 7:00 < 8AM)
 */
export function getCurrentBriefingDate(): string {
  const now = new Date();
  
  // Get current time in ET timezone
  const etFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  });
  
  const parts = etFormatter.formatToParts(now);
  const etYear = parseInt(parts.find(p => p.type === 'year')?.value || '0');
  const etMonth = parseInt(parts.find(p => p.type === 'month')?.value || '0');
  const etDay = parseInt(parts.find(p => p.type === 'day')?.value || '0');
  const etHour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
  
  const etDate = new Date(etYear, etMonth - 1, etDay);
  
  // If >= 8AM ET, working on tomorrow's briefing
  // If < 8AM ET, working on today's briefing
  if (etHour >= 8) {
    etDate.setDate(etDate.getDate() + 1);
  }
  
  const year = etDate.getFullYear();
  const month = String(etDate.getMonth() + 1).padStart(2, '0');
  const day = String(etDate.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Get the 8AM cutoff range for a given briefing date in Eastern Time
 * 
 * Logic: Briefing for day X includes entries from day X-1 at 8AM ET to day X at 8AM ET
 * 
 * Example: getCutoffRange("2026-01-16") returns:
 *   start: Jan 15, 2026 at 8:00 AM ET (in UTC)
 *   end:   Jan 16, 2026 at 8:00 AM ET (in UTC)
 */
export function getCutoffRange(briefingDateStr: string): { start: Date; end: Date } {
  // Parse the briefing date (YYYY-MM-DD format)
  const [year, month, day] = briefingDateStr.split('-').map(Number);
  
  // Create dates for the briefing day at 8AM and previous day at 8AM in ET
  // We'll use Intl API to properly handle ET timezone
  
  // End time: briefing day at 8:00 AM ET
  const endDateET = new Date(year, month - 1, day, 8, 0, 0, 0);
  
  // Start time: previous day at 8:00 AM ET
  const startDateET = new Date(year, month - 1, day - 1, 8, 0, 0, 0);
  
  // Convert local dates to ET timezone properly
  // Get ET offset at this specific date
  const etOffsetMs = getETOffset(year, month, day);
  
  return {
    start: new Date(startDateET.getTime() + etOffsetMs),
    end: new Date(endDateET.getTime() + etOffsetMs),
  };
}

/**
 * Helper function to get ET offset from local time at a specific date
 */
function getETOffset(year: number, month: number, day: number): number {
  const testLocal = new Date(year, month - 1, day, 12, 0, 0, 0);
  const testUTC = new Date(testLocal.toLocaleString('en-US', { timeZone: 'UTC' }));
  const testET = new Date(testLocal.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  return testUTC.getTime() - testET.getTime();
}

/**
 * Get the briefing date for an entry based on 8AM cutoff
 * 
 * Logic:
 *   - If entry time >= 8:00 AM: belongs to next day's briefing
 *   - If entry time < 8:00 AM: belongs to current day's briefing
 */
export function getBriefingDate(entryDate: string | Date): string {
  const date = new Date(entryDate);
  const hour = date.getHours();
  
  // Create date for calculation
  const briefingDate = new Date(date);
  
  // If 8 AM or later, it belongs to next day's briefing
  if (hour >= 8) {
    briefingDate.setDate(briefingDate.getDate() + 1);
  }
  
  const year = briefingDate.getFullYear();
  const month = String(briefingDate.getMonth() + 1).padStart(2, '0');
  const day = String(briefingDate.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Check if an entry date falls within the 8AM cutoff range for a given briefing date
 * 
 * Example: isWithinCutoffRange(entryDate, "2026-01-16") checks if entry is between
 *          Jan 15 8AM ET and Jan 16 8AM ET
 */
export function isWithinCutoffRange(entryDate: string | Date, briefingDate: string): boolean {
  const entryTime = new Date(entryDate).getTime();
  const { start, end } = getCutoffRange(briefingDate);
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
