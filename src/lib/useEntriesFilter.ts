import { useState, useMemo } from 'react';

/**
 * Shared filtering and sorting state for entry lists
 * Used by both MorningMeetingList and DraftsPage to avoid code duplication
 * 
 * @param entries - Array of entries to filter and sort
 * @returns Object with filter state, handlers, and filtered/sorted entries
 */
export function useEntriesFilter(entries: any[]) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRegion, setFilterRegion] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
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

      return matchesSearch && matchesRegion && matchesCategory && matchesPriority;
    });
  }, [entries, searchTerm, filterRegion, filterCategory, filterPriority]);

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
  };

  return {
    // State
    searchTerm,
    filterRegion,
    filterCategory,
    filterPriority,
    sortField,
    sortDirection,
    // Setters
    setSearchTerm,
    setFilterRegion,
    setFilterCategory,
    setFilterPriority,
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
    'Africa': 'bg-yellow-100 text-yellow-800',
    'Americas': 'bg-blue-100 text-blue-800',
    'Asia and the Pacific': 'bg-green-100 text-green-800',
    'Europe': 'bg-purple-100 text-purple-800',
    'Middle East': 'bg-pink-100 text-pink-800',
  };
  return regionColors[region] || 'bg-gray-100 text-gray-800';
}
