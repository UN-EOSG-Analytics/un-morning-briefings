'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MorningMeetingEntry, PRIORITIES, REGIONS, CATEGORIES } from '@/types/morning-meeting';
import { formatDateResponsive, formatDateDesktop } from '@/lib/format-date';
import { Trash2, Edit, Clock, Check, X } from 'lucide-react';
import Link from 'next/link';
import { ViewEntryDialog } from './ViewEntryDialog';
import { SearchBar } from './SearchBar';
import { ColumnFilter } from './ColumnFilter';
import { useEntriesFilter, getPriorityBadgeClass, getRegionBadgeClass } from '@/lib/useEntriesFilter';

interface EntriesTableProps {
  entries: MorningMeetingEntry[];
  onDelete: (id: string) => void;
  onToggleApproval?: (entry: MorningMeetingEntry) => void;
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
    sortedEntries,
  } = useEntriesFilter(entries, initialDateFilter);

  const handleRowClick = (entry: MorningMeetingEntry) => {
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
                  className="rounded-tl-xl cursor-pointer px-2 sm:px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-700 hover:bg-slate-100"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center gap-1 sm:gap-2">
                    <span className="hidden sm:inline">Date {sortField === 'date' && (sortDirection === 'asc' ? '↑' : '↓')}</span>
                    <span className="sm:hidden">Date</span>
                    <div className="hidden sm:block">
                      <ColumnFilter
                        columnName="Date"
                        options={uniqueDates.map((date) =>
                          formatDateDesktop(date)
                        )}
                        selectedValue={
                          filterDate
                            ? formatDateDesktop(filterDate)
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
                  className="hidden sm:table-cell cursor-pointer px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-700 hover:bg-slate-100"
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
                <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">
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
                <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">
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
                  <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">
                    Status
                  </th>
                )}
                <th className="hidden sm:table-cell rounded-tr-xl px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-700">
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
                    <td className="whitespace-nowrap px-2 sm:px-4 py-3 text-sm text-slate-600">
                      <span className="hidden sm:inline">
                        {formatDateDesktop(entry.date)}
                      </span>
                      <span className="sm:hidden">
                        {formatDateResponsive(entry.date).mobile}
                      </span>
                    </td>
                    <td className="max-w-md px-4 py-3 text-sm">
                      <div className="line-clamp-3 sm:line-clamp-2">{entry.headline}</div>
                    </td>
                    <td className="hidden sm:table-cell whitespace-nowrap px-4 py-3">
                      <span className={`inline-block rounded px-2 py-1 text-xs font-medium ${getRegionBadgeClass(entry.region)}`}>
                        {entry.region}
                      </span>
                    </td>
                    <td className="hidden sm:table-cell whitespace-nowrap px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${getPriorityBadgeClass(entry.priority)}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${entry.priority === 'sg-attention' ? 'bg-red-600' : 'bg-blue-600'}`} />
                        {PRIORITIES.find(p => p.value === entry.priority)?.label}
                      </span>
                    </td>
                    <td className="hidden sm:table-cell whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                      {entry.category}
                    </td>
                    {showApprovedColumn && (
                      <td className="hidden sm:table-cell whitespace-nowrap px-4 py-3">
                        {(() => {
                          const status = entry.approvalStatus || 'pending';
                          const badgeConfig = {
                            pending: {
                              bg: 'bg-amber-50',
                              text: 'text-amber-700',
                              icon: Clock,
                              label: 'Pending'
                            },
                            approved: {
                              bg: 'bg-green-50',
                              text: 'text-green-700',
                              icon: Check,
                              label: 'Approved'
                            },
                            denied: {
                              bg: 'bg-red-50',
                              text: 'text-red-700',
                              icon: X,
                              label: 'Denied'
                            }
                          };
                          const config = badgeConfig[status as keyof typeof badgeConfig] || badgeConfig.pending;
                          const Icon = config.icon;
                          return (
                            <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${config.bg} ${config.text}`}>
                              <Icon className="h-3.5 w-3.5" />
                              {config.label}
                            </div>
                          );
                        })()}
                      </td>
                    )}
                    <td className="hidden sm:table-cell whitespace-nowrap px-4 py-3 text-right">
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
        allEntries={sortedEntries}
      />
    </>
  );
}
