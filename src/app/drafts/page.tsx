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
import { getDraftEntries, deleteEntry } from '@/lib/storage';
import { REGIONS, CATEGORIES, PRIORITIES, MorningMeetingEntry } from '@/types/morning-meeting';
import { Search, FileText, Trash2, Eye, Edit, FilePlus } from 'lucide-react';
import Link from 'next/link';
import { ViewEntryDialog } from '@/components/ViewEntryDialog';
import { usePopup } from '@/lib/popup-context';

// TODO: Replace with actual user authentication
const CURRENT_USER = 'Current User';

export default function DraftsPage() {
  const { confirm: showConfirm, success: showSuccess } = usePopup();
  const [entries, setEntries] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRegion, setFilterRegion] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [sortField, setSortField] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedEntry, setSelectedEntry] = useState<MorningMeetingEntry | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    const data = await getDraftEntries(CURRENT_USER);
    setEntries(data);
  };

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm(
      'Delete Draft',
      'Are you sure you want to delete this draft? This action cannot be undone.'
    );
    
    if (confirmed) {
      await deleteEntry(id);
      showSuccess('Deleted', 'Draft deleted successfully');
      loadEntries();
    }
  };

  const handleView = (entry: MorningMeetingEntry) => {
    setSelectedEntry(entry);
    setShowViewDialog(true);
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
      } else if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return sorted;
  }, [filteredEntries, sortField, sortDirection]);

  const getPriorityLabel = (value: string) => {
    return PRIORITIES.find((p) => p.value === value)?.label || value;
  };

  const getPriorityBadgeColor = (priority: string) => {
    return priority === 'sg-attention'
      ? 'bg-red-100 text-red-800 border-red-300'
      : 'bg-blue-100 text-blue-800 border-blue-300';
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4">
      <div className="mx-auto w-full max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">My Drafts</h1>
              <p className="mt-1 text-slate-600">
                View and manage your draft entries
              </p>
            </div>
            <Link href="/form">
              <Button className="bg-un-blue hover:bg-un-blue/95">
                <FilePlus className="mr-2 h-4 w-4" />
                New Draft
              </Button>
            </Link>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6 p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
            {/* Search */}
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search drafts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-10 w-full rounded border border-slate-300 bg-white pl-10 pr-3 text-sm focus:border-un-blue focus:outline-none focus:ring-2 focus:ring-un-blue/20"
                />
              </div>
            </div>

            {/* Region Filter */}
            <Select value={filterRegion} onValueChange={setFilterRegion}>
              <SelectTrigger className="h-10">
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
              <SelectTrigger className="h-10">
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
              <SelectTrigger className="h-10">
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
          </div>
        </Card>

        {/* Results Count */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-slate-600">
            Showing {sortedEntries.length} of {entries.length} draft(s)
          </p>
        </div>

        {/* Drafts List */}
        {sortedEntries.length === 0 ? (
          <Card className="p-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-4 text-lg font-semibold text-slate-900">No drafts found</h3>
            <p className="mt-2 text-sm text-slate-600">
              {entries.length === 0
                ? "You haven't created any drafts yet."
                : 'Try adjusting your filters.'}
            </p>
            <Link href="/form">
              <Button className="mt-4 bg-un-blue hover:bg-un-blue/95">
                Create Your First Draft
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-4">
            {sortedEntries.map((entry) => (
              <Card key={entry.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`rounded border px-2 py-0.5 text-xs font-semibold ${getPriorityBadgeColor(
                          entry.priority
                        )}`}
                      >
                        {getPriorityLabel(entry.priority)}
                      </span>
                      <span className="text-xs text-slate-500">
                        {new Date(entry.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-1">
                      {entry.headline}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-slate-600">
                      <span>{entry.region}</span>
                      <span>•</span>
                      <span>{entry.country}</span>
                      <span>•</span>
                      <span>{entry.category}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleView(entry)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Link href={`/form?edit=${entry.id}`}>
                      <Button size="sm" variant="outline">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(entry.id!)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* View Dialog */}
      <ViewEntryDialog
        open={showViewDialog}
        onOpenChange={setShowViewDialog}
        entry={selectedEntry}
      />
    </main>
  );
}
