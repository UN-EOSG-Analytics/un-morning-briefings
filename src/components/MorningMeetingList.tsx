'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getAllEntries, deleteEntry, getSubmittedEntries, toggleApproval } from '@/lib/storage';
import { REGIONS, CATEGORIES, PRIORITIES, MorningMeetingEntry } from '@/types/morning-meeting';
import { Search, FileText, Trash2, Eye, Download, FileDown, Edit, List, CheckCircle2, Circle } from 'lucide-react';
import Link from 'next/link';
import { ExportDailyBriefingDialog } from './ExportDailyBriefingDialog';
import { ViewEntryDialog } from './ViewEntryDialog';
import { usePopup } from '@/lib/popup-context';

export function MorningMeetingList() {
  const { confirm: showConfirm, success: showSuccess, info: showInfo } = usePopup();
  const [entries, setEntries] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRegion, setFilterRegion] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [sortField, setSortField] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<MorningMeetingEntry | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    const data = await getSubmittedEntries();
    setEntries(data);
  };

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm(
      'Delete Entry',
      'Are you sure you want to delete this entry? This action cannot be undone.'
    );
    
    if (confirmed) {
      try {
        await deleteEntry(id);
        showSuccess('Deleted', 'Entry deleted successfully');
        await loadEntries();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete entry';
        showInfo('Error', errorMessage);
      }
    }
  };

  const handleToggleApproval = async (entry: any) => {
    try {
      await toggleApproval(entry.id, !entry.approved);
      showSuccess(
        entry.approved ? 'Unapproved' : 'Approved',
        `Entry has been ${!entry.approved ? 'approved' : 'unapproved'}`
      );
      loadEntries();
    } catch (error) {
      showSuccess('Error', 'Failed to update approval status');
    }
  };

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

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getPriorityBadgeClass = (priority: string) => {
    if (priority === 'sg-attention') return 'bg-red-100 text-red-800';
    return 'bg-blue-100 text-blue-800';
  };

  const getRegionBadgeClass = (region: string) => {
    const regionColors: Record<string, string> = {
      'Africa': 'bg-yellow-100 text-yellow-800',
      'Americas': 'bg-blue-100 text-blue-800',
      'Asia and the Pacific': 'bg-green-100 text-green-800',
      'Europe': 'bg-purple-100 text-purple-800',
      'Middle East': 'bg-pink-100 text-pink-800',
    };
    return regionColors[region] || 'bg-gray-100 text-gray-800';
  };

  const exportToJSON = () => {
    const approvedEntries = sortedEntries.filter((entry) => entry.approved);
    if (approvedEntries.length === 0) {
      showInfo('No Approved Entries', 'There are no approved entries to export.');
      return;
    }
    const dataStr = JSON.stringify(approvedEntries, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `morning-meetings-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    
    <div className="space-y-4 mx-auto w-full max-w-6xl">
      {/* Header */}
      <Card className="border-slate-200">
        <div className="flex items-center justify-between p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded bg-slate-700">
             <List className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Morning Meeting Entries</h1>
              <p className="text-sm text-slate-600">View and manage submitted entries</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowExportDialog(true)}>
              <FileDown className="h-4 w-4" />
              Export Daily Briefing
            </Button>
            <Button variant="outline" size="sm" onClick={exportToJSON}>
              <Download className="h-4 w-4" />
              Export JSON
            </Button>
            
          </div>
        </div>
      </Card>

      {/* Filters */}
      <Card className="border-slate-200">
        <div className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search entries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 w-full rounded border border-slate-300 bg-white pl-9 pr-3 text-sm focus:border-un-blue focus:outline-none focus:ring-2 focus:ring-un-blue/20"
              />
            </div>

            {/* Region Filter */}
            <Select value={filterRegion} onValueChange={setFilterRegion}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="All Regions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                {REGIONS.map((region) => (
                  <SelectItem key={region} value={region}>
                    {region}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Category Filter */}
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Priority Filter */}
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                {PRIORITIES.map((priority) => (
                  <SelectItem key={priority.value} value={priority.value}>
                    {priority.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="ml-auto text-sm text-slate-600">
              {sortedEntries.length} {sortedEntries.length === 1 ? 'entry' : 'entries'}
            </div>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th
                  className="cursor-pointer px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-700 hover:bg-slate-100"
                  onClick={() => handleSort('date')}
                >
                  Date {sortField === 'date' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-700 hover:bg-slate-100"
                  onClick={() => handleSort('headline')}
                >
                  Headline {sortField === 'headline' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-700 hover:bg-slate-100"
                  onClick={() => handleSort('region')}
                >
                  Region {sortField === 'region' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">
                  Priority
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">
                  Approved
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    No entries found. <Link href="/form" className="text-un-blue hover:underline">Create your first entry</Link>
                  </td>
                </tr>
              ) : (
                sortedEntries.map((entry) => (
                  <tr key={entry.id} className="border-b border-slate-100 hover:bg-slate-50">
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
                    <td className="whitespace-nowrap px-4 py-3">
                      <button
                        onClick={() => handleToggleApproval(entry)}
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
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            setSelectedEntry(entry);
                            setShowViewDialog(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Link href={`/form?edit=${entry.id}`}>
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
                          onClick={() => handleDelete(entry.id)}
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

      {/* Export Dialog */}
      <ExportDailyBriefingDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
      />

      {/* View Entry Dialog */}
      <ViewEntryDialog
        open={showViewDialog}
        onOpenChange={setShowViewDialog}
        entry={selectedEntry}
      />
    </div>
  );
}
