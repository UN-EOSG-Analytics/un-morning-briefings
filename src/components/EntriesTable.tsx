'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MorningMeetingEntry, PRIORITIES, REGIONS, CATEGORIES } from '@/types/morning-meeting';
import { Trash2, Edit, CheckCircle2, Circle } from 'lucide-react';
import Link from 'next/link';
import { ViewEntryDialog } from './ViewEntryDialog';
import { SearchBar } from './SearchBar';
import { ColumnFilter } from './ColumnFilter';
import { useEntriesFilter, getPriorityBadgeClass, getRegionBadgeClass } from '@/lib/useEntriesFilter';

interface EntriesTableProps {
  entries: any[];
  onDelete: (id: string) => void;
  onToggleApproval?: (entry: any) => void;
  showApprovedColumn?: boolean;
  emptyMessage?: string;
  resultLabel?: string;
  initialDateFilter?: string;
}

export function EntriesTable({
  entries,
  onDelete,
  onToggleApproval,
  showApprovedColumn = false,
  emptyMessage = 'No entries found.',
  resultLabel = 'entries',
  initialDateFilter,
}: EntriesTableProps) {
  const [selectedEntry, setSelectedEntry] = useState<MorningMeetingEntry | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);

  const {
    searchTerm,
    filterRegion,
    filterCategory,
    filterPriority,
    filterDate,
    sortField,
    sortDirection,
    setSearchTerm,
    setFilterRegion,
    setFilterCategory,
    setFilterPriority,
    setFilterDate,
    handleSort,
    handleResetFilters,
    sortedEntries,
  } = useEntriesFilter(entries, initialDateFilter);

  const handleRowClick = (entry: any) => {
    setSelectedEntry(entry);
    setShowViewDialog(true);
  };

  const handleActionClick = (e: React.MouseEvent, callback: () => void) => {
    e.stopPropagation();
    callback();
  };

  // Extract unique dates from entries
  const uniqueDates = Array.from(
    new Set(entries.map((entry) => new Date(entry.date).toISOString().split('T')[0]))
  ).sort().reverse();

  return (
    <>
      {/* Search Bar */}
      <SearchBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />

      {/* Table */}
      <Card className="border-slate-200 p-0 mt-4 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th
                  className="rounded-tl-xl cursor-pointer px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-700 hover:bg-slate-100"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center gap-2">
                    Date {sortField === 'date' && (sortDirection === 'asc' ? '↑' : '↓')}
                    <ColumnFilter
                      columnName="Date"
                      options={uniqueDates.map((date) =>
                        new Date(date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      )}
                      selectedValue={
                        filterDate
                          ? new Date(filterDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : 'all'
                      }
                      onValueChange={(label) => {
                        if (label === 'all') {
                          setFilterDate('');
                        } else {
                          // Parse the date label back to YYYY-MM-DD format
                          const dateObj = new Date(label);
                          const isoDate = dateObj.toISOString().split('T')[0];
                          setFilterDate(isoDate);
                        }
                      }}
                    />
                  </div>
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-700 hover:bg-slate-100"
                  onClick={() => handleSort('headline')}
                >
                  <div className="flex items-center gap-2">
                    Headline {sortField === 'headline' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </div>
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-700 hover:bg-slate-100"
                  onClick={() => handleSort('region')}
                >
                  <div className="flex items-center gap-2">
                    Region {sortField === 'region' && (sortDirection === 'asc' ? '↑' : '↓')}
                    <ColumnFilter
                      columnName="Region"
                      options={REGIONS}
                      selectedValue={filterRegion}
                      onValueChange={setFilterRegion}
                    />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">
                  <div className="flex items-center gap-2">
                    Priority
                    <ColumnFilter
                      columnName="Priority"
                      options={PRIORITIES.map((p) => p.label)}
                      selectedValue={filterPriority === 'all' ? 'all' : PRIORITIES.find((p) => p.value === filterPriority)?.label || 'all'}
                      onValueChange={(label) => {
                        const value = PRIORITIES.find((p) => p.label === label)?.value || 'all';
                        setFilterPriority(value);
                      }}
                    />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">
                  <div className="flex items-center gap-2">
                    Category
                    <ColumnFilter
                      columnName="Category"
                      options={CATEGORIES}
                      selectedValue={filterCategory}
                      onValueChange={setFilterCategory}
                    />
                  </div>
                </th>
                {showApprovedColumn && (
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">
                    Approved
                  </th>
                )}
                <th className="rounded-tr-xl px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedEntries.length === 0 ? (
                <tr>
                  <td colSpan={showApprovedColumn ? 7 : 6} className="px-4 py-12 text-center text-slate-500">
                    {emptyMessage} <Link href="/form" className="text-un-blue hover:underline">Create your first entry</Link>
                  </td>
                </tr>
              ) : (
                sortedEntries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                    onClick={() => handleRowClick(entry)}
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                      {new Date(entry.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="max-w-md px-4 py-3 text-sm">
                      <div className="line-clamp-2">{entry.headline}</div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className={`inline-block rounded px-2 py-1 text-xs font-medium ${getRegionBadgeClass(entry.region)}`}>
                        {entry.region}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${getPriorityBadgeClass(entry.priority)}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${entry.priority === 'sg-attention' ? 'bg-red-600' : 'bg-blue-600'}`} />
                        {PRIORITIES.find(p => p.value === entry.priority)?.label}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                      {entry.category}
                    </td>
                    {showApprovedColumn && onToggleApproval && (
                      <td className="whitespace-nowrap px-4 py-3">
                        <button
                          onClick={(e) => handleActionClick(e, () => onToggleApproval(entry))}
                          className="flex items-center gap-2 text-sm font-medium transition-colors hover:text-un-blue"
                        >
                          {entry.approved ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : (
                            <Circle className="h-5 w-5 text-slate-400" />
                          )}
                          <span className="text-xs text-slate-600">
                            {entry.approved ? 'Yes' : 'No'}
                          </span>
                        </button>
                      </td>
                    )}
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Link href={`/form?edit=${entry.id}`} onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-slate-600 hover:bg-slate-100"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={(e) => handleActionClick(e, () => onDelete(entry.id))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Result Count */}
      <div className="text-sm text-slate-600 mt-2">
        {sortedEntries.length} {sortedEntries.length === 1 ? (resultLabel.endsWith('ies') ? resultLabel.slice(0, -3) + 'y' : resultLabel.slice(0, -1)) : resultLabel}
      </div>

      {/* View Entry Dialog */}
      <ViewEntryDialog
        open={showViewDialog}
        onOpenChange={setShowViewDialog}
        entry={selectedEntry}
        onDelete={onDelete}
        onApprove={onToggleApproval}
        showApproveButton={showApprovedColumn}
      />
    </>
  );
}
